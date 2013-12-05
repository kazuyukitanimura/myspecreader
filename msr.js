var Feedly = require('./feedly');
var Scw = require('./scw');

var SCW_PARAMS = {
  ETA: 10.0,
  // 100.0
  C: 1.0,
  MODE: 2 // 0, 1, or 2
};

/**
 * Convenient functions
 */
var stripHtml = function(text) {
  // http://stackoverflow.com/questions/822452/strip-html-from-text-javascript
  // http://css-tricks.com/snippets/javascript/strip-html-tags-in-javascript/
  return text.replace(/<(?:.|\n)*?>/gm, '').trim(); // .replace(/(<([^>]+)>)/ig,"")
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
Msr.prototype = Object.create(Feedly.prototype);

Msr.prototype._initScw = function(options) {
  if (options.id && (!this.scw || options.forceScw)) { // update covarianceMatrix and weightMatrix from DB by options.id
    var scwOptions = {
      covarianceMatrix: undefined,
      weightMatrix: undefined
    };
    // TODO use https://github.com/caolan/async#parallel or https://github.com/tildeio/rsvp.js
    // fetch matrices asynchronously
    this.scw = new Scw(SCW_PARAMS.ETA, SCW_PARAMS.C, SCW_PARAMS.MODE, scwOptions);
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
  if (!callback || ! this.scw) {
    callback(new Error());
    return;
  }
  this.getStreams(function(err, data, response) {
    if (!err) {
      var now = Date.now();
      var items = data.items;
      var scw = this.scw;
      var separator = /[\s.!?&\/\[\]\{\}\(\)]+/;
      var strip = /$[\s.!?&\/\[\]\{\}\(\)]+|[\s.!?&\/\[\]\{\}\(\)]+$/g;
      for (var i = items.length; i--;) {
        var j = 0;
        var k = '';
        var item = items[i];
        // E.g.
        //{
        //  "items": [
        //    "keywords": [...],
        //      "title": "...",
        //      "summary": {
        //        "content": "..."
        //      },
        //      "language": "English", // support only English now
        //      "published": 1385928000000
        //      "origin": {
        //        "streamId": "...",
        //      },
        var keywords = item.keywords || []; // key prefix: k
        var title = item.title || ''; // key prefix: t
        var summary = (item.summary && item.summary.content) || ''; // key prefix: s
        var featureVector = {}; // key: word, val:frequency
        if (item.published) {
          // nomoralize how old it is from the time the user sees it
          featureVector.ago = now - item.published;
        }
        if (item.origin && item.origin.streamId) {
          featureVector.originId = item.origin.streamId;
        }
        if (item.language) {
          featureVector.lang = item.language;
        }

        for (j = keywords.length; j--;) {
          k = 'k ' + keywords[j].trim().toLowerCase();
          featureVector[k] = 1; // keyword should not been seen more than once
        }
        var titlePieces = stripHtml(title).replace(strip, '').split(separator);
        for (j = titlePieces.length; j--;) {
          k = 't ' + titlePieces[j].toLowerCase();
          featureVector[k] = (featureVector[k] | 0) + 1;
        }
        var summaryPieces = stripHtml(summary).replace(strip, '').split(separator);
        // TODO need to extract stem words, drop stop words
        for (j = summaryPieces.length; j--;) {
          k = 's ' + summaryPieces[j].toLowerCase();
          featureVector[k] = (featureVector[k] | 0) + 1;
        }
        featureVector.img = /(<[^>]*img[^>]*>)/im.test(summary) | 0; // 0 or 1
        item.estCategory = +scw.test(featureVector); // +change to number
      }
      items.sort(function(a, b) {
        return a.estCategory - b.estCategory || b.published - a.published;
      });
      // TODO send only required data
    }
    callback(err, data, response);
  }.bind(this));
};

/**
 *
 * @param postBody {String} or {Object} http post body
 * @params callback {Function}
 */
Msr.prototype.postRecommends = function(postBody, callback) {
  if (!callback || ! this.scw) {
    callback(new Error());
    return;
  }
  this.scw.train(function(trainCallback) {
    if (!trainCallback) {
      callback(new Error());
      return;
    }
    var data = postBody.data;
    for (var i = data.length; i--;) {
      trainCallback(data[i]);
    }
  });
  callback(null, {});
};

