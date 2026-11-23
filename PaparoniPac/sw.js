const CACHE='paparonipac-v131';
const FILES=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icons/paparoni-icon.svg',
  './icons/paparoni-home.png',
  './icons/paparoni-character.svg',
  './icons/paparoni-character.png',
  './icons/paparoni-512.png',
  './icons/paparoni-character.png?v=17',
  './icons/paparoni-home.png?v=17',
  './icons/paparoni-icon.svg?v=17',
  './assets/PaparoniPac_Soundteppich_24s_Stil.wav'
];
self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(FILES))
      .then(()=>self.skipWaiting())
  );
});
self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const isDocument=request.mode==='navigate'||url.pathname.endsWith('/index.html');
  event.respondWith((async()=>{
    try{
      // HTML must bypass the browser HTTP cache: installed iOS PWAs can otherwise
      // boot an old document even after the new service worker has activated.
      const networkRequest=isDocument?new Request(request,{cache:'no-store'}):request;
      const response=await fetch(networkRequest);
      if(response.ok){
        const cache=await caches.open(CACHE);
        await cache.put(request,response.clone());
      }
      return response;
    }catch(error){
      const cached=await caches.match(request);
      if(cached)return cached;
      if(isDocument){
        const offline=await caches.match('./index.html');
        if(offline)return offline;
      }
      return new Response('Offline', {status:503,statusText:'Offline'});
    }
  })());
});
