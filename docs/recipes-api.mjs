import { validRecipe } from './core.mjs';

function cleanText(node) { return node.textContent.replace(/\[\s*Bearbeiten\s*\]/gi,'').replace(/\s+/g,' ').trim(); }
function heading(node) {
  const h = node.matches('h1,h2,h3,h4,h5,h6') ? node : node.matches('.mw-heading') ? node.querySelector('h1,h2,h3,h4,h5,h6') : null;
  return h ? {level:Number(h.tagName[1]), text:cleanText(h)} : null;
}
function sectionNodes(root, label) {
  const nodes = [...root.children];
  let start = -1, level = 0;
  for (let i=0;i<nodes.length;i++) {
    const h = heading(nodes[i]);
    if (h && h.text.toLowerCase() === label) { start=i+1; level=h.level; break; }
  }
  if (start<0) throw new Error(`Abschnitt „${label}“ fehlt.`);
  let end=nodes.length;
  for (let i=start;i<nodes.length;i++) { const h=heading(nodes[i]); if (h && h.level<=level) { end=i;break; } }
  return nodes.slice(start,end);
}
function extractBlocks(nodes, ingredientSection, notes=[]) {
  const blocks=[];
  let prefix='';
  let hasStructure=false;
  const visit=node=>{
    const h=heading(node);
    if(h) {prefix=h.text;return;}
    const add=text=>{
      if(!text || /^(erfasst von|autor(?:in)?\s*:|quelle\s*:)/i.test(text) || /^guten appetit!?$/i.test(text))return;
      if(ingredientSection && /^con\s+\.{3}$/i.test(text)){notes.push(text);return;}
      if(ingredientSection && text.length<100 && /:$/.test(text)) {prefix=text.replace(/:$/,'');return;}
      if(ingredientSection && /^\(?f[uü]r\b/i.test(text))return;
      blocks.push(prefix ? `${prefix}: ${text}` : text);
    };
    if(node.matches('ul,ol')) { hasStructure=true; for(const item of node.children) if(item.matches('li')) add(cleanText(item)); return; }
    if(node.matches('table')) {
      if(!ingredientSection) throw new Error('Unbekanntes Anleitungsformat.');
      hasStructure=true;
      for(const row of node.querySelectorAll('tr')) { const cells=[...row.children].filter(c=>c.matches('td,th'));if(cells.length>3)throw new Error('Zutatentabelle nicht eindeutig erkennbar.'); if(cells.some(c=>c.matches('td'))) add(cells.map(cleanText).join(' ')); }
      return;
    }
    if(node.matches('p')) {
      const text=cleanText(node);
      const bold=node.querySelector('b,strong');
      const boldOnly=bold && cleanText(bold)===text;
      if(ingredientSection && /^für\s+(den|die|das)\b/i.test(text)&&text.length<80&&!/[.!?]/.test(text)){prefix=text.replace(/:$/,'');return;}
      if(ingredientSection&&boldOnly&&/^zutaten\s+/i.test(text)){prefix=text;return;}
      if(!ingredientSection&&text.length<80&&!/[.!?]/.test(text)&&(boldOnly || text.length<40&&text.split(/\s+/).length<=3&&!/\d/.test(text)&&node.nextElementSibling?.matches('ul,ol'))){prefix=text.replace(/:$/,'');return;}
      if(ingredientSection&&(/:$/.test(text)&&text.length<100 || /^\(?f[uü]r\b/i.test(text) || /^(erfasst von|autor(?:in)?\s*:|quelle\s*:)/i.test(text) || /^guten appetit!?$/i.test(text))){add(text);return;}
      if(ingredientSection&&(/[.!?](?:\s|$)/.test(text)||text.split(/\s+/).length>12||/\b(sollte(n)?|sollen|verwendet|verwenden|würzen|abschmecken|schlagen|rühren|beigeben|umrühren|braucht|benötigt)\b|\bgibt es\b/i.test(text))){notes.push(text);return;}
      if(ingredientSection){for(const line of node.textContent.split(/\n/)){const cleaned=line.replace(/\s+/g,' ').trim();if(cleaned)add(cleaned);}return;}
      add(text); return;
    }
    if(ingredientSection&&node.matches('dt')){prefix=cleanText(node).replace(/:$/,'');return;}
    if(node.matches('div,section,dl,dd')) for(const child of node.children) visit(child);
  };
  for(const node of nodes)visit(node);
  if(ingredientSection && !hasStructure)throw new Error('Zutatenliste nicht eindeutig erkennbar.');
  return blocks;
}
export function parseRecipeHTML(html, previous, revisionId) {
  const doc=new DOMParser().parseFromString(html,'text/html');
  const root=doc.querySelector('.mw-parser-output');
  if(!root)throw new Error('Rezeptinhalt fehlt.');
  root.querySelectorAll('script,style,figure,img,.noprint,.mw-editsection,.toc,#toc,.mw-empty-elt,.reference,.gallery,.gallerybox').forEach(node=>node.remove());
  const ingredientNotes=[];
  const ingredients=extractBlocks(sectionNodes(root,'zutaten'),true,ingredientNotes).map(text=>({text}));
  const steps=extractBlocks(sectionNodes(root,'zubereitung'),false);
  if(ingredients.length<2 || ingredients.length>65 || new Set(ingredients.map(i=>i.text)).size!==ingredients.length || steps.join(' ').length<100)throw new Error('Das neue Rezept ist unvollständig.');
  let servings=null,minutes=null;
  for(const node of sectionNodes(root,'zutaten')) {
    const text=cleanText(node);
    if(node.matches('p')&&/^\(?f[uü]r\b/i.test(text)&&!/^\(?f[uü]r\s+(den|die|das)\b/i.test(text)&&/\d|\b(eine?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\b/i.test(text))servings=text.replace(/^\(|\)$/g,'').trim();
  }
  for(const row of root.querySelectorAll('tr')) {
    const cells=[...row.children].filter(c=>c.matches('td,th'));if(cells.length!==2)continue;
    const label=cleanText(cells[0]).toLowerCase().replace(/:$/,'');const value=cleanText(cells[1]);
    if(label==='portionen'&&value)servings=value;
    if(label==='zubereitungszeit'){const match=value.match(/^(\d+)\s*(?:min(?:uten)?\.?|min\.)?$/i);if(match&&Number(match[1])>0&&Number(match[1])<1440)minutes=Number(match[1]);}
  }
  const updated={...previous,ingredients,ingredientNotes,steps,servings,minutes,revisionId,revisionUrl:`https://de.wikibooks.org/w/index.php?oldid=${revisionId}`,updatedAt:new Date().toISOString()};
  if(!validRecipe(updated))throw new Error('Die Rezeptantwort ist ungültig.');
  return updated;
}
export async function fetchRecipe(previous, signal) {
  const url=new URL('https://de.wikibooks.org/w/api.php');
  for(const [key,value] of Object.entries({action:'parse',page:previous.pageTitle,prop:'text|revid',format:'json',formatversion:'2',origin:'*'}))url.searchParams.set(key,value);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  const abort=()=>controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)controller.abort();
  try {
    const response=await fetch(url,{signal:controller.signal,credentials:'omit',cache:'no-store'});
    if(!response.ok)throw new Error(response.status===429 ? 'Die Rezeptquelle ist gerade ausgelastet. Bitte später erneut versuchen.' : 'Die Rezeptquelle ist gerade nicht erreichbar.');
    const data=await response.json();
    if(data.error || !data.parse?.text || !Number.isInteger(data.parse.revid))throw new Error('Die Rezeptquelle hat keinen vollständigen Inhalt geliefert.');
    if(data.parse.revid===previous.revisionId)return previous;
    return parseRecipeHTML(data.parse.text,previous,data.parse.revid);
  } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
