var protocol = 'http';
var domain = 'domain.com';
if (Ti.Platform.model === 'Simulator' || Ti.Platform.model.indexOf('sdk') !== - 1) {
  domain = 'localhost';
}
var authUrl = protocol + '://' + domain + '/auth';
var index = $.index;
var client = Ti.Network.createHTTPClient({
  autoRedirect: false,
  timeout: 1000 // in milliseconds
});
//client.clearCookies('http://localhost'); // for test
client.open('HEAD', authUrl); // Prepare the connection.
client.send(); // Send the request.
client.setOnload(function() { // on success
  //Ti.API.debug("headers: " + JSON.stringify(this.getResponseHeaders()));
  var resLocation = this.getResponseHeader('Location');
  if (this.status === 302 && resLocation !== '/') {
    var loginButton = Alloy.createController('loginButton', {
      resLocation: resLocation,
      currentWindow: index
    }).getView();
    index.add(loginButton);
  } else {
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
    require('getRecommends');
  }
});

client.setOnerror(function(e) { // on error including a timeout
  Ti.API.debug(e.error);
  client.timeout = Math.min(client.timeout * 2, 32 * 1000); // Max 32sec
  setTimeout(function() {
    client.open('HEAD', authUrl);
    client.send();
  },
  client.timeout); // wait the same amount of time as client.timeout and retry
});

index.addEventListener('openRows', function(e) {
  Ti.API.debug('openRows');
  index.removeAllChildren();
  var rows = Alloy.createController('rows').getView();
  index.add(rows);
});

var recommends = Alloy.Collections.instance('recommends');
recommends.on('sync', function(e) {
  index.fireEvent('openRows');
});

index.orientationModes = [Ti.UI.LANDSCAPE_LEFT, Ti.UI.LANDSCAPE_RIGHT, Ti.UI.PORTRAIT, Ti.UI.UPSIDE_PORTRAIT];
index.open();
index.addEventListener("close", function() {
  Ti.API.debug('index close');
  $.destroy();
});

// Handling Orientation Changes
//Ti.Gesture.addEventListener('orientationchange', function(e) {
//  index.fireEvent('openRows');
//});
