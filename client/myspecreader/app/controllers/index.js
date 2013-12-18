var authUrl = 'http://localhost/auth';
var client = Ti.Network.createHTTPClient({
  autoRedirect: false,
  timeout: 1000 // in milliseconds
});
// Prepare the connection.
client.open('HEAD', authUrl);
// Send the request.
client.send();

client.setOnload(function() { // on success
  //Ti.API.info("headers: " + JSON.stringify(this.getResponseHeaders()));
  var resLocation = this.getResponseHeader('Location');
  if (this.status === 302 && resLocation !== '/') {
    var loginButton = Alloy.createController('loginButton', resLocation).getView();
    $.index.add(loginButton);
  }
  // TODO go to news view
});

client.setOnerror(function(e) { // on error including a timeout
  Ti.API.debug(e.error);
  client.timeout = Math.min(client.timeout * 2, 2048 * 1000); // Max 18min
  setTimeout(function() {
    client.open('HEAD', authUrl);
    client.send();
  }, client.timeout); // wait the same amount of time as client.timeout and retry
});

$.index.open();
