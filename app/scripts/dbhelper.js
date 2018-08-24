/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DOMAIN_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
  }

  /**
   * Set up IndexedDB if not yet created and open up the object store for access.
   */
  static openDB() {// call this before every idb transaction
    return idb.open('mwsDb', 1, upgradeDB => {
      upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
      upgradeDB.createObjectStore('reviews', {autoIncrement: true}); //note, if you want to auto-increment,
      //do not define a keyPath...
      
      const reviewStore = upgradeDB.transaction.objectStore('reviews');
      reviewStore.createIndex('restaurant_id', 'restaurant_id');
      reviewStore.createIndex('exist_in_server', 'existInServer');
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    fetch(`${DBHelper.DOMAIN_URL}/restaurants`)
        .then(response => response.json())
        .then(json => callback(null, json))
        .catch(err => callback(err, null));
  }

  /**
   * Fetch a restaurants.
   */
  static fetchRestaurantById(id, callback) {
    fetch(`${DBHelper.DOMAIN_URL}/restaurants/${id}`)
        .then(response => response.json())
        .then(json => callback(null, json))
        .catch(err => callback(err, null));
  }

  /**
   * Fetch a restaurant review and mark that they came from the server.
   */
  static fetchRestaurantReviews(id, callback) {
    fetch(`${DBHelper.DOMAIN_URL}/reviews/?restaurant_id=${id}`)
        .then(response => response.json())
        .then(json => {
          json.map(review => review.existInServer = 'Y');
          callback(null, json);
        })
        .catch(err => callback(err, null));
  }

  /**
   * Post a review object {restaurant_id, name, rating, and comments}
   */
  static addReview(reviewObj, callback) {
    fetch(`${DBHelper.DOMAIN_URL}/reviews/`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(reviewObj)
        })
      .then(response => response.json())
      .then(jsonRes => {
        jsonRes.existInServer = 'Y';
        callback(null, jsonRes);
      })
      .catch(err => callback(err, null));
  }

  static createReviewObj(restaurantId, name, rating, comments, existInServer = 'Y') {
    return {'restaurant_id' : restaurantId, 'name': name, 'rating': rating, 'comments' : comments, 'existInServer': existInServer};
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } 
      else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/images/${restaurant.id}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  /**
   * IndexedDB functions
   */

   // Restaurant IndexedDB Funcs

  //Note to self: this is utilizing in-line key 'id', don't put a second arg otherwise it's consider an out-of-line key
  //which means you are specifying the id rather than extracting it "in-line"
  static persistRestaurantInfoToIndexDb(value){
    DBHelper.openDB().then(db => {
      const transaction = db.transaction('restaurants', 'readwrite');
      const reviewsObjStore = transaction.objectStore('restaurants');
      reviewsObjStore.put(value);
    });
   }

  static persistRestaurantsInfoToIndexDb(restaurantArr){
      DBHelper.openDB().then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        const objStore = tx.objectStore('restaurants');
        restaurantArr.map(restaurant => objStore.put(restaurant));
      });
  }

  static fetchRestaurantsFromIndexedDB() {
    return DBHelper.openDB().then(db => {
        return db.transaction('restaurants')
          .objectStore('restaurants').getAll();
    });
  }

  static fetchRestaurantFromIndexedDB(id) {
    return DBHelper.openDB().then(db => {
        return db.transaction('restaurants')
          .objectStore('restaurants').get(id);
    });
  }

  static fetchRestaurantByCuisineAndNeighborhoodFromIndexedDB(cuisine, neighborhood){
    return DBHelper.fetchRestaurantsFromIndexedDB().then(restaurants => {
      let results = restaurants
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      return results;
    });
  }

  // Reviews IndexedDB Funcs 

  static persistReviewsToIndexDb(reviewArr, callback){
      DBHelper.openDB().then(db => {
        const tx = db.transaction('reviews', 'readwrite');
        const reviewsObjStore = tx.objectStore('reviews');

        const reviewMap = new Map(reviewArr.map(review => [review.id, review]));
        const existingReviews = new Map();

        // Due to using autoincrement, we have to use handling update through cursor - hashmap version
        reviewsObjStore.iterateCursor(cursor => {
          if (!cursor) return;

          if (cursor.value.id === undefined && cursor.value.existInServer === 'Y'){ //clean up
            cursor.delete();
          }
          else if (cursor.value.id && reviewMap.has(cursor.value.id)) {
            //Find and add to existing reviews if id is in the DB
            let review = reviewMap.get(cursor.value.id);
            existingReviews.set(cursor.key, review);
            reviewMap.delete(cursor.value.id);
          }
          cursor.continue();
        });

        tx.complete.then(() =>{
          DBHelper.insertReviews(reviewMap, existingReviews, callback);
        });
      });
  }

  //Joint callback method to persistReviewsToIndexDb
  static insertReviews(newReviews, existingReviews, callback){
   DBHelper.openDB().then(db => {
      const tx = db.transaction('reviews', 'readwrite');
      const reviewsObjStore = tx.objectStore('reviews');

      for(var value of newReviews.values()) {
        reviewsObjStore.put(value);
      }

      //update object store reviews
      for(var [key, review] of existingReviews.entries()) {
        reviewsObjStore.put(review, key);
      }
      callback();
    });
  }

  static fetchReviewsFromIndexedDB(id) {
    return DBHelper.openDB().then(db => {
        return db.transaction('reviews')
          .objectStore('reviews')
          .index('restaurant_id')
          .getAll(id);
    });
  }

  static updateAllReviewsNotUpdatedToServer(){
    return Promise.resolve(DBHelper.openDB().then(db => {
      const tx = db.transaction('reviews', 'readwrite');
      const reviewsObjStore = tx.objectStore('reviews');
      let reviewArr = [];

      reviewsObjStore.iterateCursor(cursor => {
          if (!cursor) return;

          if (cursor.value.existInServer && cursor.value.existInServer === 'N') {
            let reviewObj = cursor.value;
            // DBHelper.addReview(reviewObj, (err, response) => {});
            reviewArr.push(reviewObj);
            reviewObj.existInServer = 'Y';
            cursor.update(reviewObj);
          }
          cursor.continue();
      });

      return tx.complete.then(() =>{ return reviewArr});
    }));
  }



}