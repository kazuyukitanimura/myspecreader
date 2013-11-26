var fs = require('fs');
var express = require('express');
var app = express();
var Feedly = require('./feedly');

var feedly = new Feedly();

var STATES = {
  AUTH: 'auth'
};

// Feedly Authorization URI
var authorization_uri = feedly.getAuthUrl({
  // this has to be exactly http://localhost during sandbox
  redirect_uri: 'http://localhost',
  scope: 'https://cloud.feedly.com/subscriptions',
  state: STATES.AUTH
});

// Initial page redirecting to Feedly
app.get('/auth', function(req, res) {
  res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/', function(req, res) {
  var state = req.query.state;
  var code = req.query.code;
  if (code && state === STATES.AUTH) {
    feedly.getAccessToken(code, {
      redirect_uri: 'http://localhost'
    });
    res.send(200);
  } else {
    feedly.getStreams(function(err, data, response) {
      if (err) {
        console.error(err);
        res.send(500);
      } else {
        res.send(data);
      }
    });
  }
});

app.listen(80, function() {
  // if run as root, downgrade to the owner of this file
  if (process.getuid() === 0) {
    var stats = fs.statSync(__filename);
    process.setuid(stats.uid);
  }
});

