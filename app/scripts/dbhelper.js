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
      upgradeDB.createObjectStore('reviews', {keyPath: 'id'});
      
      const reviewStore = upgradeDB.transaction.objectStore('reviews');
      reviewStore.createIndex('restaurant_id', 'restaurant_id');
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
   * Fetch a restaurant review.
   */
  static fetchRestaurantReviews(id, callback) {
    fetch(`${DBHelper.DOMAIN_URL}/reviews/?restaurant_id=${id}`)
        .then(response => response.json())
        .then(json => callback(null, json))
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
      .then(jsonRes => callback(null, jsonRes))
      .catch(err => callback(err, null));
  }

  static createReviewObj(restaurantId, name, rating, comments) {
    return {'restaurant_id' : restaurantId, 'name': name, 'rating': rating, 'comments' : comments};
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
  static persistReviewToIndexDb(value){
    DBHelper.openDB().then(db => {
      const transaction = db.transaction('reviews', 'readwrite');
      const reviewsObjStore = transaction.objectStore('reviews');
      reviewsObjStore.put(value);
    });
   }

  static persistReviewsToIndexDb(reviewArr){
      DBHelper.openDB().then(db => {
        const tx = db.transaction('reviews', 'readwrite');
        const objStore = tx.objectStore('reviews');
        reviewArr.map(review => objStore.put(review));
      });
  }




}
