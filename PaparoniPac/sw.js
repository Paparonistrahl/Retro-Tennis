const CACHE='paparonipac-v51';
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
  if(event.request.method!=='GET')return;
  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      })
      .catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html')))
  );
});
