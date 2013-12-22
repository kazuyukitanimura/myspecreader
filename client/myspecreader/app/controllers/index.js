var protocol = 'http';
var domain = 'domain.com';
if (Ti.Platform.model === 'Simulator' || Ti.Platform.model.indexOf('sdk') !== - 1) {
  domain = 'localhost';
}
var authUrl = protocol + '://' + domain + '/auth';
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
    var loginButton = Alloy.createController('loginButton', resLocation, 'index').getView();
    $.index.add(loginButton);
  }
  // setup background jobs
  var bgOptions = {
    url: 'getRecommends.js'
  };
  if (OS_ANDROID) {
    // TODO debug this
    var intent = Titanium.Android.createServiceIntent(bgOptions);
    intent.putExtra('interval', 10 * 60 * 1000); // every 10 min
    var service = Titanium.Android.createService(intent);
    service.start();
  } else {
    if (OS_IOS) {
      Ti.App.iOS.registerBackgroundService(bgOptions);
    }
    require('getRecommends');
  }
  // TODO go to news view
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

$.index.open();
