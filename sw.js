const CACHE='setka-__BUILD_VERSION__';
const FILES=__BUILD_FILES__;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('setka-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  const url=new URL(event.request.url);
  // A cached catalog must never masquerade as a fresh source check.
  if(url.pathname.endsWith('/data/catalog.json')){event.respondWith(fetch(event.request));return;}
  event.respondWith(fetch(event.request).catch(async()=>{
    const cached=await caches.match(event.request,{ignoreSearch:true});
    return cached||(event.request.mode==='navigate'?await caches.match(new URL('./',self.registration.scope)):new Response('Offline',{status:503}));
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const data=event.notification.data||{};
  event.waitUntil((async()=>{const windows=await clients.matchAll({type:'window',includeUncontrolled:true});const existing=windows.find(w=>w.url.startsWith(self.registration.scope));if(existing){await existing.focus();existing.postMessage({type:'notification-open',...data});}else{const url=new URL('./',self.registration.scope);url.searchParams.set('view',data.view||'today');if(data.date)url.searchParams.set('date',data.date);await clients.openWindow(url.href);}})());
});
