var assert = require('assert');
var RSVP = require('rsvp');
var rsvpHash = RSVP.hash;

var RANKING_DB = 2; // http://www.rediscookbook.org/multiple_databases.html
var options = {};
var port = null;
var host = null;

var redis = require('redis').createClient(port, host, options);

redis.on('error', function(err) {
  console.error('Redis Ranking:', err);
});

var checkDb = function() {
  redis.select(RANKING_DB, function(err, res) {
    if (err) {
      setImmediate(checkDb);
    }
  });
};
checkDb();

var Ranking = module.exports = function() {
  if (! (this instanceof Ranking)) { // enforcing new
    return new Ranking();
  }
  assert.deepEqual(redis.selected_db, RANKING_DB); // make sure we write to RANKING_DB
};

Ranking.prototype.rank = function(data, callback) {
  if (!data || ! data.UUID || ! data.bestScore || ! data.countryCode) {
    return;
  }

  var scoreMembers = [data.bestScore, data.UUID];

  var writes = {
    world: new RSVP.Promise(function(resolve, reject) {
      redis.zadd(['world'].concat(scoreMembers), function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    }.bind(this)),
    country: new RSVP.Promise(function(resolve, reject) {
      redis.zadd([data.countryCode].concat(scoreMembers), function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    }.bind(this))
  };
  var reads = {
    worldRank: new RSVP.Promise(function(resolve, reject) {
      redis.zrevrank('world', data.UUID, function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    }.bind(this)),
    countryRank: new RSVP.Promise(function(resolve, reject) {
      redis.zrevrank(data.countryCode, data.UUID, function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    }.bind(this)),
    worldBest: new RSVP.Promise(function(resolve, reject) {
      redis.zrevrange('world', 0, 0, function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    }.bind(this)),
    countryBest: new RSVP.Promise(function(resolve, reject) {
      redis.zrevrange(data.countryCode, 0, 0, function(err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    }.bind(this))
  };
  rsvpHash(writes).then(function(results) {
    rsvpHash(reads).then(function(results) {
      callback(null, results);
    }).
    catch(function(errors) {
      callback(errors, {});
    });
  }).
  catch(function(errors) {
    callback(errors, {});
  });
};

Ranking.shutdown = redis.quit.bind(redis);
