import {parseRecipeHTML,fetchRecipe} from '../recipes-api.mjs';
import {LocalStore} from '../store.mjs';
const results=[];
const equal=(a,b,message)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(message||'Werte unterscheiden sich.');};
async function check(name,fn){try{await fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,error:error.message});}const li=document.createElement('li');li.className=results.at(-1).pass?'pass':'fail';li.textContent=`${results.at(-1).pass?'PASS':'FAIL'} · ${name}${results.at(-1).error?' · '+results.at(-1).error:''}`;document.querySelector('#results').append(li);}
const {recipes}=await (await fetch('../recipes.json')).json();
for(const id of ['wb-326','wb-114734','wb-52776','wb-61174','wb-87962','wb-3045','wb-16162','wb-118105','wb-28564'])await check(`Live-Parser übernimmt Originalmengen und Anleitung korrekt (${id})`,async()=>{
  const source=recipes.find(r=>r.id===id);if(!source)throw new Error('Quellrezept für Fixture fehlt.');
  const html=await (await fetch(`./fixtures/fixture-${id}.html`)).text();
  const parsed=parseRecipeHTML(html,source,source.revisionId);
  equal(parsed.ingredients,source.ingredients,'Zutaten unterscheiden sich');equal(parsed.steps,source.steps,'Anleitung unterscheidet sich');equal(parsed.servings,source.servings,'Portionen unterscheiden sich');equal(parsed.minutes,source.minutes,'Zeit unterscheidet sich');
  equal(parsed.ingredientNotes||[],source.ingredientNotes||[],'Zutatenhinweise unterscheiden sich');
});
await check('Unvollständige und manipulierte Rezeptantwort wird abgelehnt',()=>{
  const recipe=recipes[0];let rejected=0;
  for(const html of ['<div class="mw-parser-output"><h2>Zutaten</h2><ul><li>Salz</li><li>Eier</li></ul></div>','<div class="mw-parser-output"><h2>Zutaten</h2><ul><li>Eier</li><li>Eier</li></ul><h2>Zubereitung</h2><p>'+('Kochen. '.repeat(30))+'</p></div>'])try{parseRecipeHTML(html,recipe,123);}catch{rejected++;}
  equal(rejected,2);
});
await check('Ungültige Netzwerkantwort ersetzt kein Rezept',async()=>{
  const original=globalThis.fetch;let record=structuredClone(recipes[0]);const before=JSON.stringify(record);
  globalThis.fetch=async()=>new Response(JSON.stringify({parse:{revid:999999999,text:'<div class="mw-parser-output">kaputt</div>'}}),{headers:{'Content-Type':'application/json'}});
  try{try{record=await fetchRecipe(record);}catch{}equal(JSON.stringify(record),before);}finally{globalThis.fetch=original;}
});
await check('Unveränderte Quellversion erhält den gespeicherten Datensatz',async()=>{
  const original=globalThis.fetch;const recipe=recipes[0];globalThis.fetch=async()=>new Response(JSON.stringify({parse:{revid:recipe.revisionId,text:'same'}}));
  try{if(await fetchRecipe(recipe)!==recipe)throw new Error('Unnötige Neuschreibung');}finally{globalThis.fetch=original;}
});
await check('IndexedDB erhält Zutaten und Kochhistorie über erneutes Öffnen',async()=>{
  const name=`kuechenzauber-test-${crypto.randomUUID()}`;const store=new LocalStore(name);await store.open();
  const state={pantry:['Tomaten','Eier'],history:[{entryId:'test',recipeId:recipes[0].id,cookedAt:new Date().toISOString(),title:recipes[0].title,tags:recipes[0].tags}]};
  await store.save({state,catalog:{version:1,recipes}});store.db.close();
  const reopened=new LocalStore(name);await reopened.open();equal(await reopened.get('state'),state);equal((await reopened.get('catalog')).recipes.length,recipes.length);reopened.db.close();
  await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(name);request.onsuccess=resolve;request.onerror=()=>reject(request.error);});
});
document.querySelector('#status').textContent=`${results.filter(r=>r.pass).length}/${results.length} Prüfungen bestanden.`;
document.documentElement.dataset.testsComplete='true';document.documentElement.dataset.failures=String(results.filter(r=>!r.pass).length);
