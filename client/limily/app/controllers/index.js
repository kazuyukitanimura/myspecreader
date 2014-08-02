var getRecommends = require('getRecommends');
var postRecommends = require('postRecommends');
var authUrl = gBaseUrl + '/auth';
var index = $.index;
index.needAuth = true;

var db = Ti.Database.open(DB); // sqlite setup http://www.sqlite.org/pragma.html
db.execute('PRAGMA journal_mode = WAL');
db.execute('PRAGMA synchronous = 0');
db.execute('PRAGMA locking_mode = EXCLUSIVE');
db.execute('PRAGMA read_uncommitted = 0');
db.close();

var rotate = Ti.UI.create2DMatrix().rotate(90);
var counterRotate = rotate.rotate( - 180);
var max = Math.max;
var min = Math.min;
var pWidth = Ti.Platform.displayCaps.platformWidth;
var pHeight = Ti.Platform.displayCaps.platformHeight;
var scrollView = Ti.UI.createScrollableView({
  showPagingControl: false,
  cacheSize: 1,
  height: max(pWidth, pHeight),
  width: max(pWidth, pHeight),
  top: '14dp',
  transform: rotate
});
var backgroundImages = { // key: height, val: filename
  480: 'Default.png',
  768: 'Default-Landscape.png',
  960: 'Default@2x.png',
  1024: 'Default-Portrait.png',
  1136: 'Default-568h@2x.png',
  1536: 'Default-Landscape@2x.png',
  2048: 'Default-Portrait@2x.png'
  // TODO add Android backgroundImage
};

var learnMore = Alloy.createController('learnMore').getView();

var allRead = Ti.UI.createLabel({
  width: Ti.UI.FILL,
  height: Ti.UI.FILL,
  font: {
    fontFamily: 'Simple-Line-Icons',
    fontSize: '20dp'
  },
  text: 'Communicating with the server...\n\nIt may take a few minutes.\n\n\ue06b \ue077 \ue083',
  color: '#FFF',
  textAlign: 'center',
  opacity: 0.7,
  backgroundColor: '#1F1F21',
});

var noMoreStars = Ti.UI.createLabel({
  width: Ti.UI.FILL,
  height: Ti.UI.FILL,
  font: {
    fontFamily: 'Simple-Line-Icons',
    fontSize: '20dp'
  },
  text: 'No more starred articles...\n\n\ue06b \ue077 \ue083',
  color: '#FFF',
  textAlign: 'center',
  opacity: 0.7,
  backgroundColor: '#1F1F21',
  transform: counterRotate
});

var menuIcon = Alloy.createController('menuIcon', {
  currentWindow: index
}).getView();
var homeIcon = Alloy.createController('homeIcon', {
  currentWindow: index
}).getView();

var setBackground = function() {
  index.setBackgroundImage(backgroundImages[Ti.Platform.displayCaps.platformHeight] || 'Default.png');
};
setBackground();

var FIRST_TIME = 'firstTime';
var MAX_NEXT_VIEWS = 4; // including the current page
var MAX_PREV_VIEWS = 2; // without the current page
var client = Ti.Network.createHTTPClient({ // cookies should be manually managed for Android
  autoRedirect: false,
  // timeout in milliseconds
  timeout: 1000,
  enableKeepAlive: true
});
client.ping = function(delay) {
  this.open('HEAD', authUrl); // Prepare the connection.
  if (delay) {
    setTimeout(this.send, delay);
  } else {
    this.send(); // Send the request.
  }
};
client.ping();
var intervalId = 0;
client.setOnload(function() { // on success
  //Ti.API.debug("headers: " + JSON.stringify(this.getResponseHeaders()));
  setBackground();
  index.removeAllChildren();
  var resLocation = this.getResponseHeader('Location');
  if (this.status === 302 && resLocation !== '/') {
    var loginButton = Alloy.createController('loginButton', {
      resLocation: resLocation,
      currentWindow: index
    }).getView();
    index.add(loginButton);
    index.add(learnMore);
  } else {
    index.add(scrollView);
    index.add(menuIcon);
    index.add(homeIcon);
    index.needAuth = false;
    index.fireEvent('openRows');
    Ti.App.Properties.setBool(FIRST_TIME, false);
    // setup background jobs
    var bgOptions = {
      url: 'getRecommends.js'
    };
    if (OS_ANDROID) {
      // TODO debug this
      var intent = Ti.Android.createServiceIntent(bgOptions);
      intent.putExtra('interval', 10 * 60 * 1000); // every 10 min
      var service = Ti.Android.createService(intent);
      service.start();
    } else {
      if (OS_IOS) {
        //Ti.App.iOS.registerBackgroundService(bgOptions);
        // HACK
        // fake the background job to run setInterval, once background service gets awake
        // the setInterval of this (foreground) context also gets awake and executed
        // so that require('getRecommends'); can access global Alloy
        Ti.App.iOS.registerBackgroundService({
          url: 'fake.js'
        });
      }
      getRecommends();
      clearInterval(intervalId);
      intervalId = setInterval(getRecommends, 10 * 60 * 1000); // every 10 min
      //intervalId = setInterval(getRecommends, 5 * 1000); // for test
    }
  }
});

client.setOnerror(function(e) { // on error including a timeout
  Ti.API.debug(e.error);
  client.timeout = min(client.timeout * 2, 32 * 1000); // Max 32sec
  if (Ti.Network.online) {
    //Titanium.UI.createAlertDialog({
    //  title: 'There was a network issue',
    //  message: 'Limily will automatically retry later.'
    //}).show();
  } else {
    Titanium.UI.createAlertDialog({
      title: 'Your device is offline',
      message: 'You can still read pre-loaded articles'
    }).show();
  }
  index.removeAllChildren();
  index.add(scrollView);
  index.add(menuIcon);
  index.add(homeIcon);
  index.fireEvent('openRows');
});

var currentPage = max(scrollView.currentPage, 0); // the currentPage can be -1
var noNewsAvail = 3;
index.addEventListener('openRows', _.debounce(function(e) {
  Ti.API.debug('openRows');
  var i = 0;
  scrollView.stars = e.stars;
  var views = scrollView.views || [];
  if (views.length && ! views[0].sections[0].items.length) {
    scrollView.shiftView();
    views = scrollView.views || [];
  }
  var nextPage = e.currentPage || currentPage;
  var offset = views.length - nextPage;
  db = Ti.Database.open(DB);
  db.execute('BEGIN EXCLUSIVE');
  if (nextPage > currentPage && ! e.stars) { // if scrolling down
    for (i = min(MAX_PREV_VIEWS, nextPage) - 1; i < nextPage; i++) {
      views[i].markAsRead(db);
    }
    while (nextPage > MAX_PREV_VIEWS) {
      nextPage -= 1;
      var view = views[0];
      view.fireEvent('free', e);
      view = null;
      scrollView.shiftView();
    }
    postRecommends(index);
  }
  currentPage = nextPage;
  for (i = offset; i < MAX_NEXT_VIEWS; i++) {
    var rows = Alloy.createController('rows', {
      currentWindow: index,
      page: i,
      stars: e.stars,
      db: db
    }).getView();
    rows.setTransform(counterRotate);
    if (!rows.sections.length || ! rows.sections[0].items.length) {
      if (i === 0) {
        scrollView.addView(rows);
        if (e.stars) {
          index.add(noMoreStars);
        }
      }
      if (i < 2 && ! e.stars) {
        index.add(allRead);
        index.needAuth = true;
      }
      break;
    }
    scrollView.addView(rows);
  }
  db.execute('COMMIT');
  db.close();
  if (Ti.Network.online && index.needAuth) {
    if (!(--noNewsAvail)) {
      Titanium.UI.createAlertDialog({
        title: 'No news seems to be available on Feedly',
        message: 'Please try later'
      }).show();
    }
    client.ping(8 * 1000);
    return;
  } else if (!Ti.Network.online && Ti.App.Properties.getBool(FIRST_TIME, true)) {
    Titanium.UI.createAlertDialog({
      title: 'Welcome, but Limily needs the network for the first time',
      message: 'Apologies. Limily failed getting online. Please check your Wifi / carrier signal. Also please make sure enabling your data network device settings.'
    }).show();
    setBackground();
    client.ping(16 * 1000);
    return;
  } else {
    noNewsAvail = 3;
  }
},
1024, true));

scrollView.addEventListener('scrollend', function(e) {
  e.stars = scrollView.stars;
  index.fireEvent('openRows', e);
});

index.unloadViews = function() {
  var views = scrollView.views || [];
  for (var i = views.length; i--;) {
    var view = views[i];
    view.fireEvent('free');
    scrollView.removeView(i);
    view = null;
  }
  currentPage = scrollView.currentPage = 0;
  postRecommends(index);
};

if (Alloy.isTablet) {
  var oldOrientation = index.orientation;
  index.orientationModes = [Ti.UI.LANDSCAPE_LEFT, Ti.UI.LANDSCAPE_RIGHT, Ti.UI.PORTRAIT, Ti.UI.UPSIDE_PORTRAIT];
  // Handling Orientation Changes
  Ti.Gesture.addEventListener('orientationchange', function(e) {
    if (oldOrientation !== index.orientation) {
      oldOrientation = index.orientation;
      setBackground();
      index.unloadViews();
      e.stars = scrollView.stars;
      index.fireEvent('openRows', e);
    }
  });
}

index.addEventListener('loggedin', function(e) {
  client.ping();
});

index.open();
index.addEventListener("close", function() {
  Ti.API.debug('index close');
  //index = null; // index has to be allways here, do not assgin null
  $.destroy();
});
