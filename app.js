var cluster = require('cluster');
var fs = require('fs');
var stats = fs.statSync(__filename);
if (cluster.isMaster) {
  /**
   * Zero Downtime Auto Deploy
   */
  var spawn = require('child_process').spawn;
  var worker = cluster.fork();
  setInterval(function() {
    spawn('git', ['pull', '--ff-only', '--rebase'], {
      detached: true,
      stdio: ['ignore', process.stdout, process.stderr],
      uid: stats.uid,
      gid: stats.gid
    }).on('close', function(code) {
      if (code === 0) {
        var newWorker = cluster.fork().on('listening', function() {
          worker.kill();
          worker = newWorker;
        });
      }
    });
  },
  15 * 60 * 1000); // every 15min
} else {
  var https = require('https');
  var sessions = require("client-sessions");
  var express = require('express');
  var bodyParser = require('body-parser');
  var compress = require('compression');
  var logger = require('morgan');
  var methodOverride = require('method-override');
  var lruCache = require('lru-cache')();
  var toobusy = require('toobusy');
  var app = express();

  var Msr = require('./lib/msr');
  var msrCommon = new Msr();
  var secret = require('./secret');
  var url = require('./lib/url');

  var STATES = {
    AUTH: 'auth'
  };

  // This has to be exactly one of "http://localhost", "https://localhost", "http://localhost:8080" during sandbox
  // https://groups.google.com/forum/#!topic/feedly-cloud/MIMvcu8Ju30
  var port = 443;
  var redirect_uri = 'https://localhost';

  // Msr Authorization URI
  var authorization_uri = msrCommon.getAuthUrl({
    redirect_uri: redirect_uri,
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
        redirect_uri: redirect_uri
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

  app.use(function(req, res, next) { // middleware which blocks requests when we're too busy
    if (toobusy()) {
      res.send(503, 'I\'m busy right now, sorry.');
    } else {
      next();
    }
  });
  app.use(logger());
  app.use(compress());
  app.use(bodyParser({
    limit: '200kb'
  }));
  app.use(methodOverride());
  app.use(sessions({
    cookieName: 'msrCookie',
    secret: secret.SESSION_SECRET || 'himitsu',
    duration: 24 * 60 * 60 * 1000,
    activeDuration: 30 * 60 * 1000
  }));
  app.use(auth_middleware);

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
    req.msr.getRecommends(req.query, function(err, data, response) {
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
    req.msr.getStreams(req.query, function(err, data, response) {
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
    req.msr.getSearch(req.query, function(err, data, response) {
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

  var server = https.createServer(secret.HTTPS_OPTIONS, app).listen(port, function() {
    // if run as root, downgrade to the owner of this file
    if (process.getuid() === 0) {
      process.setgid(stats.gid);
      process.setuid(stats.uid);
    }
    console.log('New server listening to port ' + port);
  });

  process.on('SIGINT', function() {
    server.close();
    // calling .shutdown allows your process to exit normally
    toobusy.shutdown();
    process.exit();
  });
}
