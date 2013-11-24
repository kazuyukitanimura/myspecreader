var fs = require('fs');
var express = require('express');
var app = express();
var Feedly = require('./feedly');

var feedly = new Feedly();

// Feedly Authorization URI
var authorization_uri = feedly.getAuthUrl({
  // this has to be exactly http://localhost during sandbox
  redirect_uri: 'http://localhost',
  scope: 'https://cloud.feedly.com/subscriptions',
  state: 'now'
});

// Initial page redirecting to Feedly
app.get('/auth', function(req, res) {
  res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/', function(req, res) {
  var code = req.query.code;
  feedly.getAccessToken(code, {
    redirect_uri: 'http://localhost'
  });
});

app.listen(80, function() {
  // if run as root, downgrade to the owner of this file
  if (process.getuid() === 0) {
    var stats = fs.statSync(__filename);
    process.setuid(stats.uid);
  }
});

