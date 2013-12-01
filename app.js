var fs = require('fs');
var sessions = require("client-sessions");
var express = require('express');
var app = express();
var Feedly = require('./feedly');
var feedlyCommon = new Feedly();
var secret = require('./secret');
var url = require('./url');

var STATES = {
  AUTH: 'auth'
};

// Feedly Authorization URI
var authorization_uri = feedlyCommon.getAuthUrl({
  // this has to be exactly http://localhost during sandbox
  redirect_uri: 'http://localhost',
  scope: 'https://cloud.feedly.com/subscriptions',
  state: STATES.AUTH
});

// Feedly Authorization Middleware
var auth_middleware = function(req, res, next) {
  var options = req.mySpecReader.options;
  var loggedin = req.loggedin = (!!options && !! options.id);
  var state = req.query.state;
  var code = req.query.code;
  var url_pathname = url.parse(req.url).pathname;
  if (loggedin) {
    if (url_pathname === '/auth') {
      res.redirect('/');
    } else {
      console.log(options);
      req.feedly = new Feedly(options);
      next();
    }
  } else if (url_pathname === '/' && code && state === STATES.AUTH) {
    feedlyCommon.getAccessToken(code, {
      redirect_uri: 'http://localhost'
    },
    function(err, results) {
      if (err) {
        console.error(err);
        req.mySpecReader.reset();
        res.send(500);
      } else {
        // setting a property will automatically cause a Set-Cookie response to be sent
        req.mySpecReader.options = results;
        res.redirect('/streams');
      }
    });
  } else {
    next();
  }
};

app.use(express.logger());
app.use(express.compress());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(sessions({
  cookieName: 'mySpecReader',
  secret: secret.SESSION_SECRET || 'himitsu',
  duration: 24 * 60 * 60 * 1000,
  activeDuration: 30 * 60 * 1000
}));
app.use(auth_middleware);
app.use(app.router);

// Initial page redirecting to Feedly
app.get('/auth', function(req, res) {
  res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/', function(req, res) {
  var loggedin = req.loggedin;
  if (loggedin) {
    res.redirect('/streams');
  } else {
    res.redirect('/auth');
  }
});

app.get('/streams', function(req, res) {
  req.feedly.getStreams(function(err, data, response) {
    if (err) {
      console.error(err);
      req.mySpecReader.reset();
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
  req.feedly.getSearch(options, function(err, data, response) {
    if (err) {
      console.error(err);
      req.mySpecReader.reset();
      res.send(500);
    } else {
      res.send(data);
    }
  });
});

app.get('/subscriptions', function(req, res) {
  req.feedly.getSubscriptions(function(err, data, response) {
    if (err) {
      console.error(err);
      req.mySpecReader.reset();
      res.send(500);
    } else {
      res.send(data);
    }
  });
});

app.post('/subscriptions', function(req, res) {
  req.feedly.postSubscriptions(req.body, function(err, data, response) {
    if (err) {
      console.error(err);
      req.mySpecReader.reset();
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

