// Pure matching and validation logic shared by the app and its tests.
export const DAY = 86400000;
export const ALIASES = {
  kartoffel: ['kartoffeln', 'kartoffel'], tomate: ['tomaten', 'tomate'], zwiebel: ['zwiebeln', 'zwiebel'],
  knoblauch: ['knoblauchzehen', 'knoblauchzehe', 'knoblauch'], karotte: ['karotten', 'karotte', 'mohren', 'mohre'],
  zucchini: ['zucchini', 'zucchinis'], paprika: ['paprikaschoten', 'paprikaschote', 'paprika'],
  ei: ['huhnereier', 'huhnerei', 'eier', 'ei'], reis: ['basmatireis', 'langkornreis', 'risottoreis', 'reis'],
  nudel: ['spaghetti', 'tagliatelle', 'penne', 'fusilli', 'bandnudeln', 'nudeln', 'nudel', 'pasta', 'makkaroni'],
  milch: ['vollmilch', 'milch'], butter: ['butter'], mehl: ['weizenmehl', 'mehl'],
  sahne: ['schlagsahne', 'sahne', 'rahm'], kase: ['reibekase', 'geriebener kase', 'kase'],
  parmesan: ['parmesan', 'parmigiano'], feta: ['fetakase', 'feta', 'schafskase'], mozzarella: ['mozzarella'],
  quark: ['magerquark', 'quark'], joghurt: ['naturjoghurt', 'joghurt', 'jogurt'],
  brokkoli: ['brokkoli', 'broccoli'], blumenkohl: ['blumenkohl'], spinat: ['blattspinat', 'spinat'],
  champignon: ['champignons', 'champignon'], pilz: ['pilze', 'pilz'], lauch: ['lauch', 'porree'],
  sellerie: ['knollensellerie', 'staudensellerie', 'sellerie'], gurke: ['salatgurke', 'gurken', 'gurke'],
  erbsen: ['erbsen'], bohne: ['bohnen', 'bohne'], linsen: ['linsen'], kichererbse: ['kichererbsen', 'kichererbse'],
  aubergine: ['auberginen', 'aubergine'], kohl: ['weisskohl', 'weisskraut', 'kohl'],
  kurbis: ['hokkaido', 'kurbis'], apfel: ['apfel', 'apfeln'], banane: ['bananen', 'banane'],
  zitrone: ['zitronensaft', 'zitronen', 'zitrone'], orange: ['orangensaft', 'orangen', 'orange'],
  hafer: ['haferflocken', 'hafer'], brot: ['toastbrot', 'brot'], brotchen: ['brotchen', 'semmeln'],
  hackfleisch: ['rinderhack', 'rinderhackfleisch', 'hackfleisch', 'gehacktes'],
  huhn: ['hahnchenbrust', 'hahnchenbrustfilet', 'huhnerbrust', 'hahnchen', 'huhn', 'huhnerfleisch'],
  rind: ['rindfleisch', 'rind'], schwein: ['schweinefleisch', 'schweineschnitzel'],
  speck: ['bauchspeck', 'speck', 'bacon'], schinken: ['kochschinken', 'schinken'],
  lachs: ['lachsfilet', 'lachs'], thunfisch: ['thunfisch'], tofu: ['tofu'],
  ol: ['olivenol', 'sonnenblumenol', 'rapsol', 'pflanzenol', 'speiseol', 'ol'],
  salz: ['meersalz', 'salz'], pfeffer: ['pfeffer'], wasser: ['wasser'],
  zucker: ['kristallzucker', 'zucker'], puderzucker: ['puderzucker'], honig: ['honig'],
  backpulver: ['backpulver'], hefe: ['trockenhefe', 'hefe'], essig: ['weissweinessig', 'weinessig', 'essig'],
  bruhe: ['gemusebruhe', 'huhnerbruhe', 'fleischbruhe', 'bruhe', 'bouillon'],
  tomatenmark: ['tomatenmark'], tomatenkonserve: ['passierte tomaten', 'dosentomaten', 'gehackte tomaten'],
  petersilie: ['petersilie'], basilikum: ['basilikum'], oregano: ['oregano'], thymian: ['thymian'],
  rosmarin: ['rosmarin'], muskat: ['muskatnuss', 'muskat'], zimt: ['zimt'],
  chili: ['chilischoten', 'chilischote', 'chili'], ingwer: ['ingwer'], senf: ['senf'],
};
export function normalize(value) {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
const escapeRE = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const aliasEntries = Object.entries(ALIASES).flatMap(([key, words]) => words.map(word => ({ key, word }))).sort((a,b) => b.word.length - a.word.length);
const aliasKeys = new Map(aliasEntries.map(({key,word})=>[word,key]));
const aliasPattern = new RegExp(`(?:^| )(${aliasEntries.map(({word})=>escapeRE(word)).join('|')})(?= |$)`,'g');
const termCache=new Map();
export function ingredientTerms(value) {
  const normalized=normalize(value);
  if(termCache.has(normalized))return termCache.get(normalized);
  const terms=[...new Set([...normalized.matchAll(aliasPattern)].map(match=>aliasKeys.get(match[1])))];
  if(termCache.size>10000)termCache.clear();
  termCache.set(normalized,terms);
  return terms;
}
export function canonicalIngredient(value) {
  const words = ingredientTerms(value);
  return words.length === 1 ? words[0] : normalize(value);
}
export function parseIngredientInput(value, existing = []) {
  const known = new Set(existing.map(item => canonicalIngredient(item)));
  const result = [];
  for (const item of String(value).split(/[,;\n]+/).map(v => v.trim()).filter(Boolean)) {
    const name = item.replace(/\s+/g, ' ').slice(0, 80);
    const key = canonicalIngredient(name);
    if (key && !known.has(key)) { known.add(key); result.push(name); }
  }
  return result;
}
export function ingredientMatches(text, pantry) {
  const keys = new Set(pantry.map(canonicalIngredient));
  const terms = ingredientTerms(text);
  if (terms.length) return /\b(oder|wahlweise)\b/i.test(text) ? terms.some(t => keys.has(t)) : terms.every(t => keys.has(t));
  const normalizedText = ` ${normalize(text)} `;
  return pantry.some(item => { const phrase = normalize(item); return phrase.length > 1 && normalizedText.includes(` ${phrase} `); });
}
export function analyzeRecipe(recipe, pantry) {
  const matched = recipe.ingredients.filter(item => ingredientMatches(item.text, pantry));
  const missing = recipe.ingredients.filter(item => !ingredientMatches(item.text, pantry));
  const useful = matched.some(item => ingredientTerms(item.text).some(key => !['salz', 'pfeffer', 'wasser'].includes(key))) || matched.some(item => !ingredientTerms(item.text).length);
  return {matched, missing, coverage: matched.length / recipe.ingredients.length, useful};
}
export function rankRecipes(recipes, pantry, history = [], seen = [], now = Date.now(), includeRecent = false) {
  if (!pantry.length) return [];
  const excluded = new Set(seen);
  const recent = new Set(history.filter(entry => now - Date.parse(entry.cookedAt) < 14 * DAY).map(entry => entry.recipeId));
  const tagCounts = new Map();
  for (const entry of history) for (const tag of entry.tags || []) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  return recipes.filter(recipe => !excluded.has(recipe.id) && (includeRecent || !recent.has(recipe.id)))
    .map(recipe => ({recipe, ...analyzeRecipe(recipe, pantry), affinity: recipe.tags.reduce((sum,tag) => sum + (tagCounts.get(tag)||0),0)}))
    .filter(item => item.matched.length > 0 && item.useful)
    .sort((a,b) => b.coverage - a.coverage || b.matched.length - a.matched.length || b.affinity - a.affinity || a.recipe.title.localeCompare(b.recipe.title, 'de'));
}
const shortString = (value, max = 1000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export function mergeShoppingItems(existing, texts, recipeTitle=null, makeId=()=>crypto.randomUUID()) {
  const items=existing.map(item=>({...item}));
  let added=0,reactivated=0;
  for(const value of texts) {
    const text=String(value).replace(/\s+/g,' ').trim();
    if(!text)continue;
    if(text.length>2000)throw new Error('Ein Einkaufslisteneintrag darf höchstens 2000 Zeichen lang sein.');
    const found=items.find(item=>normalize(item.text)===normalize(text));
    if(found){if(found.done){found.done=false;reactivated++;}continue;}
    if(items.length>=500)throw new Error('Deine Einkaufsliste ist voll. Bitte zuerst Einträge entfernen.');
    items.push({id:makeId(),text,done:false,recipeTitle});added++;
  }
  return {items,added,reactivated};
}
export function validShoppingList(items) {
  return Array.isArray(items)&&items.length<=500&&items.every(item=>item&&shortString(item.id,100)&&shortString(item.text,2000)&&typeof item.done==='boolean'&&(item.recipeTitle===null||item.recipeTitle===undefined||shortString(item.recipeTitle,200)))&&new Set(items.map(item=>item.id)).size===items.length;
}
export function validRecipe(recipe) {
  if (!recipe || !/^wb-\d+$/.test(recipe.id) || !shortString(recipe.title,200) || !shortString(recipe.pageTitle,300)) return false;
  if (!Number.isInteger(recipe.revisionId) || recipe.revisionId <= 0) return false;
  for (const field of ['sourceUrl','revisionUrl','historyUrl']) {
    try { const url = new URL(recipe[field]); if (url.protocol !== 'https:' || url.hostname !== 'de.wikibooks.org') return false; } catch { return false; }
  }
  return Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && recipe.ingredients.length <= 100 && recipe.ingredients.every(item => shortString(item?.text,2000))
    && Array.isArray(recipe.steps) && recipe.steps.length > 0 && recipe.steps.length <= 200 && recipe.steps.every(item => shortString(item,12000))
    && Array.isArray(recipe.tags) && recipe.tags.length <= 30 && recipe.tags.every(tag => shortString(tag,100))
    && (recipe.ingredientNotes === undefined || Array.isArray(recipe.ingredientNotes) && recipe.ingredientNotes.length <= 50 && recipe.ingredientNotes.every(note => shortString(note,12000)))
    && shortString(recipe.updatedAt,100) && Number.isFinite(Date.parse(recipe.updatedAt))
    && recipe.license?.url === 'https://creativecommons.org/licenses/by-sa/4.0/' && shortString(recipe.license?.name,100)
    && (recipe.servings === null || shortString(recipe.servings,200))
    && (recipe.minutes === null || Number.isFinite(recipe.minutes) && recipe.minutes > 0 && recipe.minutes <= 2880);
}
export function validateBackup(data, knownRecipes) {
  if (!data || data.app !== 'kuechenzauber' || ![1,2].includes(data.version) || !data.state || !Array.isArray(data.state.pantry) || !Array.isArray(data.state.history)) throw new Error('Diese Datei ist keine gültige Küchenzauber-Sicherung.');
  const {pantry,history} = data.state;
  const shopping=data.state.shopping===undefined&&data.version===1?[]:data.state.shopping;
  if(!validShoppingList(shopping))throw new Error('Die Einkaufsliste in dieser Sicherung ist ungültig.');
  if (pantry.length > 200 || !pantry.every(item => shortString(item,80)) || history.length > 5000) throw new Error('Die Sicherung enthält ungültige oder zu viele Einträge.');
  if (!history.every(entry => entry && shortString(entry.entryId,100) && /^wb-\d+$/.test(entry.recipeId) && shortString(entry.title,200) && Number.isFinite(Date.parse(entry.cookedAt)) && Date.parse(entry.cookedAt) <= Date.now()+DAY && Array.isArray(entry.tags) && entry.tags.length <= 30 && entry.tags.every(tag => shortString(tag,100)))) throw new Error('Die Kochhistorie in dieser Datei ist ungültig.');
  if (data.recipes !== undefined && (!Array.isArray(data.recipes) || data.recipes.length > 2000 || !data.recipes.every(validRecipe))) throw new Error('Die Rezepte in dieser Sicherung sind unvollständig.');
  const recipes = data.recipes || knownRecipes;
  if (!recipes.length || new Set(recipes.map(r => r.id)).size !== recipes.length) throw new Error('Die Rezeptliste ist ungültig.');
  if (new Set(history.map(e => e.entryId)).size !== history.length) throw new Error('Die Sicherung enthält doppelte Historieneinträge.');
  return {state:{pantry:parseIngredientInput(pantry.join('\n')), history:history.map(e => ({entryId:e.entryId,recipeId:e.recipeId,title:e.title,tags:[...e.tags],cookedAt:e.cookedAt})),shopping:shopping.map(item=>({id:item.id,text:item.text,done:item.done,recipeTitle:item.recipeTitle??null})),seen:[],includeRecent:false}, recipes};
}
