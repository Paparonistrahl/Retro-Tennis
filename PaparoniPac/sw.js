const CACHE='paparonipac-v146';
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
  // iOS Safari may request WAV audio as byte ranges. Never cache a 206 response
  // as if it were the complete soundtrack; serve ranges from the precached full WAV.
  if(url.pathname.endsWith('.wav')&&request.headers.has('range')){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const fullUrl=new URL('./assets/PaparoniPac_Soundteppich_24s_Stil.wav',self.registration.scope).href;
      const full=await cache.match(fullUrl);
      if(full){
        const bytes=await full.arrayBuffer(),size=bytes.byteLength;
        const match=request.headers.get('range').match(/^bytes=(\d*)-(\d*)$/);
        if(!match)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
        let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
        let end=match[2]&&match[1]?Math.min(Number(match[2]),size-1):match[1]?size-1:size-1;
        if(!match[1]&&match[2])end=size-1;
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
        const headers=new Headers(full.headers);
        headers.set('Accept-Ranges','bytes');headers.set('Content-Range','bytes '+start+'-'+end+'/'+size);headers.set('Content-Length',String(end-start+1));
        if(!headers.has('Content-Type'))headers.set('Content-Type','audio/wav');
        return new Response(bytes.slice(start,end+1),{status:206,statusText:'Partial Content',headers});
      }
      try{return await fetch(request)}catch(error){return new Response('Audio unavailable offline',{status:503,statusText:'Offline'})}
    })());
    return;
  }
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
