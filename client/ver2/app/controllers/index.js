var getRecommends = require('getRecommends');
//var slideIn = require('slideIn');
var protocol = 'http';
var authUrl = protocol + '://' + gDomain + '/auth';
var index = $.index;
index.needAuth = true;
var client = Ti.Network.createHTTPClient({ // cookies should be manually managed for Android
  autoRedirect: false,
  timeout: 1000 // in milliseconds
});
//client.clearCookies('http://' + gDomain); // for test
client.open('HEAD', authUrl); // Prepare the connection.
client.send(); // Send the request.
var intervalId = 0;
client.setOnload(function() { // on success
  //Ti.API.debug("headers: " + JSON.stringify(this.getResponseHeaders()));
  var resLocation = this.getResponseHeader('Location');
  if (this.status === 302 && resLocation !== '/') {
    if ([Ti.UI.LANDSCAPE_LEFT, Ti.UI.LANDSCAPE_RIGHT].indexOf(index.orientation) === - 1) {
      index.setBackgroundImage('Default.png');
    } else {
      index.setBackgroundImage('Default-Landscape.png');
    }
    var loginButton = Alloy.createController('loginButton', {
      resLocation: resLocation,
      currentWindow: index
    }).getView();
    index.add(loginButton);
    var learnMore = Alloy.createController('learnMore').getView();
    index.add(learnMore);
  } else {
    index.setBackgroundImage('');
    index.needAuth = false;
    index.fireEvent('openRows');
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
  //setTimeout(function() {
  //  client.open('HEAD', authUrl);
  //  client.send();
  //},
  //client.timeout); // wait the same amount of time as client.timeout and retry
  if (Ti.Network.online) {
    index.needAuth = false;
    Titanium.UI.createAlertDialog({
      title: 'There was a network issue',
      message: 'Limily will automatically retry later. Also try "Refresh" from the left menu.'
    }).show();
  } else {
    Titanium.UI.createAlertDialog({
      title: 'Your device is offline',
      message: 'You can still read pre-loaded articles'
    }).show();
  }
  index.setBackgroundImage('');
  index.fireEvent('openRows');
});

index.addEventListener('openRows', function(e) {
  Ti.API.debug('openRows');
  //var firstChild = index.children[0] || {};
  //var hasRead = e.hasRead || firstChild.hasRead === e.hasRead;
  //var stars = e.stars || firstChild.stars === e.stars;
  index.removeAllChildren();
  if (Ti.Network.online && index.needAuth) {
    client.open('HEAD', authUrl);
    client.send();
    return;
  }
  var rows = Alloy.createController('rows', {
    currentWindow: index,
    hasRead: e.hasRead,
    stars: e.stars
  }).getView();
  //rows.hasRead = hasRead;
  //rows.stars = stars;
  //if (e.hasRead) {
  //  index.add(slideIn(rows));
  //} else {
    index.add(rows);
  //}
  var menuIcon = Alloy.createController('menuIcon', {
    currentWindow: index
  }).getView();
  index.add(menuIcon);
});

index.orientationModes = [Ti.UI.LANDSCAPE_LEFT, Ti.UI.LANDSCAPE_RIGHT, Ti.UI.PORTRAIT, Ti.UI.UPSIDE_PORTRAIT];
// Handling Orientation Changes
Ti.Gesture.addEventListener('orientationchange', function(e) {
  index.fireEvent('openRows');
});
index.open();
index.addEventListener('swipe', function(e) {
  // prevent bubbling up to the row
  e.cancelBubble = true;
  Ti.API.debug(e.direction);
  var direction = e.direction;
  if (direction === 'right') {
    Alloy.createController('menu', {
      parentWindow: index
    }).getView().open();
  }
});
index.addEventListener("close", function() {
  Ti.API.debug('index close');
  $.destroy();
});
