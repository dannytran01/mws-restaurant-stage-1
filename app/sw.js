const STATIC_CACHE = 'mws-restaurant-v1';
const MAP_CACHE = 'mws-google-v1';
const PHOTO_CACHE = 'mws-content-imgs';

//Prod files
const staticUrls = [
    '/',
    'restaurant.html',
    'scripts/all_restaurant.js',
    'scripts/all_main.js',
    'styles/main.css'
];

// dev files
// const staticUrls = [
//   '/',
//   '/restaurant.html',
//   'dbhelper.js',
//   'idb.js',
//   'main.js',
//   'restaurant_info.js',
//   'main.css',
//   'details.css'
// ];

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

  //Handle fetching restaurant info when query is present otherwise
  //cache won't detect '/restaurant.html' file.
  if (requestUrl.pathname.startsWith('/restaurant.html')) {
    event.respondWith(    
      caches.match('/restaurant.html')
      .then(response => {
        if(response !== undefined){
          return response;
        } 
        console.log(requestUrl.pathname);
        return fetch('/restaurant.html');
    }));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if(response !== undefined){
          return response;
        }
        console.log(requestUrl.pathname);
        return fetch(event.request)
        .catch(err => {return err;});
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



