var cheerio = require('cheerio');
var natural = require('natural');
var RSVP = require('RSVP');
var rsvpHash = RSVP.hash;
var treebankWordTokenizer = new natural.TreebankWordTokenizer();
//natural.PorterStemmer.attach(); // String.stem() and String.tokenizeAndStem()
var redis = require('./redis');
var Feedly = require('./feedly');
var Scw = require('./scw');

var SCW_PARAMS = {
  ETA: 10.0,
  // 100.0
  C: 1.0,
  MODE: 2 // 0, 1, or 2
};

var CATEGORIES = [Scw.NON_CATEGORY, 'pass', 'viewSummary', 'viewOriginal', 'keepUnread', 'star'];
// DO NOT CHANGE THE ORDER OR DELETE MEMBERS
// undefined: none of the categories
// through: was not opend by showing only title
// summary: summary was read by clicking title but the original contents were not viewed
// original: summary was read and original contents were opened
// star: starred
var CATEGORY_LOOKUP = {};
for (var i = CATEGORIES.length; i--;) {
  CATEGORY_LOOKUP[CATEGORIES[i]] = i;
}

/**
 * Convenient functions
 */
var stripHtml = function(text) {
  // http://stackoverflow.com/questions/822452/strip-html-from-text-javascript
  // http://css-tricks.com/snippets/javascript/strip-html-tags-in-javascript/
  return text.replace(/<(?:.|\n)*?>/gm, '').trim(); // .replace(/(<([^>]+)>)/ig,"")
};
//var separator = /[\s.!?&\/\[\]\{\}\(\):;]+/;
//var strip = /$[\s.!?&\/\[\]\{\}\(\):;]+|[\s.!?&\/\[\]\{\}\(\):;]+$/g;
var ignores = ['\'s', '\'re', '\'ll', '\'ve', '..', '&quot', '--'];
var tokenize = function(text) {
  //return stripHtml(text).replace(strip, '').split(separator);
  //var tokens = treebankWordTokenizer.tokenize(stripHtml(text));
  var tokens = treebankWordTokenizer.tokenize(text);
  for (var i = tokens.length; i--;) {
    var token = tokens[i];
    if ((token.length < 2 && ! /[\d$]+/.test(token)) || ignores.indexOf(token) !== - 1) {
      tokens.splice(i, 1); // remove
      continue;
    }
    //tokens[i] = token.replace(/\.$|^'/, '').stem(); // remove punctuations
    tokens[i] = token.replace(/\.$|^'/, '').toLowerCase(); // remove punctuations
  }
  return tokens;
  //return stripHtml(text).tokenizeAndStem();
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
  var userId = options.id;
  if (userId && (!this.scw || options.forceScw)) {
    // TODO use https://github.com/caolan/async#parallel or https://github.com/tildeio/rsvp.js
    // fetch matrices asynchronously
    redis.loadMatricies(userId, CATEGORIES, function(err, scwOptions) {
      if (err) {
        console.error(err); // TODO think what to do with the errors, retry?
        setImmediate(this._initScw, options); // retry
      } else {
        this.scw = new Scw(SCW_PARAMS.ETA, SCW_PARAMS.C, SCW_PARAMS.MODE, scwOptions);
      }
    }.bind(this));
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
 * @param options {Object}
 * @params callback {Function}
 */
Msr.prototype.getRecommends = function(options, callback) {
  if (!options) {
    options = {};
    callback = function() {};
  }
  if (!callback) {
    callback(new Error('Msr.getRecommends Error'));
    return;
  }
  this.getStreams(options, function streamsCb(err, data, response) {
    if (!err) {
      var now = Date.now();
      var items = data.items;
      var scw = this.scw;
      if (!scw) {
        setImmediate(streamsCb, err, data, response);
        console.error('Msr.getRecommends, this.scw is not defined yet');
        return;
      }
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
        var featureVector = {
          // nomoralize how old it is from the time the user sees it
          ago: now - item.published,
          // if item.published is undefined this becomes NaN
          img: 0 // 0 or 1
        }; // key: word, val:frequency
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
        var titlePieces = tokenize(title);
        for (j = titlePieces.length; j--;) {
          k = 't ' + titlePieces[j];
          featureVector[k] = (featureVector[k] | 0) + 1;
        }
        var $ = cheerio.load(summary);
        var $img = $('img').first();
        if ($img.length) {
          item.img = $img.attr('src');
          featureVector.img = 1;
        }
        summary = item.summary = stripHtml(summary);
        var summaryPieces = tokenize(summary);
        for (j = summaryPieces.length; j--;) {
          k = 's ' + summaryPieces[j];
          featureVector[k] = (featureVector[k] | 0) + 1;
        }
        item.featureVector = featureVector;
        item.estCategory = scw.test(featureVector);
        if (item.alternate && item.alternate.length && item.alternate[0].href) {
          item.href = item.alternate[0].href;
        }
        delete item.alternate;
        delete item.fingerprint;
        delete item.originId;
        delete item.author;
        delete item.crawled;
        delete item.sid;
        delete item.visual;
      }
      items.sort(function(a, b) {
        return CATEGORY_LOOKUP[b.estCategory] - CATEGORY_LOOKUP[a.estCategory] || a.ago - b.ago;
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
  if (!postBody || ! callback) {
    callback(new Error('Msr.postRecommends Error'));
    return;
  }
  var scw = this.scw;
  if (!scw) {
    setImmediate(this.postRecommends, postBody, callback);
    console.error('Msr.postRecommends, this.scw is not defined yet');
    return;
  }
  var reads = [];
  var unreads = [];
  var stars = [];
  scw.train(function(trainCallback) {
    if (!trainCallback) {
      callback(new Error());
      return;
    }
    var data = postBody.data;
    for (var i = data.length; i--;) {
      var datum = data[i];
      var category = datum.category = CATEGORY_LOOKUP[datum.state];
      if (category === Scw.NON_CATEGORY || category === 'keepUnread') {
        unreads.push(datum.id);
      } else {
        reads.push(datum.id);
      }
      if (category === 'star') {
        stars.push(data.id);
      }
      trainCallback(datum);
    }
  });
  var promises = {
    saveMatricies: new RSVP.Promise(function(resolve, reject) {
      redis.saveMatricies(this._results.id, CATEGORIES, scw.covarianceMatrix, scw.weightMatrix, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }.bind(this)),
    markAsRead: new RSVP.Promise(function(resolve, reject) {
      this.postMarkAsRead(reads, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }.bind(this)),
    keepUnread: new RSVP.Promise(function(resolve, reject) {
      this.postKeepUnread(unreads, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }.bind(this)),
    saved: new RSVP.Promise(function(resolve, reject) {
      this.putSaved(stars, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }.bind(this))
  };
  rsvpHash(promises).then(function(results) {
    callback(null, results);
  }).
  catch(function(errors) {
    callback(errors, {});
  });
};
