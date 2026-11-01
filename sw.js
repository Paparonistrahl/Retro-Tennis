const CACHE="paparoni-retro-v3";
const FILES=["./","./index.html","./manifest.webmanifest","./icon.svg","./celebration.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(a=>Promise.all(a.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const url=new URL(e.request.url);
 if(url.origin===location.origin&&(url.pathname.endsWith("/index.html")||url.pathname.endsWith("/"))){
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request)));
 }else{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
 }
});