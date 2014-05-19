var getRecommends = require('getRecommends');
var postRecommends = require('postRecommends');
var authUrl = gBaseUrl + '/auth';
var index = $.index;
index.needAuth = true;

var rotate = Ti.UI.create2DMatrix().rotate(90);
var counterRotate = rotate.rotate( - 180);
var scrollView = Ti.UI.createScrollableView({
  showPagingControl: false,
  height: Ti.Platform.displayCaps.platformHeight,
  width: Ti.Platform.displayCaps.platformHeight,
  top: '14dp',
  transform: rotate
});

var learnMore = Alloy.createController('learnMore').getView();

var allRead = Ti.UI.createLabel({
  width: Ti.UI.FILL,
  height: Ti.UI.FILL,
  text: '\u2714 Analyzing Articles...',
  color: '#1F1f21',
  textAlign: 'center',
  transform: counterRotate
});
allRead.markAsRead = function(){};

var setBackground = function() {
  if ([Ti.UI.LANDSCAPE_LEFT, Ti.UI.LANDSCAPE_RIGHT].indexOf(index.orientation) === - 1) {
    index.setBackgroundImage('Default.png');
  } else {
    index.setBackgroundImage('Default-Landscape.png');
  }
};

var MAX_NEXT_VIEWS = 2; // including the current page
var MAX_PREV_VIEWS = 2; // without the current page

var client = Ti.Network.createHTTPClient({ // cookies should be manually managed for Android
  autoRedirect: false,
  timeout: 1000 // in milliseconds
});
//client.clearCookies(gBaseUrl); // for test
client.open('HEAD', authUrl); // Prepare the connection.
client.send(); // Send the request.
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
    var menuIcon = Alloy.createController('menuIcon', {
      currentWindow: index
    }).getView();
    index.add(menuIcon);
    index.needAuth = false;
    index.fireEvent('openRows');
    Ti.App.Properties.setBool('firstTime', false);
  }
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
});

client.setOnerror(function(e) { // on error including a timeout
  Ti.API.debug(e.error);
  client.timeout = Math.min(client.timeout * 2, 32 * 1000); // Max 32sec
  var firstTime = Ti.App.Properties.getBool('firstTime', true);
  if (firstTime) {
    Titanium.UI.createAlertDialog({
      title: 'Welcome, but Limily needs the network for the first time',
      message: 'Apologies. Limily failed getting online. Please check your Wifi / carrier signal. Also please make sure enabling your data network device settings.',
      exitOnClose: true
    }).show();
    index.close();
    if (OS_ANDROID) {
      Titanium.Android.currentActivity.finish();
    }
    return; // TODO exit the application
  }
  if (Ti.Network.online) {
    index.needAuth = firstTime;
    Titanium.UI.createAlertDialog({
      title: 'There was a network issue',
      message: 'Limily will automatically retry later.'
    }).show();
  } else {
    Titanium.UI.createAlertDialog({
      title: 'Your device is offline',
      message: 'You can still read pre-loaded articles'
    }).show();
  }
  index.fireEvent('openRows');
});

var currentPage = Math.max(scrollView.currentPage, 0); // the currentPage can be -1
index.addEventListener('openRows', function(e) {
  Ti.API.debug('openRows');
  var i = 0;
  var views = scrollView.views || [];
  var nextPage = e.currentPage || currentPage;
  var offset = views.length - nextPage;
  if (nextPage > currentPage && !e.stars) { // if scrolling down
    views[nextPage - 1].markAsRead();
    while (nextPage-- > MAX_PREV_VIEWS) {
      var view = views[0];
      view.fireEvent('free', e);
      view = null;
      scrollView.shiftView();
    }
    var leaveLimit = 0;
    for (i = ++nextPage; i--;) {
      leaveLimit += (((views[i].data || [])[0] || {}).rows || []).length; // there is only one section
    }
    postRecommends(leaveLimit, index);
  }
  currentPage = nextPage;
  for (i = offset; i < MAX_NEXT_VIEWS; i++) {
    // HACK in order to get a local model, we need to create an instance here
    // see Resources/iphone/alloy/controllers/rows.js
    var rowsData = Alloy.Collections.rowsData = Alloy.createCollection(DB);
    var rows = Alloy.createController('rows', {
      currentWindow: index,
      page: i,
      stars: e.stars
    }).getView();
    if (!rowsData.length) {
      if (!e.stars) {
        scrollView.addView(allRead);
        index.needAuth = true;
      }
      break;
    }
    rows.setTransform(counterRotate);
    scrollView.addView(rows);
  }
  if (Ti.Network.online && index.needAuth) {
    client.open('HEAD', authUrl);
    client.send();
    return;
  }
});

scrollView.addEventListener('scrollend', function(e) {
  index.fireEvent('openRows', e);
});

index.unloadViews = function() {
  var views = scrollView.views;
  for (var i = views.length; i--;) {
    var view = views[i];
    view.fireEvent('free');
    scrollView.removeView(i);
    view = null;
  }
  currentPage = scrollView.currentPage = 0;
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
      index.fireEvent('openRows');
    }
  });
}

index.open();
index.addEventListener('swipe', function(e) {
  // prevent bubbling up to the row
  e.cancelBubble = true;
  Ti.API.debug(e.direction);
  var direction = e.direction;
  if (direction === 'up') {
    Alloy.createController('menu', {
      parentWindow: index
    }).getView().open();
  }
});
index.addEventListener("close", function() {
  Ti.API.debug('index close');
  //index = null; // index has to be allways here, do not assgin null
  $.destroy();
});
