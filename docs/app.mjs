import {parseIngredientInput,canonicalIngredient,rankRecipes,analyzeRecipe,validRecipe,validateBackup,mergeShoppingItems,normalize} from './core.mjs';
import {LocalStore} from './store.mjs';
import {fetchRecipe} from './recipes-api.mjs';

const $=selector=>document.querySelector(selector);
const main=$('#main');
const store=new LocalStore();
let state={pantry:[],history:[],shopping:[],seen:[],includeRecent:false};
let recipes=[],current=[],tab='pantry',detail=null,detailOrigin='ideas',saveQueue=Promise.resolve(),toastTimer,refresh=null,catalogVersion=1;
const ICONS={
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>', check:'<path d="m5 12 4 4 10-10"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>',
  leaf:'<path d="M20 4C9 2 3 9 6 16s14 4 14-12ZM4 20 16 8"/>', lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2"/>',
  pot:'<path d="M5 10h14v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM3 10h18M8 7h8M12 4v3M2 14h3M19 14h3"/>',
  back:'<path d="M19 12H5M11 6l-6 6 6 6"/>', undo:'<path d="M3 4v6h6M3 10a8 8 0 1 1 2 9"/>', plus:'<path d="M12 5v14M5 12h14"/>',
};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||ICONS.pot}</svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr=esc;
const dateText=value=>new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value));
const countText=n=>`${n} ${n===1?'Zutat':'Zutaten'}`;
const servingText=value=>value&&/^\d+$/.test(value)?`${value} ${value==='1'?'Portion':'Portionen'}`:value;
function notify(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,5500);}
function storageWarning(message='Dein Browser konnte die Daten nicht dauerhaft speichern. Bitte eine Sicherungsdatei herunterladen und privaten Browsermodus vermeiden.') {$('#storage-status').textContent=message;$('#storage-status').hidden=false;}
function persist(withRecipes=false) {
  const values={state:structuredClone(state)};
  if(withRecipes)values.catalog={version:catalogVersion,recipes:structuredClone(recipes)};
  saveQueue=saveQueue.catch(()=>{}).then(()=>store.save(values)).catch(()=>storageWarning());
  return saveQueue;
}
function renderTabs() {for(const button of document.querySelectorAll('[data-tab]')) {if(button.dataset.tab===tab)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}$('#pantry-count').textContent=state.pantry.length;$('#shopping-count').textContent=state.shopping.filter(item=>!item.done).length;}
function switchTab(next,focus=true) {tab=next;detail=null;render();if(focus){window.scrollTo(0,0);main.focus();}}
function heading(title,lead,extra='') {return `<div class="page-head"><div><span class="eyebrow">Deine Küche. Deine Ideen.</span><h1>${esc(title)}</h1><p class="lead">${esc(lead)}</p></div>${extra}</div>`;}
function pantryView() {
  return `${heading('Was ist noch da?','Sag, was du zu Hause hast. Wir finden passende Rezepte und zeigen dir, was noch fehlt.')}
  <div class="pantry-layout"><section class="pantry-editor" aria-label="Deine Zutaten">
    <form id="ingredient-form"><label for="ingredient-input" class="input-label">Zutaten hinzufügen</label><div class="input-row"><input id="ingredient-input" maxlength="800" autocomplete="off" placeholder="z. B. Tomaten, Eier, Zucchini"><button class="add-button" type="submit" aria-label="Zutaten hinzufügen">${icon('plus')}</button></div><p class="hint">Mehrere Zutaten mit Komma trennen. Mengen sind nicht nötig.</p></form>
    <span class="shortcut-label">Oft zu Hause</span><div class="shortcuts">${['Kartoffeln','Tomaten','Eier','Nudeln','Zucchini','Reis','Zwiebeln','Karotten'].map(name=>`<button class="shortcut" data-add="${attr(name)}">+ ${esc(name)}</button>`).join('')}</div>
    <div class="pantry-separator"></div><div class="section-line"><h2>In deiner Küche</h2><span>${countText(state.pantry.length)}</span></div>
    <div class="pantry-items">${state.pantry.map((name,i)=>`<div class="ingredient-chip"><span>${esc(name)}</span><button data-remove-ingredient="${i}" aria-label="${attr(name)} entfernen">${icon('close')}</button></div>`).join('')}</div>
    ${!state.pantry.length?'<p class="hint">Deine Zutatenliste ist noch leer. Füge die erste Zutat hinzu.</p>':''}
    <button class="primary full-width" id="find-ideas" ${!state.pantry.length?'disabled':''}>Kochideen finden ${icon('arrow')}</button>
  </section><aside><div class="kitchen-note"><span class="note-number">Aus Vorhandenem wird etwas Gutes.</span><h2>Heute mal etwas anderes.</h2><p>Was du schon gekocht hast, hilft bei der Auswahl. Kürzlich gekochte Gerichte machen zuerst Platz für neue Ideen.</p><button class="sample-ingredients" id="try-example">Mit Tomaten, Nudeln &amp; Zwiebeln ausprobieren</button></div><p class="local-note">${icon('lock')}<span>Deine Zutaten und Kochhistorie bleiben auf diesem Gerät. Ohne Konto. Ohne Abo.</span></p></aside></div>`;
}
function newSuggestions(reset=false,includeRecent=state.includeRecent) {
  if(reset)state.seen=[];
  state.includeRecent=includeRecent;
  current=rankRecipes(recipes,state.pantry,state.history,state.seen,Date.now(),includeRecent).slice(0,3);
  state.seen=[...new Set([...state.seen,...current.map(item=>item.recipe.id)])];
  persist();
}
function card(item) {
  const {recipe,matched,missing}=item;
  const meta=[recipe.minutes?`${recipe.minutes} Min.`:null,servingText(recipe.servings)].filter(Boolean).join(' · ');
  return `<article class="recipe-card"><div class="recipe-top"><span class="recipe-type">${esc(recipe.tags[0]||'Aus dem Kochbuch')}</span>${icon('pot')}</div><h2>${esc(recipe.title)}</h2><p class="recipe-meta">${esc(meta||'Rezept aus Wikibooks')}</p>
    <div class="match-label">${icon('check')} ${matched.length} von ${recipe.ingredients.length} Zutaten vorhanden</div><p class="ingredient-list-small">${matched.map(i=>esc(i.text)).join(' · ')}</p>
    ${missing.length?`<div class="missing-label">Noch nötig: ${countText(missing.length)}</div><p class="missing-note">${missing.slice(0,3).map(i=>esc(i.text)).join(' · ')}${missing.length>3?' · weitere im Rezept':''}</p>`:'<p class="match-label">Alles aus der Zutatenliste ist da.</p>'}
    <div class="card-action"><button class="primary" data-open-recipe="${attr(recipe.id)}" aria-label="Rezept öffnen: ${attr(recipe.title)}">Rezept ansehen ${icon('arrow')}</button></div></article>`;
}
function ideasView() {
  const intro=heading('Was kochen wir heute?',state.pantry.length?`Ideen für ${state.pantry.join(', ')}. Fehlende Zutaten sind sichtbar aufgeführt.`:'Füge zuerst die Lebensmittel hinzu, die du verwenden möchtest.','<button class="secondary" data-switch="pantry">Zutaten ändern</button>');
  if(!state.pantry.length)return `${intro}<div class="empty"><h2>Deine Zutaten sind der Anfang.</h2><p>Mit einer oder mehreren Zutaten können wir passende Gerichte finden.</p><button class="primary" data-switch="pantry">Zutaten hinzufügen ${icon('arrow')}</button></div>`;
  if(!current.length) {
    const remaining=rankRecipes(recipes,state.pantry,state.history,state.seen,Date.now(),state.includeRecent).length;
    const unshown=rankRecipes(recipes,state.pantry,state.history,[],Date.now(),state.includeRecent).length;
    const includingRecent=rankRecipes(recipes,state.pantry,state.history,[],Date.now(),true).length;
    return `${intro}<section class="empty"><h2>${remaining?'Weitere passende Gerichte warten auf dich.':unshown?'Alle passenden Ideen dieser Runde gesehen.':includingRecent&&!state.includeRecent?'Diese Gerichte hast du kürzlich gekocht.':'Für diese Zutaten ist gerade kein passendes Rezept dabei.'}</h2><p>${remaining?'Die zuletzt angezeigten Gerichte sind als gekocht gespeichert. Entdecke jetzt neue Vorschläge aus der laufenden Runde.':unshown?'Du kannst eine neue Runde starten und dir die passenden Gerichte erneut ansehen.':includingRecent&&!state.includeRecent?'Für mehr Abwechslung haben wir die letzten 14 Tage zunächst ausgelassen. Du kannst diese Gerichte jetzt ausdrücklich einbeziehen.':'Ergänze weitere Zutaten. Die Auswahl stammt aus unserem Wikibooks-Rezeptbestand und deckt nicht jedes Lebensmittel ab.'}</p><div class="empty-actions">${remaining?'<button class="primary" id="more-ideas">Weitere Ideen</button>':unshown?'<button class="primary" id="restart-round">Neue Vorschlagsrunde</button>':includingRecent?'<button class="primary" id="include-recent">Zuletzt gekochte Gerichte einbeziehen</button>':'<button class="primary" data-switch="pantry">Zutaten ergänzen</button>'}</div></section>`;
  }
  return `${intro}<div class="recipe-grid">${current.map(card).join('')}</div><div class="ideas-bottom"><button class="secondary" id="more-ideas">Weitere Ideen ${icon('arrow')}</button><p>${state.includeRecent?'Auch zuletzt gekochte Gerichte sind in dieser Runde dabei.':'Zutaten zuerst. Deine Vorlieben danach. Frische Ideen dazwischen.'}</p></div>`;
}
function detailView() {
  const recipe=recipes.find(r=>r.id===detail);
  if(!recipe){detail=null;return historyView();}
  const analysis=analyzeRecipe(recipe,state.pantry);
  const alreadyToday=state.history.some(e=>e.recipeId===recipe.id&&new Date(e.cookedAt).toDateString()===new Date().toDateString());
  return `<button class="back-button" id="back-from-recipe">${icon('back')} Zurück zu ${detailOrigin==='history'?'Schon gekocht':'den Kochideen'}</button><header class="detail-head"><span class="eyebrow">${esc(recipe.tags.join(' · ')||'Aus dem Wikibooks-Kochbuch')}</span><h1>${esc(recipe.title)}</h1><p class="recipe-meta">${[recipe.minutes?`${recipe.minutes} Minuten`:null,recipe.servings].filter(Boolean).map(esc).join(' · ')||'Mengen und Anleitung aus dem Originalrezept.'}</p><div class="detail-actions"><button class="primary" id="mark-cooked" ${alreadyToday?'disabled':''}>${icon('check')} ${alreadyToday?'Heute als gekocht gespeichert':'Habe ich gekocht'}</button><button class="secondary" id="refresh-one" ${refresh?'disabled':''}>Rezept aktualisieren</button></div></header>
    <div class="detail-layout"><section><h2>Zutaten</h2><p class="hint" style="margin:0 0 12px">✓ vorhanden · + noch nötig. Mengen aus der Quelle.</p><div class="recipe-shopping-actions"><button class="secondary" id="add-missing-shopping" ${analysis.missing.length?'':'disabled'}>Fehlende Zutaten auf die Liste</button><button class="plain-button" id="add-all-shopping">Alle Zutaten auf die Liste</button></div><ul class="ingredients-full">${recipe.ingredients.map((item,index)=>{const listed=state.shopping.some(entry=>!entry.done&&normalize(entry.text)===normalize(item.text));return `<li><span class="ingredient-status ${analysis.matched.includes(item)?'have':''}" aria-label="${analysis.matched.includes(item)?'Vorhanden':'Noch nötig'}">${analysis.matched.includes(item)?'✓':'+'}</span><span class="ingredient-text">${esc(item.text)}</span><button class="ingredient-add" data-add-recipe-ingredient="${index}" aria-label="${attr(listed?'Bereits auf der Einkaufsliste: '+item.text:'Zur Einkaufsliste hinzufügen: '+item.text)}" ${listed?'disabled':''}>${icon(listed?'check':'plus')}</button></li>`;}).join('')}</ul><p class="hint">Das Plus übernimmt die Originalmenge. Gleiche Einträge stehen einmal auf der Liste; Mengen werden nicht automatisch addiert.</p>${recipe.ingredientNotes?.length?`<div class="ingredient-notes"><h3>Hinweise aus dem Rezept</h3>${recipe.ingredientNotes.map(note=>`<p>${esc(note)}</p>`).join('')}</div>`:''}</section><section><h2>So geht’s</h2><ol class="recipe-steps">${recipe.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol></section></div>
    <aside class="source-note"><p>Quelle: <a href="${attr(recipe.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(recipe.title)} · Wikibooks</a>. Texte von <a href="${attr(recipe.historyUrl)}" target="_blank" rel="noopener noreferrer">Wikibooks-Mitwirkenden</a>, unter <a href="${attr(recipe.license.url)}" target="_blank" rel="noopener noreferrer">${esc(recipe.license.name)}</a>.</p><p><a href="${attr(recipe.revisionUrl)}" target="_blank" rel="noopener noreferrer">Verwendete Version ${recipe.revisionId}</a> · Abgerufen am ${dateText(recipe.updatedAt)}. Für die App strukturiert; Navigation und Bilder entfernt. Originalmengen beachten.</p><p>„Habe ich gekocht“ speichert das Gericht. Zutaten werden dabei nicht automatisch aus deiner Liste entfernt.</p></aside>`;
}
function shoppingView() {
  const open=state.shopping.filter(item=>!item.done);
  const done=state.shopping.filter(item=>item.done);
  const row=item=>`<li class="shopping-row ${item.done?'is-done':''}"><input class="shopping-checkbox" id="shopping-${attr(item.id)}" type="checkbox" data-check-shopping="${attr(item.id)}" ${item.done?'checked':''} aria-label="${attr(item.text)} als gekauft markieren"><label for="shopping-${attr(item.id)}" class="shopping-label"><span>${esc(item.text)}</span>${item.recipeTitle?`<small>Aus „${esc(item.recipeTitle)}“</small>`:''}</label><button class="icon-button" data-remove-shopping="${attr(item.id)}" aria-label="${attr('Einkaufslisteneintrag entfernen: '+item.text)}">${icon('close')}</button></li>`;
  return `<div class="shopping-layout">${heading('Für deinen nächsten Einkauf.','Füge einzelne Sachen hinzu oder übernimm Zutaten direkt aus einem Rezept. Beim Einkaufen kannst du alles abhaken.')}
    <section class="shopping-entry"><form id="shopping-form"><label for="shopping-input" class="input-label">Eine Sache hinzufügen</label><div class="input-row"><input id="shopping-input" maxlength="2000" autocomplete="off" placeholder="z. B. 1 Liter Milch"><button class="add-button" type="submit" aria-label="Zur Einkaufsliste hinzufügen">${icon('plus')}</button></div><p class="hint">Auch Mengen und andere Sachen sind möglich, zum Beispiel „Spülmittel“.</p></form></section>
    <div class="shopping-summary" role="status">${open.length} offen · ${done.length} erledigt</div>
    ${!state.shopping.length?'<section class="empty"><h2>Deine Einkaufsliste ist noch leer.</h2><p>Trage oben etwas ein. Oder öffne ein Rezept und tippe auf das Plus neben einer Zutat.</p><button class="secondary" data-switch="ideas">Zu den Kochideen</button></section>':`${open.length?`<h2 class="shopping-section-title">Noch besorgen</h2><ul class="shopping-list">${open.map(row).join('')}</ul>`:'<p class="shopping-complete">Alles abgehakt. Dein Einkauf ist erledigt.</p>'}${done.length?`<h2 class="shopping-section-title">Schon besorgt</h2><ul class="shopping-list">${done.map(row).join('')}</ul>`:''}`}
    <p class="local-note">${icon('lock')}<span>Die Liste bleibt auf diesem Gerät und ist auch offline verfügbar. Abhaken verschiebt Lebensmittel nicht automatisch in deine Zutatenliste.</span></p></div>`;
}
function historyView() {
  const intro=heading('Das kam auf den Tisch.','Deine gekochten Gerichte helfen uns, deine Vorlieben zu berücksichtigen. Ein versehentlicher Eintrag lässt sich rückgängig machen.');
  if(!state.history.length)return `${intro}<div class="empty"><h2>Hier beginnt deine Kochgeschichte.</h2><p>Öffne ein Rezept und tippe nach dem Kochen auf „Habe ich gekocht“.</p><button class="primary" data-switch="ideas">Kochideen entdecken ${icon('arrow')}</button></div>`;
  return `${intro}<div class="history-list">${[...state.history].sort((a,b)=>Date.parse(b.cookedAt)-Date.parse(a.cookedAt)).map(entry=>`<article class="history-row"><time class="history-date" datetime="${attr(entry.cookedAt)}">${esc(dateText(entry.cookedAt))}</time><div class="history-title">${recipes.some(r=>r.id===entry.recipeId)?`<button data-open-recipe="${attr(entry.recipeId)}">${esc(entry.title)}</button>`:`<strong>${esc(entry.title)}</strong>`}<small>${esc(entry.tags.join(' · '))}</small></div><button class="icon-button" data-undo-history="${attr(entry.entryId)}" aria-label="Gekocht-Eintrag für ${attr(entry.title)} rückgängig machen" title="Rückgängig machen">${icon('undo')}</button></article>`).join('')}</div>`;
}
function settingsView() {
  return `<div class="settings-layout">${heading('Deine App. Deine Daten.','Sichere deine Küche, lade Rezepte nach oder lege Küchenzauber auf deinen Startbildschirm.')}
    <section class="settings-section"><h2>Sicherung</h2><p>Zutaten, Einkaufsliste, Kochhistorie und Rezepte werden nur auf diesem Gerät gespeichert. Sichere sie gelegentlich als Datei – besonders bevor du Browserdaten löschst oder das Handy wechselst.</p><div class="settings-buttons"><button class="primary" id="export-backup">Sicherungsdatei herunterladen</button><button class="secondary" id="choose-import">Sicherung auswählen</button></div><input id="import-file" type="file" accept="application/json,.json" hidden><div id="import-preview" aria-live="polite"></div></section>
    <section class="settings-section"><h2>Rezepte aus dem Internet</h2><p>${recipes.length} vollständige Rezepte aus dem deutschen Wikibooks-Kochbuch. Zutaten und Anleitung stehen direkt hier in der App. Die Suche verwendet diesen Bestand.</p><p>Neue Versionen werden einzeln und mit Pause geladen. Du kannst jederzeit stoppen. Nicht erreichbare oder unvollständige Rezepte bleiben in ihrer bisherigen Version erhalten.</p><div class="settings-buttons"><button class="secondary" id="refresh-all" ${refresh?'disabled':''}>Rezepte aktualisieren</button><button class="secondary" id="cancel-refresh" ${refresh?'':'hidden'}>Aktualisierung stoppen</button></div><p id="refresh-status" role="status" style="margin-top:14px">${refresh?esc(refresh.message):'Gespeicherte Rezepte sind auch offline verfügbar.'}</p></section>
    <section class="settings-section" id="iphone-install"><h2>Auf dem iPhone installieren</h2><ol class="install-steps"><li>Öffne den Link zu Küchenzauber in <strong>Safari</strong>.</li><li>Tippe auf <strong>Teilen</strong> und dann <strong>Zum Home-Bildschirm</strong>.</li><li>Falls angezeigt, aktiviere <strong>Als Web-App öffnen</strong>. Tippe auf <strong>Hinzufügen</strong>.</li></ol><p>Das App-Symbol öffnet Küchenzauber direkt. Öffne die App beim ersten Mal mit Internet, damit die Rezepte für später gespeichert werden.</p></section>
    <section class="settings-section"><h2>Kosten und Quellen</h2><p>Keine Abos, keine kostenpflichtige KI und kein Benutzerkonto. Internet-Rezepte benötigen zum Aktualisieren eine Verbindung. Externe Anbieter können ihre Angebote ändern.</p><p>Rezepttexte: <a href="https://de.wikibooks.org/wiki/Kategorie:Kochbuch/_Alle_Rezepte" target="_blank" rel="noopener noreferrer">Wikibooks-Kochbuch</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. Quellen, Mitwirkende und die genaue Version stehen bei jedem Rezept. Mengen und Schritte sind aus den Quellen übernommen; die Gerichte wurden für diese App nicht probegekocht.</p></section>
  </div>`;
}
function render() {renderTabs();main.innerHTML=detail?detailView():tab==='pantry'?pantryView():tab==='ideas'?ideasView():tab==='shopping'?shoppingView():tab==='history'?historyView():settingsView();bindView();}
function addShopping(texts,recipeTitle=null) {
  try {
    const merged=mergeShoppingItems(state.shopping,texts,recipeTitle);
    state.shopping=merged.items;persist();render();
    notify(merged.added||merged.reactivated?`${merged.added} hinzugefügt${merged.reactivated?`, ${merged.reactivated} wieder offen`:''}.`:'Diese Einträge stehen schon auf deiner Einkaufsliste.');
  }catch(error){notify(error.message);}
}
function invalidateSuggestions() {state.seen=[];state.includeRecent=false;current=[];}
function addIngredients(value) {
  const added=parseIngredientInput(value,state.pantry);
  if(!added.length){notify('Diese Zutaten sind schon in deiner Liste.');return;}
  if(state.pantry.length+added.length>200){notify('Bitte höchstens 200 Zutaten speichern.');return;}
  state.pantry.push(...added);invalidateSuggestions();persist();render();$('#ingredient-input')?.focus();notify(`${countText(added.length)} hinzugefügt.`);
}
function showRecipe(id) {detailOrigin=tab==='history'?'history':'ideas';detail=id;render();window.scrollTo(0,0);main.focus();}
function bindView() {
  main.querySelectorAll('[data-switch]').forEach(button=>button.onclick=()=>{if(button.dataset.switch==='ideas'&&!current.length)newSuggestions();switchTab(button.dataset.switch);});
  $('#ingredient-form')?.addEventListener('submit',event=>{event.preventDefault();const value=$('#ingredient-input').value;if(value.trim())addIngredients(value);else $('#ingredient-input').focus();});
  main.querySelectorAll('[data-add]').forEach(button=>button.onclick=()=>addIngredients(button.dataset.add));
  main.querySelectorAll('[data-remove-ingredient]').forEach(button=>button.onclick=()=>{state.pantry.splice(Number(button.dataset.removeIngredient),1);invalidateSuggestions();persist();render();$('#ingredient-input')?.focus();});
  $('#find-ideas')?.addEventListener('click',()=>{newSuggestions(true);switchTab('ideas');});
  $('#try-example')?.addEventListener('click',()=>{const added=parseIngredientInput('Tomaten, Nudeln, Zwiebeln',state.pantry);state.pantry.push(...added);invalidateSuggestions();newSuggestions(true);switchTab('ideas');});
  $('#more-ideas')?.addEventListener('click',()=>{newSuggestions();render();main.focus();window.scrollTo(0,0);});
  $('#restart-round')?.addEventListener('click',()=>{newSuggestions(true);render();main.focus();});
  $('#include-recent')?.addEventListener('click',()=>{newSuggestions(true,true);render();main.focus();});
  main.querySelectorAll('[data-open-recipe]').forEach(button=>button.onclick=()=>showRecipe(button.dataset.openRecipe));
  $('#shopping-form')?.addEventListener('submit',event=>{event.preventDefault();const value=$('#shopping-input').value;if(value.trim())addShopping([value]);$('#shopping-input')?.focus();});
  main.querySelectorAll('[data-check-shopping]').forEach(input=>input.onchange=()=>{const item=state.shopping.find(entry=>entry.id===input.dataset.checkShopping);if(item){item.done=input.checked;persist();render();document.getElementById('shopping-'+item.id)?.focus();}});
  main.querySelectorAll('[data-remove-shopping]').forEach(button=>button.onclick=()=>{state.shopping=state.shopping.filter(item=>item.id!==button.dataset.removeShopping);persist();render();$('#shopping-input')?.focus();notify('Eintrag entfernt.');});
  main.querySelectorAll('[data-add-recipe-ingredient]').forEach(button=>button.onclick=()=>{const recipe=recipes.find(r=>r.id===detail);const ingredient=recipe?.ingredients[Number(button.dataset.addRecipeIngredient)];if(ingredient)addShopping([ingredient.text],recipe.title);});
  $('#add-missing-shopping')?.addEventListener('click',()=>{const recipe=recipes.find(r=>r.id===detail);if(recipe)addShopping(analyzeRecipe(recipe,state.pantry).missing.map(item=>item.text),recipe.title);});
  $('#add-all-shopping')?.addEventListener('click',()=>{const recipe=recipes.find(r=>r.id===detail);if(recipe)addShopping(recipe.ingredients.map(item=>item.text),recipe.title);});
  $('#back-from-recipe')?.addEventListener('click',()=>switchTab(detailOrigin));
  $('#mark-cooked')?.addEventListener('click',()=>{
    const recipe=recipes.find(r=>r.id===detail);if(!recipe)return;
    state.history.push({entryId:crypto.randomUUID(),recipeId:recipe.id,title:recipe.title,tags:[...recipe.tags],cookedAt:new Date().toISOString()});
    current=current.filter(item=>item.recipe.id!==recipe.id);persist();render();notify('Als gekocht gespeichert. In „Schon gekocht“ kannst du den Eintrag rückgängig machen.');
  });
  main.querySelectorAll('[data-undo-history]').forEach(button=>button.onclick=()=>{state.history=state.history.filter(e=>e.entryId!==button.dataset.undoHistory);invalidateSuggestions();persist();render();main.focus();notify('Gekocht-Eintrag rückgängig gemacht.');});
  $('#export-backup')?.addEventListener('click',exportBackup);
  $('#choose-import')?.addEventListener('click',()=>$('#import-file').click());
  $('#import-file')?.addEventListener('change',event=>previewImport(event.target.files[0]));
  $('#refresh-all')?.addEventListener('click',()=>updateRecipes(recipes.map(r=>r.id)));
  $('#refresh-one')?.addEventListener('click',()=>updateRecipes([detail]));
  $('#cancel-refresh')?.addEventListener('click',()=>{refresh?.controller.abort();});
}
function exportBackup() {
  const payload={app:'kuechenzauber',version:2,exportedAt:new Date().toISOString(),state:{pantry:state.pantry,history:state.history,shopping:state.shopping},recipes};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`kuechenzauber-sicherung-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);notify('Sicherungsdatei erstellt. Bewahre sie in „Dateien“ auf.');
}
async function previewImport(file) {
  if(!file)return;
  const area=$('#import-preview');
  try {
    if(file.size>12*1024*1024)throw new Error('Die Datei ist zu groß. Bitte eine Küchenzauber-Sicherung unter 12 MB wählen.');
    const checked=validateBackup(JSON.parse(await file.text()),recipes);
    area.innerHTML=`<p class="hint">${countText(checked.state.pantry.length)}, ${checked.state.history.length} Gekocht-Einträge, ${checked.state.shopping.length} Einkaufslisteneinträge und ${checked.recipes.length} Rezepte erkannt. Diese Sicherung ersetzt deine derzeitigen Daten. Lade sie vorher herunter, wenn du sie behalten möchtest.</p><div class="settings-buttons"><button class="primary" id="confirm-import">Sicherung übernehmen</button><button class="secondary" id="cancel-import">Abbrechen</button></div>`;
    $('#cancel-import').onclick=()=>{area.replaceChildren();$('#import-file').value='';};
    $('#confirm-import').onclick=async()=>{
      if(refresh){notify('Bitte zuerst die Rezeptaktualisierung stoppen.');return;}
      try {await saveQueue;await store.save({state:checked.state,catalog:{version:catalogVersion,recipes:checked.recipes}});state=checked.state;recipes=checked.recipes;current=[];render();main.focus();notify('Sicherung übernommen.');}catch{notify('Die Sicherung konnte nicht gespeichert werden. Deine bisherigen Daten bleiben erhalten.');}
    };
  }catch(error){area.textContent=error instanceof SyntaxError?'Diese Datei enthält kein gültiges JSON. Bitte eine Küchenzauber-Sicherung auswählen.':error.message;}
}
const pause=(ms,signal)=>new Promise((resolve,reject)=>{const timer=setTimeout(done,ms);const cancel=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);reject(new DOMException('Abgebrochen','AbortError'));};function done(){signal.removeEventListener('abort',cancel);resolve();}if(signal.aborted){cancel();return;}signal.addEventListener('abort',cancel,{once:true});});
async function updateRecipes(ids) {
  if(refresh)return;
  if(!navigator.onLine){notify('Du bist offline. Deine gespeicherten Rezepte bleiben verfügbar.');return;}
  refresh={controller:new AbortController(),message:'Aktualisierung wird gestartet …'};render();
  let checked=0,changed=0,failed=0,lastError='';
  const signal=refresh.controller.signal;
  for(const id of ids) {
    if(signal.aborted)break;
    const index=recipes.findIndex(r=>r.id===id);if(index<0)continue;
    refresh.message=`${checked} von ${ids.length} Rezepten geprüft · ${changed} aktualisiert · ${failed} nicht erreichbar`;
    if($('#refresh-status'))$('#refresh-status').textContent=refresh.message;
    try {
      const updated=await fetchRecipe(recipes[index],signal);
      checked++;
      if(updated!==recipes[index]) {const next=[...recipes];next[index]=updated;await saveQueue;await store.save({catalog:{version:catalogVersion,recipes:next}});recipes=next;changed++;}
    }catch(error){if(signal.aborted)break;failed++;checked++;lastError=error.message;if(/ausgelastet/.test(lastError))break;}
    if(ids.length>1&&checked<ids.length) {try{await pause(1200,signal);}catch{break;}}
  }
  const stopped=signal.aborted;refresh=null;
  current=current.map(item=>{const recipe=recipes.find(r=>r.id===item.recipe.id)||item.recipe;return {...item,recipe,...analyzeRecipe(recipe,state.pantry)};});
  render();notify(`${stopped?'Gestoppt. ':''}${checked} geprüft, ${changed} aktualisiert.${failed?` ${failed} unverändert behalten. ${lastError}`:''}`);
}
function updateConnection() {$('#connection-status').hidden=navigator.onLine;}
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{if(button.dataset.tab==='ideas'&&!current.length)newSuggestions();switchTab(button.dataset.tab);});
$('#settings-toggle').onclick=()=>switchTab(tab==='settings'?'pantry':'settings');
$('#install-help').onclick=()=>{switchTab('settings');$('#iphone-install').scrollIntoView({block:'start'});};
window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);
async function start() {
  updateConnection();
  let savedCatalog;
  try {
    await store.open();
    savedCatalog=await store.get('catalog');
    const savedState=await store.get('state');
    if(savedState){const checked=validateBackup({app:'kuechenzauber',version:1,state:savedState,recipes:savedCatalog?.recipes},savedCatalog?.recipes||[]);state=checked.state;state.seen=Array.isArray(savedState.seen)?savedState.seen.filter(id=>typeof id==='string'):[];}
  }catch {storageWarning();}
  if(savedCatalog?.recipes?.length && savedCatalog.recipes.every(validRecipe))recipes=savedCatalog.recipes;
  try {
    const response=await fetch('./recipes.json');if(!response.ok)throw new Error('Rezeptdatei nicht erreichbar.');
    const data=await response.json();
    if(data.version!==1||!Array.isArray(data.recipes)||data.recipes.length<100||!data.recipes.every(validRecipe))throw new Error('Rezeptdatei ist unvollständig.');
    const saved=new Map(recipes.map(r=>[r.id,r]));recipes=data.recipes.map(r=>saved.get(r.id)?.revisionId>r.revisionId?saved.get(r.id):r);for(const r of saved.values())if(!recipes.some(x=>x.id===r.id))recipes.push(r);
    await persist(true);
  }catch(error) {
    if(!recipes.length){main.innerHTML=`<section class="empty"><h1>Die Rezepte fehlen noch.</h1><p class="lead">Bitte öffne Küchenzauber einmal mit Internet, damit die Rezeptliste gespeichert wird.</p><button class="primary" id="retry-start">Erneut versuchen</button></section>`;$('#retry-start').onclick=()=>location.reload();return;}
    notify('Gespeicherte Rezepte geladen. Die Rezeptquelle kann später aktualisiert werden.');
  }
  render();
  if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;}catch{notify('Offline-Vorbereitung konnte nicht abgeschlossen werden. Bitte später mit Internet erneut öffnen.');}}
}
start().catch(()=>{main.innerHTML='<section class="empty"><h1>Die App konnte nicht starten.</h1><p class="lead">Bitte die Seite neu laden. Deine gespeicherten Daten werden nicht gelöscht.</p><button class="primary" onclick="location.reload()">Neu laden</button></section>';});
