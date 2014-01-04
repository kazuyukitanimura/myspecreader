var fs = require('fs');
var sessions = require("client-sessions");
var express = require('express');
var lruCache = require('lru-cache')();
var app = express();

var Msr = require('./msr');
var msrCommon = new Msr();
var secret = require('./secret');
var url = require('./url');

var STATES = {
  AUTH: 'auth'
};

// Msr Authorization URI
var authorization_uri = msrCommon.getAuthUrl({
  // this has to be exactly http://localhost during sandbox
  redirect_uri: 'http://localhost',
  scope: 'https://cloud.feedly.com/subscriptions',
  state: STATES.AUTH
});

// Msr Authorization Middleware
var auth_middleware = function(req, res, next) {
  var msrOptions = req.msrCookie.msrOptions;
  var loggedin = req.loggedin = (!!msrOptions && !! msrOptions.id);
  var state = req.query.state;
  var code = req.query.code;
  var url_pathname = url.parse(req.url).pathname;
  if (loggedin) {
    if (url_pathname === '/auth') {
      res.redirect('/');
    } else {
      console.log(msrOptions);
      var userId = msrOptions.id;
      if (! (req.msr = lruCache.get(userId))) {
        lruCache.set(userId, (req.msr = new Msr(msrOptions)));
      }
      next();
    }
  } else if (url_pathname === '/' && code && state === STATES.AUTH) {
    msrCommon.getAccessToken(code, {
      redirect_uri: 'http://localhost'
    },
    function(err, results) {
      if (err) {
        console.error(err);
        req.msrCookie.reset();
        res.send(500);
      } else {
        // setting a property will automatically cause a Set-Cookie response to be sent
        req.msrCookie.msrOptions = results;
        res.send(201);
      }
    });
  } else if (url_pathname === '/' || url_pathname === '/auth') {
    next();
  } else {
    res.send(401);
  }
};

app.use(express.logger());
app.use(express.compress());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(sessions({
  cookieName: 'msrCookie',
  secret: secret.SESSION_SECRET || 'himitsu',
  duration: 24 * 60 * 60 * 1000,
  activeDuration: 30 * 60 * 1000
}));
app.use(auth_middleware);
app.use(app.router);

// Initial page redirecting to Msr
app.get('/auth', function(req, res) {
  res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/', function(req, res) {
  var loggedin = req.loggedin;
  if (loggedin) {
    res.send(200);
  } else {
    res.send('Welcome!');
  }
});

app.get('/recommends', function(req, res) {
  req.msr.getRecommends(function(err, data, response) {
    if (err) {
      console.error(err);
      req.msrCookie.reset();
      res.send(500);
    } else {
      res.send(data);
    }
  });
});

app.post('/recommends', function(req, res) {
  req.msr.postRecommends(req.body, function(err, data, response) {
    if (err) {
      console.error(err);
      req.msrCookie.reset();
      res.send(500);
    } else {
      res.send(data);
    }
  });
});

app.get('/streams', function(req, res) {
  req.msr.getStreams(function(err, data, response) {
    if (err) {
      console.error(err);
      req.msrCookie.reset();
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
  req.msr.getSearch(options, function(err, data, response) {
    if (err) {
      console.error(err);
      req.msrCookie.reset();
      res.send(500);
    } else {
      res.send(data);
    }
  });
});

app.get('/subscriptions', function(req, res) {
  req.msr.getSubscriptions(function(err, data, response) {
    if (err) {
      console.error(err);
      req.msrCookie.reset();
      res.send(500);
    } else {
      res.send(data);
    }
  });
});

app.post('/subscriptions', function(req, res) {
  req.msr.postSubscriptions(req.body, function(err, data, response) {
    if (err) {
      console.error(err);
      req.msrCookie.reset();
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
