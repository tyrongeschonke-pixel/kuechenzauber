import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canonicalIngredient,parseIngredientInput,ingredientMatches,rankRecipes,analyzeRecipe,validRecipe,validateBackup,mergeShoppingItems,DAY} from '../core.mjs';
const make=(id,title,texts,tags=['Pasta'])=>({id:`wb-${id}`,title,pageTitle:`Kochbuch/ ${title}`,sourceUrl:`https://de.wikibooks.org/wiki/Kochbuch/${title}`,revisionId:123,revisionUrl:'https://de.wikibooks.org/w/index.php?oldid=123',historyUrl:'https://de.wikibooks.org/w/index.php?action=history',license:{name:'CC BY-SA 4.0',url:'https://creativecommons.org/licenses/by-sa/4.0/'},ingredients:texts.map(text=>({text})),steps:['Zutaten vorbereiten und nach Originalanleitung zubereiten.'],servings:null,minutes:null,tags,updatedAt:'2026-10-12T10:00:00Z'});
const now=Date.parse('2026-10-12T12:00:00Z');
test('German ingredient duplicates and aliases',()=>{
  assert.equal(canonicalIngredient('Möhren'),canonicalIngredient('Karotten'));
  assert.deepEqual(parseIngredientInput('Tomaten, tomaten; Eier\nKarotten, Möhren',['Tomate']),['Eier','Karotten']);
  assert.equal(canonicalIngredient('Olivenöl'),'ol');
});
test('ingredient word boundaries, alternatives, and combined requirements',()=>{
  assert.equal(ingredientMatches('2 Eier',['Eier']),true);
  assert.equal(ingredientMatches('Tomatenmark',['Tomaten']),false);
  assert.equal(ingredientMatches('1 EL Öl oder Butter',['Butter']),true);
  assert.equal(ingredientMatches('Salz und Pfeffer',['Salz']),false);
  assert.equal(ingredientMatches('Salz und Pfeffer',['Salz','Pfeffer']),true);
  assert.equal(ingredientMatches('100 g Rucola',['Rucola']),true);
});
test('availability takes priority over taste, no salt-only recommendations',()=>{
  const a=make(1,'Mehr vorhanden',['Tomaten','Nudeln'],['Gemüse']);
  const b=make(2,'Lieblingsgericht',['Tomaten','Sahne','Salz'],['Pasta']);
  const c=make(3,'Nur Salz',['Huhn','Salz'],['Pasta']);
  const history=[{recipeId:'wb-99',cookedAt:new Date(now-30*DAY).toISOString(),tags:['Pasta']}];
  assert.deepEqual(rankRecipes([b,c,a],['Tomaten','Nudeln','Salz'],history,[],now).map(x=>x.recipe.id),['wb-1','wb-2']);
});
test('taste breaks equal matches, recent recipes excluded for 14 days',()=>{
  const a=make(1,'A Gericht',['Tomaten','Nudeln'],['Gemüse']);
  const b=make(2,'B Gericht',['Tomaten','Nudeln'],['Pasta']);
  const history=[{recipeId:'wb-9',cookedAt:new Date(now-20*DAY).toISOString(),tags:['Pasta']}];
  assert.equal(rankRecipes([a,b],['Tomaten'],history,[],now)[0].recipe.id,'wb-2');
  history.push({recipeId:b.id,cookedAt:new Date(now-DAY).toISOString(),tags:b.tags});
  assert.deepEqual(rankRecipes([a,b],['Tomaten'],history,[],now).map(x=>x.recipe.id),['wb-1']);
  assert.equal(rankRecipes([a,b],['Tomaten'],history,[],now,true).length,2);
  assert.equal(rankRecipes([b],['Tomaten'],[{recipeId:b.id,cookedAt:new Date(now-14*DAY).toISOString(),tags:[]}],[],now).length,1);
});
test('seen list supports exhausted and explicitly restarted rounds',()=>{
  const recipes=[make(1,'A',['Tomaten']),make(2,'B',['Tomaten']),make(3,'C',['Tomaten']),make(4,'D',['Tomaten'])];
  const first=rankRecipes(recipes,['Tomaten'],[],[],now).slice(0,3);
  const next=rankRecipes(recipes,['Tomaten'],[],first.map(x=>x.recipe.id),now);
  assert.equal(next.length,1);
  assert.equal(rankRecipes(recipes,['Tomaten'],[],recipes.map(x=>x.id),now).length,0);
  assert.equal(rankRecipes(recipes,['Tomaten'],[],[],now).length,4);
});
test('backups are validated completely before replacing existing data',()=>{
  const recipe=make(1,'Pasta',['Tomaten','Nudeln']);
  const backup={app:'kuechenzauber',version:1,state:{pantry:['Tomaten','tomate'],history:[]},recipes:[recipe]};
  assert.deepEqual(validateBackup(backup,[recipe]).state.pantry,['Tomaten']);
  assert.throws(()=>validateBackup({...backup,recipes:[{...recipe,steps:[]}]},[recipe]));
  assert.throws(()=>validateBackup({...backup,state:{pantry:['Tomaten'],history:[{entryId:'a',recipeId:recipe.id,title:'Pasta',cookedAt:'invalid',tags:[]}]}},[recipe]));
  assert.equal(validRecipe({...recipe,sourceUrl:'javascript:alert(1)'}),false);
});
test('shipped recipe corpus is complete, unique, attributed and sizeable',()=>{
  const data=JSON.parse(readFileSync(new URL('../recipes.json',import.meta.url),'utf8'));
  assert.equal(data.version,1);assert.ok(data.recipes.length>=100);
  assert.equal(new Set(data.recipes.map(r=>r.id)).size,data.recipes.length);
  for(const r of data.recipes){assert.ok(validRecipe(r),r.title);assert.ok(r.ingredients.length>=2,r.title);assert.ok(r.steps.join(' ').length>=100,r.title);assert.ok(Number.isFinite(Date.parse(r.updatedAt)),r.title);}
});
test('shopping keeps original quantities and manual single entries, deduplicates exact text',()=>{
  let id=0;const ids=()=>`test-${++id}`;
  const first=mergeShoppingItems([],['2 Eier','4 Eier','Tomaten, reif'],'Testgericht',ids);
  assert.deepEqual(first.items.map(item=>item.text),['2 Eier','4 Eier','Tomaten, reif']);
  const second=mergeShoppingItems(first.items,['  2   eier  ','1 Liter Milch'],null,ids);
  assert.equal(second.added,1);assert.equal(second.items.length,4);assert.equal(first.items.length,3);
  assert.equal(second.items[0].text,'2 Eier');assert.equal(second.items[0].recipeTitle,'Testgericht');
});
test('adding a bought shopping item makes it open again without duplicate or lost quantity',()=>{
  const existing=[{id:'a',text:'2 Eier',done:true,recipeTitle:'Omelett'}];
  const merged=mergeShoppingItems(existing,['2 Eier']);
  assert.equal(merged.items.length,1);assert.equal(merged.items[0].id,'a');assert.equal(merged.items[0].done,false);assert.equal(merged.reactivated,1);assert.equal(existing[0].done,true);
});
test('only missing recipe ingredients go to shopping, pantry is preserved',()=>{
  const recipe=make(1,'Eierpfanne',['2 Eier','1 Zwiebel','1 EL Öl']);
  const pantry=['Eier'];
  const result=mergeShoppingItems([],analyzeRecipe(recipe,pantry).missing.map(item=>item.text),recipe.title);
  assert.deepEqual(result.items.map(item=>item.text),['1 Zwiebel','1 EL Öl']);assert.deepEqual(pantry,['Eier']);
});
test('legacy backups migrate to empty shopping without losing pantry or history',()=>{
  const recipe=make(1,'Pasta',['Tomaten','Nudeln']);
  const backup={app:'kuechenzauber',version:1,state:{pantry:['Tomaten'],history:[]},recipes:[recipe]};
  const checked=validateBackup(backup,[recipe]);assert.deepEqual(checked.state.shopping,[]);assert.deepEqual(checked.state.pantry,['Tomaten']);
});
test('version 2 backup preserves shopping state and rejects malformed lists',()=>{
  const recipe=make(1,'Pasta',['Tomaten','Nudeln']);
  const shopping=[{id:'test-item',text:'500 g Nudeln',done:true,recipeTitle:'Pasta'}];
  const backup={app:'kuechenzauber',version:2,state:{pantry:[],history:[],shopping},recipes:[recipe]};
  assert.deepEqual(validateBackup(backup,[recipe]).state.shopping,shopping);
  assert.throws(()=>validateBackup({...backup,state:{...backup.state,shopping:[{...shopping[0],done:'yes'}]}},[recipe]));
  assert.throws(()=>validateBackup({...backup,state:{pantry:[],history:[]}},[recipe]));
  assert.deepEqual(backup.state.shopping,shopping);
});
