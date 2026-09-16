const CACHE_NAME="money-rule-app-v49";
const APP_SHELL=["./","./index.html","./style.css?v=49","./app.js?v=49","./manifest.json"];
const APP_PATH=new URL("./",self.location.href).pathname;
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL.map(url=>new Request(url,{cache:"reload"})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>/^money-rule-app-v\d/.test(key)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(APP_PATH))return;
  event.respondWith(fetch(new Request(event.request,{cache:"no-store"})).then(response=>{
    if(!response.ok)throw new Error("Network response unavailable");
    const copy=response.clone();event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)));
    return response;
  }).catch(async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(event.request);
    if(cached)return cached;
    if(event.request.mode==="navigate")return (await cache.match("./index.html"))||Response.error();
    return Response.error();
  }));
});
