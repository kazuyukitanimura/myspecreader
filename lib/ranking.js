var RSVP = require('rsvp');

var RANKING_DB = 1; // http://www.rediscookbook.org/multiple_databases.html
var options = {};
var port = null;
var host = null;

var redis = require('redis').createClient(port, host, options);

redis.on('error', function(err) {
  console.error('Redis Ranking:', err);
});

// HACK make sure we write to RANKING_DB, see https://github.com/mranney/node_redis/blob/master/index.js
var commands = [];
var send_command = redis.send_command;
var tmp_send_command = function() {
  commands.push(arguments);
};
var checkDb = function() {
  redis.select(RANKING_DB, function(err, res) {
    redis.send_command = send_command;
    if (err) {
      checkDb();
    } else {
      for (var i = 0, l = commands.length; i < l; i++) {
        send_command.apply(redis, commands[i]);
      }
    }
  });
  redis.send_command = tmp_send_command;
};
checkDb();

var Ranking = module.exports = function(userId) {
  if (! (this instanceof Ranking)) { // enforcing new
    return new Ranking(userId);
  }
  this.userId = userId;
};

Ranking.prototype.push = function(member, score) {
  redis.zadd(this.userId, score, member);
};

Ranking.prototype.first = function(num) {
  if (!num) {
    num = 1;
  }
  return new RSVP.Promise(function(resolve, reject) {
    redis.zrevrange(this.userId, 0, num, function(err, results){
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  }.bind(this));
};
