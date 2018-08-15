let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { 
      console.error(error);
    } 
    else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);

      getReviewDataAndUpdateUI();
    }
  });
}

const slider = document.getElementById('rating');
const ratingVal = document.getElementById('ratingVal');
ratingVal.innerHTML = slider.value;

slider.oninput = function() {
  ratingVal.innerHTML = this.value;
}

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)


    });
  }
}


/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const imgPrefix = DBHelper.imageUrlForRestaurant(restaurant);
  const imgExt = 'jpg';

  const picture = document.getElementById('restaurant-pic');
  const sourceLarge = document.createElement('source');
  sourceLarge.media = '(min-width: 500px)';
  sourceLarge.srcset = `${imgPrefix}_large_2x.${imgExt} 2x, ${imgPrefix}_large_1x.${imgExt} 1x`;

  const sourceMedium = document.createElement('source');
  sourceMedium.media = '(min-width: 300px)';
  sourceMedium.srcset = `${imgPrefix}_medium_2x.${imgExt} 2x, ${imgPrefix}_medium_1x.${imgExt} 1x`;

  const image = document.createElement('img');
  image.id = 'restaurant-img';
  image.alt = `image of the restaurant ${restaurant.name}`;
  image.className = 'restaurant-img';
  image.src = `${imgPrefix}_small.${imgExt}`;

  picture.appendChild(sourceLarge);
  picture.appendChild(sourceMedium);
  picture.appendChild(image);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

const getReviewDataAndUpdateUI = () => {
  DBHelper.fetchResturantReviewsById(self.restaurant.id, (error, reviews) => {
    if(error){
      console.error(error);
    }
    else {
      fillReviewsHTML(reviews);
    }
  });
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews) => {
  const container = document.getElementById('reviews-container');

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }

  const ul = document.getElementById('reviews-list');
  //clean up any existing reviews
  while (ul.firstChild) {
    ul.removeChild(ul.firstChild);
  }

  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = formatDateTime(review.updatedAt);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
* Handle date time conversion to M/DD/YYYY for date input and iso formats
*/
const formatDateTime = (dateTime) => {
  return new Date(dateTime).toLocaleDateString();
}

/**
 * Handle review submission: Collect form data, submit, and update UI.
 */
const submitReview = () => {

  const url = window.location.search;
  const idStr = url.substring(url.indexOf('=') + 1, url.length);
  const id = parseInt(idStr);

  const reviewFormEl = document.getElementById('review-form');

  const name = reviewFormEl.elements['name'].value;
  const rating = reviewFormEl.elements['rating'].value;
  const comments = reviewFormEl.elements['comments'].value;

  //Perform form validation
  if ( !name || !comments) {
    showToast('Please set a username and a comment');
    return;
  }

  //create review and update UI
  const formData = DBHelper.createReviewObj(id, name, rating, comments);

  DBHelper.addReview(formData, (err, response) => {
      if(err){
        showToast(`Error: ${err}`);
      }
      else{
        //Clean up and update UI
        showToast('Successfully Added New Review!');
        reviewFormEl.reset();
        getReviewDataAndUpdateUI();
      }
  });
}

const showToast = (msg) => {
  const toastEl = document.getElementById('toast');
  toastEl.className = 'show';
  toastEl.innerHTML = msg;

  setTimeout( () => { 
    toastEl.className = toastEl.className.replace('show', ''); 
    toastEl.innerHTML = '';
  }, 3000);
}

