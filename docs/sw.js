const CACHE='kuechenzauber-20261012-v5';
const ASSETS=['./','./index.html','./style.css','./app.mjs','./core.mjs','./store.mjs','./recipes-api.mjs','./recipes.json','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
const assetPaths=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).pathname));
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try {await cache.addAll(ASSETS);await self.skipWaiting();}catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('kuechenzauber-')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const {request}=event;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{try {const response=await fetch(request);if(response.ok)return response;throw new Error('Nicht erreichbar');}catch{const cached=await caches.match(new URL('./index.html',self.registration.scope));return cached||new Response('Bitte Küchenzauber zuerst mit Internet öffnen.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}})());
    return;
  }
  if(assetPaths.has(url.pathname))event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const key=new Request(url.origin+url.pathname);
    const cached=await cache.match(key);
    if(cached)return cached;
    const response=await fetch(request);
    if(response.ok)await cache.put(key,response.clone());
    return response;
  })());
});
