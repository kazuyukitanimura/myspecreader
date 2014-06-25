var RSVP = require('rsvp');
var assert = require('assert');

var RANKING_DB = 1; // http://www.rediscookbook.org/multiple_databases.html
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

var Ranking = module.exports = function(userId) {
  if (! (this instanceof Ranking)) { // enforcing new
    return new Ranking(userId);
  }
  assert.deepEqual(redis.selected_db, RANKING_DB); // make sure we write to RANKING_DB
  this.userId = userId;
};

Ranking.prototype.push = function(member, score) {
  var scoreMembers = member;
  if (!Array.isArray(member) && score) {
    scoreMembers = [score, member];
  }
  scoreMembers.unshift(this.userId);
  redis.zadd.apply(redis, scoreMembers);
};

Ranking.prototype.remove = function(member) {
  var members = member;
  if (!Array.isArray(member)) {
    members = [member];
  }
  members.unshift(this.userId);
  redis.zrem.apply(redis, members);
};

Ranking.prototype.first = function(num) {
  return new RSVP.Promise(function(resolve, reject) {
    redis.zrevrange(this.userId, 0, num | 0, function(err, results) {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  }.bind(this));
};

//Ranking.prototype.score = function(member) { // TODO delete after debugging
//  redis.zscore(this.userId, member, function(err, result) {
//    console.log(member, result);
//  });
//};

Ranking.shutdown = redis.quit.bind(redis);
