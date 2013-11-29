var fs = require('fs');
var express = require('express');
var app = express();
var Feedly = require('./feedly');

app.use(express.logger());
app.use(express.compress());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);

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
    },
    function(err, results) {
      res.redirect('http://localhost/streams');
    });
  } else {
    res.send(200);
  }
});

app.get('/streams', function(req, res) {
  feedly.getStreams(function(err, data, response) {
    if (err) {
      console.error(err);
      res.send(500);
    } else {
      res.send(data);
    }
  });
});

app.get('/search', function(req, res) {
  var options = {
    q: req.query.q,
    n: req.query.n
  };
  feedly.getSearch(options, function(err, data, response) {
    if (err) {
      console.error(err);
      res.send(500);
    } else {
      res.send(data);
    }
  });
});

app.get('/subscriptions', function(req, res) {
  feedly.getSubscriptions(function(err, data, response) {
    if (err) {
      console.error(err);
      res.send(500);
    } else {
      res.send(data);
    }
  });
});

app.post('/subscriptions', function(req, res) {
  feedly.postSubscriptions(req.body, function(err, data, response) {
    if (err) {
      console.error(err);
      res.send(500);
    } else {
      res.send(data);
    }
  });
});

app.listen(80, function() {
  // if run as root, downgrade to the owner of this file
  if (process.getuid() === 0) {
    var stats = fs.statSync(__filename);
    process.setuid(stats.uid);
  }
});

