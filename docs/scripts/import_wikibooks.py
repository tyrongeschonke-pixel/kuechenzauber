#!/usr/bin/env python3
"""Conservative reproducible Wikibooks recipe importer (stdlib + curl).

Usage: python3 work/import_wikibooks.py [--offline] [--target 160]
Only source recipes with unambiguous Zutaten / Zubereitung sections are shipped.
Raw revision API results and audit data remain in work/wikibooks.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import random
import re
import subprocess
import time
from urllib.parse import urlencode, quote

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.import-cache'
OUT = ROOT
API = 'https://de.wikibooks.org/w/api.php'
USER_AGENT = 'Mozilla/5.0 Küchenzauber/1.0 (personal offline recipe app)'
NOW = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

class Node:
    def __init__(self, tag='', attrs=None, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs or []), parent, []
    def descendants(self):
        for child in self.children:
            if isinstance(child, Node):
                yield child
                yield from child.descendants()
    def text(self):
        if excluded(self):
            return ''
        return ''.join(c.text() if isinstance(c, Node) else c for c in self.children)

def excluded(n):
    classes = set(n.attrs.get('class', '').split())
    return n.tag in ('script', 'style', 'figure', 'img') or bool(classes & {'noprint', 'mw-editsection', 'toc', 'mw-empty-elt', 'reference', 'gallery', 'gallerybox'}) or n.attrs.get('id') == 'toc'

class Tree(HTMLParser):
    VOID = {'br','hr','img','input','meta','link','wbr','source','area','base','embed','param','track','col'}
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node('root')
        self.stack = [self.root]
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.stack[-1]); self.stack[-1].children.append(n)
        if tag == 'br': n.children.append(' ')
        if tag not in self.VOID: self.stack.append(n)
    def handle_startendtag(self, tag, attrs): self.handle_starttag(tag, attrs); self.handle_endtag(tag)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]; break
    def handle_data(self, data): self.stack[-1].children.append(data)

def clean(s): return re.sub(r'\s+', ' ', s).strip()

def label(n):
    if re.fullmatch('h[1-6]', n.tag): return int(n.tag[1]), clean(n.text())
    if 'mw-heading' in n.attrs.get('class', '').split():
        for x in n.descendants():
            if re.fullmatch('h[1-6]', x.tag): return int(x.tag[1]), clean(x.text())
    return None

def sections(root):
    children = [c for c in root.children if isinstance(c, Node) and not excluded(c)]
    result = {}
    for i, n in enumerate(children):
        h = label(n)
        if not h: continue
        key = h[1].lower().rstrip(':')
        if key not in ('zutaten', 'zubereitung'): continue
        end = i+1
        while end < len(children):
            next_heading = label(children[end])
            if next_heading and next_heading[0] <= h[0]: break
            end += 1
        if key in result: raise ValueError('duplicate ingredient or preparation section')
        result[key] = children[i+1:end]
    return result

def ingredient_paragraph_is_note(text):
    """Conservative prose classification; source advice is displayed, never scored."""
    return bool(re.search(r'[.!?](?:\s|$)', text) or len(text.split()) > 12 or
                re.search(r'\b(?:sollte(?:n)?|sollen|verwendet|verwenden|würzen|abschmecken|schlagen|rühren|beigeben|umrühren|braucht|benötigt)\b|\bgibt es\b', text, re.I))

def blocks(nodes, ingredient=False, notes=None):
    result, prefix = [], ''
    def walk(n):
        nonlocal prefix
        if excluded(n): return
        if n.tag == 'li':
            text = clean(n.text())
            if text.lower() in ('guten appetit!', 'guten appetit'): return
            if ingredient and re.fullmatch(r'Con\s+\.{3}', text, re.I):
                if notes is not None: notes.append(text)
                return
            if ingredient and text.endswith(':') and len(text) < 100:
                prefix = text[:-1]; return
            if text: result.append((prefix + ': ' if prefix else '') + text)
            return
        if n.tag == 'p':
            text = clean(n.text())
            if text.lower() in ('guten appetit!', 'guten appetit'): return
            if re.match(r'^(?:erfasst von|autor(?:in)?\s*:|quelle\s*:)', text, re.I): return
            if ingredient and text.endswith(':') and len(text) < 100:
                prefix = text[:-1]; return
            if ingredient and re.match(r'^\(?f[uü]r\b', text, re.I): return
            bold = next((c for c in n.children if isinstance(c,Node) and c.tag in ('b','strong')), None)
            if bold and clean(bold.text()) == text and len(text) < 80 and not re.search(r'[.!?]', text) and (not ingredient or text.lower().startswith('zutaten ')):
                prefix = text.rstrip(':'); return
            if ingredient and ingredient_paragraph_is_note(text):
                if notes is not None: notes.append(text)
                return
            if ingredient:
                # Preserve genuine bare ingredient paragraphs, with their original line boundaries.
                for line in n.text().splitlines():
                    line = clean(line)
                    if line: result.append((prefix + ': ' if prefix else '') + line)
                return
            if text: result.append((prefix + ': ' if prefix else '') + text)
            return
        if n.tag == 'table':
            if not ingredient: raise ValueError('preparation table unsupported')
            rows = [r for r in n.descendants() if r.tag == 'tr']
            for row in rows:
                cells = [c for c in row.children if isinstance(c, Node) and c.tag in ('td', 'th')]
                if not cells: continue
                if all(c.tag == 'th' for c in cells): continue
                if len(cells) > 3: raise ValueError('ambiguous multi-column ingredient table')
                text = clean(' '.join(clean(c.text()) for c in cells))
                if text: result.append((prefix + ': ' if prefix else '') + text)
            return
        if ingredient and n.tag == 'dt':
            prefix = clean(n.text()).rstrip(':'); return
        for c in n.children:
            if isinstance(c, Node): walk(c)
    for index, node in enumerate(nodes):
        heading = label(node)
        if heading:
            prefix = heading[1]
            continue
        text = clean(node.text())
        if ingredient and node.tag == 'p' and re.match(r'^für\s+(?:den|die|das)\b', text, re.I) and len(text) < 80 and not re.search(r'[.!?]',text):
            prefix = text.rstrip(':'); continue
        if not ingredient and node.tag == 'p' and index+1 < len(nodes) and nodes[index+1].tag in ('ul','ol') and 0 < len(text) < 40 and len(text.split()) <= 3 and not re.search(r'[\d.!?]',text):
            prefix = text.rstrip(':'); continue
        walk(node)
    return result

def parse_recipe(data):
    p = data['parse']
    tree = Tree(p['text']['*'])
    root = next((n for n in tree.root.descendants() if 'mw-parser-output' in n.attrs.get('class','').split()), None)
    if root is None: raise ValueError('missing parser root')
    sec = sections(root)
    if set(sec) != {'zutaten', 'zubereitung'}: raise ValueError('missing standard ingredients/preparation headings')
    ingredient_notes = []
    ingredients, steps = blocks(sec['zutaten'], True, ingredient_notes), blocks(sec['zubereitung'])
    if not (2 <= len(ingredients) <= 65): raise ValueError('ingredient count outside 2..65')
    if not steps or sum(map(len, steps)) < 100: raise ValueError('preparation absent or too short')
    if any(len(s) < 2 for s in ingredients) or any(len(s) < 3 for s in steps): raise ValueError('empty/fragment item')
    if any(re.search(r'\b(Startseite|Bearbeiten|Inhaltsverzeichnis|Rezept fehlt|wird ergänzt)\b', s, re.I) for s in ingredients + steps): raise ValueError('navigation or incomplete source')
    if len(set(ingredients)) != len(ingredients): raise ValueError('duplicate ingredient items')
    # Paragraph-only ingredients are ambiguous; retain them only alongside a list/table.
    if not any(n.tag in ('li','td') for node in sec['zutaten'] for n in [node, *node.descendants()]): raise ValueError('ingredients not a list or table')
    servings, minutes = None, None
    for node in sec['zutaten']:
        text = clean(node.text())
        if node.tag == 'p' and re.match(r'^\(?f[uü]r\b', text, re.I) and not re.search(r'(?i)^\(?für\s+(?:den|die|das)\b', text) and re.search(r'\d|\b(?:eine?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\b',text,re.I): servings = text.strip('()')
    for row in root.descendants():
        if row.tag != 'tr': continue
        cells = [c for c in row.children if isinstance(c, Node) and c.tag in ('td','th')]
        if len(cells) != 2: continue
        key, val = clean(cells[0].text()).lower(), clean(cells[1].text())
        if key in ('portionen:', 'portionen') and val: servings = val
        if key in ('zubereitungszeit:', 'zubereitungszeit'):
            m = re.fullmatch(r'(\d+)\s*(?:min(?:uten)?\.?|min\.)?', val, re.I)
            if m and 0 < int(m[1]) < 1440: minutes = int(m[1])
    title = re.sub(r'^Kochbuch/\s*', '', p['title']).strip()
    cats = [c.get('*','').replace('_',' ').split('/ ')[-1] for c in p.get('categories', [])]
    tags = [t for t in cats if t not in ('Alle Rezepte','') and not re.search(r'Vorlage|Wartung|Wikibooks|ohne|RezeptBox|Seiten mit', t, re.I)]
    page = quote(p['title'].replace(' ', '_'), safe='/')
    return {'id':'wb-'+str(p['pageid']), 'title':title, 'pageTitle':p['title'],
            'sourceUrl':'https://de.wikibooks.org/wiki/'+page,
            'revisionId':p['revid'], 'revisionUrl':'https://de.wikibooks.org/w/index.php?oldid='+str(p['revid']),
            'historyUrl':'https://de.wikibooks.org/w/index.php?'+urlencode({'title':p['title'],'action':'history'}),
            'license':{'name':'CC BY-SA 4.0','url':'https://creativecommons.org/licenses/by-sa/4.0/'},
            'ingredients':[{'text':s} for s in ingredients], 'steps':steps,
            'ingredientNotes':ingredient_notes,
            'servings':servings, 'minutes':minutes, 'tags':tags[:8], 'updatedAt':NOW}

def api(params, path, offline=False):
    if path.exists(): return json.loads(path.read_text())
    if offline: raise ValueError('not cached')
    url = API+'?'+urlencode(dict(params, format='json', origin='*'), safe='*')
    for attempt in range(3):
        proc = subprocess.run(['curl','--fail','-sSL','--max-time','30','-A',USER_AGENT,url], capture_output=True, text=True)
        try:
            if proc.returncode: raise ValueError(proc.stderr)
            data = json.loads(proc.stdout)
            if 'error' in data: raise ValueError(str(data['error']))
            path.write_text(json.dumps(data,ensure_ascii=False)); return data
        except (ValueError, json.JSONDecodeError):
            if attempt == 2: raise
            time.sleep(5 * (attempt+1))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--offline', action='store_true'); ap.add_argument('--target',type=int,default=160); args=ap.parse_args()
    CACHE.mkdir(parents=True,exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
    members, cont, idx = [], {}, 1
    while True:
        data = api(dict(action='query',list='categorymembers',cmtitle='Kategorie:Kochbuch/ Alle Rezepte',cmlimit=500,**cont), CACHE/f'category-{idx}.json', args.offline)
        members += data['query']['categorymembers']
        if 'continue' not in data: break
        cont=data['continue']; idx+=1
    candidates = [m for m in members if m['title'].startswith('Kochbuch/') and m.get('ns') == 0]
    random.Random(42).shuffle(candidates)
    priority = ['Bratkartoffeln','Eierpfannkuchen','Spagetti Bolognese','Apfelkuchen','Klare Gemüsesuppe','Rührei']
    candidates.sort(key=lambda m: (not any(m['title'].endswith('/ '+t) for t in priority)))
    recipes, rejects, audit = [], [], []
    def fetch(member):
        try:
            cache = CACHE/f"page-{member['pageid']}.json"
            if not cache.exists() and not args.offline: time.sleep(0.8)
            data=api(dict(action='parse',page=member['title'],prop='text|revid|categories'), cache,args.offline)
            recipe=parse_recipe(data)
            return recipe, None
        except Exception as ex: return None, {'title':member['title'],'pageid':member['pageid'],'reason':str(ex)}
    with ThreadPoolExecutor(max_workers=1) as pool:
        for start in range(0,len(candidates),12):
            for recipe, rejection in pool.map(fetch,candidates[start:start+12]):
                if recipe:
                    recipes.append(recipe)
                    audit.append({'id':recipe['id'],'title':recipe['title'],'revisionId':recipe['revisionId'],'ingredients':len(recipe['ingredients']),'steps':len(recipe['steps'])})
                else: rejects.append(rejection)
            print(f"accepted={len(recipes)} rejected={len(rejects)}",flush=True)
            if len(recipes) >= args.target: break
    recipes.sort(key=lambda r:r['title'].casefold())
    assert len(recipes) >= 100, f'Only {len(recipes)} usable recipes; do not ship.'
    assert len({r['id'] for r in recipes}) == len(recipes)
    for r in recipes:
        assert r['revisionId'] > 0 and r['ingredients'] and r['steps']
        assert all(i['text'].strip() for i in r['ingredients'])
    (OUT/'recipes.json').write_text(json.dumps({'version':1,'generatedAt':NOW,'source':'Wikibooks','recipes':recipes},ensure_ascii=False,indent=2)+'\n')
    (CACHE/'audit.json').write_text(json.dumps({'generatedAt':NOW,'catalogCount':len(members),'acceptedCount':len(recipes),'accepted':audit,'rejected':rejects,
        'validation':{'uniqueIds':True,'allHaveSourceRevision':True,'allHaveIngredientsAndPreparation':True,'shippingMinimum':100,
            'ingredientCount':sum(len(r['ingredients']) for r in recipes),'ingredientNoteCount':sum(len(r['ingredientNotes']) for r in recipes),
            'ingredientProseSeparatedFromRequirements':True},
        'sourceChecks':{'licenseFooter':'license-page.html','license':'CC BY-SA 4.0','representativeHtmlCompared':['Bratkartoffeln','Pizza pollo e funghi','Lachs-Spinat-Auflauf','Hühnersuppe festlich']},
        'limitations':['Structural and source-text checks only; recipes were not cooked.','Tips and variants outside ingredients/preparation sections remain in linked originals.','Unsupported, incomplete or unavailable source pages are omitted.']},ensure_ascii=False,indent=2)+'\n')
    for r in recipes[:3] + [next(r for r in recipes if r['title']=='Bratkartoffeln')]:
        d=json.loads((CACHE/f"page-{r['id'][3:]}.json").read_text())
        (CACHE/f"fixture-{r['id']}.html").write_text(d['parse']['text']['*'])
    sources='\n'.join(f"| {r['title'].replace('|','/')} | [{r['revisionId']}]({r['revisionUrl']}) | [Autorinnen und Autoren]({r['historyUrl']}) |" for r in recipes)
    (OUT/'REZEPTQUELLEN.md').write_text(f'''# Rezeptquellen und Lizenz

Die {len(recipes)} Rezepte stammen aus dem [deutschen Wikibooks-Kochbuch](https://de.wikibooks.org/wiki/Kategorie:Kochbuch/_Alle_Rezepte). Import: {NOW}.

## Lizenz und Bearbeitung

Alle übernommenen Rezepttexte stehen unter [Creative Commons Namensnennung – Weitergabe unter gleichen Bedingungen 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.de) (CC BY-SA 4.0). Die Namensnennung erfolgt je Rezept über den Wikibooks-Seitenlink und den Link zur Versionsgeschichte mit den Autorinnen und Autoren. Der Versionslink zeigt die verwendete Quelle.

Änderungen: HTML-Navigation, Bearbeitungslinks und Bilder wurden entfernt; Zutaten und Zubereitung wurden in Textfelder umgewandelt; Unterüberschriften stehen vor dem zugehörigen Text. Mengen und Anweisungen sind aus der Quelle übernommen, nicht durch KI ergänzt. Erklärende Absätze im Zutatenabschnitt bleiben als getrennte Zutatenhinweise erhalten und werden nicht als Lebensmittelanforderung gezählt. Bloße Varianten-Platzhalter bleiben ebenfalls als Hinweise erhalten. Einfache Zutatenabsätze werden entlang ihrer ursprünglichen Zeilenumbrüche aufgeteilt. Kategorien werden als Tags verwendet. Keine Bilder wurden übernommen. Diese bearbeitete Rezeptdatensammlung wird ebenfalls unter CC BY-SA 4.0 bereitgestellt. Die Lizenz der App-Software ist davon getrennt.

Der Quellenfooter wurde bei [Bratkartoffeln](https://de.wikibooks.org/wiki/Kochbuch/_Bratkartoffeln) geprüft und verlinkt CC BY-SA 4.0. Zusätzliche Bedingungen können gelten; siehe die [Wikimedia-Nutzungsbedingungen](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/de).

## Nachweisumfang

Automatisch geprüft: mindestens zwei Zutaten, nichtleere Zubereitung mit mindestens 100 Zeichen, eindeutige Standardabschnitte, keine doppelten Zutaten, Rezept-ID und Versionsnummer sowie Quellen- und Autorenlinks. Rezeptauszüge wurden mit den gespeicherten Original-HTML-Seiten verglichen. Das ist eine Prüfung der Quellenübernahme, keine Bestätigung, dass die Rezepte gekocht oder ernährungsmedizinisch geprüft wurden. Hinweise und Varianten außerhalb der Zutaten-/Zubereitungsabschnitte stehen weiterhin im verlinkten Original.

Nicht eindeutig strukturierte oder unvollständige Seiten wurden übersprungen. Pro Rezept werden Mengen und Portionen aus der Quelle angezeigt; es findet keine automatische Skalierung statt. Zeitangaben werden nur übernommen, wenn die Quelle einen eindeutig numerischen Minutenwert nennt.

## Einzelquellen

| Rezept | Verwendete Version | Namensnennung |
| --- | --- | --- |
{sources}
''')
    print(f'DONE: {len(recipes)} recipes, {len(rejects)} rejected, {len(members)} catalog members',flush=True)

if __name__ == '__main__': main()
