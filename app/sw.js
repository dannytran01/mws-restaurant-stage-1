const STATIC_CACHE = 'mws-restaurant-v1';
const MAP_CACHE = 'mws-google-v1';
const PHOTO_CACHE = 'mws-content-imgs';

// const staticUrls = [
//     '/',
//     'restaurant.html',
//     'scripts/all_restaurant.js',
//     'scripts/all_main.js',
//     'styles/main.css'
// ];

const staticUrls = [
  '/',
  'restaurant.html',
  'dbhelper.js',
  'idb.js',
  'main.js',
  'restaurant_info.js',
  'main.css',
  'details.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(staticUrls);
    }));
});


self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.startsWith('/images')){
    event.respondWith(cacheAndServe(event.request, PHOTO_CACHE));
    return;
  }

  if (requestUrl.pathname.startsWith('/maps-api-v3/api/')) {
    event.respondWith(cacheAndServe(event.request, MAP_CACHE));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if(response !== undefined){
          return response;
        }
        console.log(requestUrl.pathname);
        return fetch(event.request);
    })
  );

});

function cacheAndServe(request, cache){
  return caches.open(cache).then(cache => {
    return cache.match(request.url).then(response => {
      if(response){
        return response;
      }

      return fetch(request).then(networkResponse => {
        cache.put(request.url, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}



