var Feedly = require('./feedly');
var Scw = require('./scw');

var SCW_PARAMS = {
  ETA: 10.0,
  // 100.0
  C: 1.0,
  MODE: 2 // 0, 1, or 2
};

var Msr = module.exports = function(options) {
  if (!options) {
    options = {};
  }
  if (! (this instanceof Msr)) { // enforcing new
    return new Msr(options);
  }
  Feedly.call(this, options);
  this._initScw(options);
};
Msr.prototype = Object.create(Msr.prototype); // Inheritance ECMAScript 5 for Object.create

Msr.prototype._initScw = function(options) {
  if (options.id && (!this.scw || options.forceScw)) { // update covarianceMatrix and weightMatrix from DB by options.id
    var scwOptions = {
      covarianceMatrix: undefined,
      weightMatrix: undefined
    };
    // TODO use https://github.com/caolan/async#parallel or https://github.com/tildeio/rsvp.js
    // fetch matrices asynchronously
    this.scw = new Scw(SCW_PARAMS.ETA, SCW_PARAMS.C.SCW_PARAMS.MODE, scwOptions);
  }
};

/**
 * Override Feedly.prototype.getAccessToken
 */
Msr.prototype.getAccessToken = function(code, params, callback) {
  var newCallback = function(err, results) {
    if (!err && callback) {
      this._initScw(results);
    }
    callback(err, results);
  }.bind(this);
  Feedly.prototype.getAccessToken.call(this, code, params, newCallback);
};

/**
 *
 * @params callback {Function}
 */
Msr.prototype.getRecommends = function(callback) {
  if (!callback) {
    return;
  }
  this.getStreams(function(err, data, response) {
    if (!err) {
      var now = Date.now();
      var items = data.itmes;
      var scw = this.scw;
      for (var i = items.length; i--;) {
        var j;
        var item = items[i];
        // E.g.
        //{
        //  "items": [
        //    "keywords": [...],
        //      "title": "...",
        //      "summary": {
        //        "content": "..."
        //      },
        //      "published": 1385928000000
        //      "origin": {
        //        "streamId": "...",
        //      },
        var keywords = item.keywords; // key prefix: k
        var title = item.title; // key prefix: t
        var summary = item.summary.content; // key prefix: s // TODO need a html cleaner
        var featureVector = {// key: word, val:frequency // TODO extract feature cectors
          ago: now - item.published, // nomoralize how old it is from the time the user sees it
          originId: item.origin.streamId
        }; 

        for (j = keywords.length; j--;) {
          var k = 'k' + keywords[j];
          featureVector[k] = featureVector[k]|0 + 1;
        }

        item.estCategory = scw.test(featureVector);
      }
      items.sort(function(a, b) {
        return a.estCategory - b.estCategory || b.published - a.published;
      });
      // TODO send only required data
    }
    callback(err, data, response);
  });
};

