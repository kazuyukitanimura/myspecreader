//var cheerio = require('cheerio');
var natural = require('natural');
var RSVP = require('rsvp');
var rsvpHash = RSVP.hash;
var treebankWordTokenizer = new natural.TreebankWordTokenizer();
//natural.PorterStemmer.attach(); // String.stem() and String.tokenizeAndStem()
var Feedly = require('./feedly');
var ScwPromise = require('./scwPromise');

var TITLE_BLACKLIST = /^(AD|PR):/;

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
  if (userId && (!this.scwPromise || ! this.scwPromise.scw || options.forceScw)) {
    this.scwPromise = new ScwPromise(userId); // TODO is there isResolved method for rsvp?
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
  this.scwPromise.then(function(scw) {
    this.getStreams(options, function(err, data, response) {
      if (!err) {
        var CATEGORIES = ScwPromise.CATEGORIES;
        var CATEGORY_LOOKUP = ScwPromise.CATEGORY_LOOKUP;
        var l = CATEGORIES.length;
        var now = Date.now();
        var items = data.items;
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
          /**
           * Black list
           */
          if (TITLE_BLACKLIST.test(title)) {
            items.splice(i, 1);
            console.log('TITLE BLACKLISTED\t', title);
            continue;
          }
          var summary = (item.summary && item.summary.content) || ''; // key prefix: s
          var categories = item.categories || [];
          var visual = item.visual || {};
          var featureVector = {
            // nomoralize how old it is from the time the user sees it
            ago: now - item.published | 0,
            // if item.published is undefined this becomes NaN
            img: 0 // 0 or 1
          }; // key: word, val:frequency
          if ((typeof item.engagement) === 'number') {
            featureVector.engagement = item.engagement | 0;
          }
          if ((typeof item.engagementRate) === 'number') {
            featureVector.engagementRate = item.engagementRate;
          }
          if (item.origin && item.origin.streamId) {
            k = 'o ' + item.origin.streamId;
            featureVector[k] = 1;
            delete item.origin.htmlUrl;
            delete item.origin.streamId;
          }
          if (item.language) {
            k = 'l ' + item.language;
            featureVector[k] = 1;
          }
          for (j = keywords.length; j--;) {
            k = 'k ' + keywords[j].trim().toLowerCase();
            featureVector[k] = 1; // keyword should not been seen more than once
          }
          for (j = categories.length; j--;) {
            var catId = categories[j].id;
            if (catId) {
              k = 'c ' + catId;
              featureVector[k] = 1;
            }
          }
          var titlePieces = tokenize(title);
          for (j = titlePieces.length; j--;) {
            k = 't ' + titlePieces[j];
            featureVector[k] = (featureVector[k] | 0) + 1;
          }
          // TODO delete this code after sandbox
          //var $ = cheerio.load(summary);
          //var $img = $('img').first();
          //if ($img.length) {
          //  item.img = $img.attr('src');
          //  featureVector.img = 1;
          //}
          // https://groups.google.com/forum/#/feedly-cloud/qpiLC-NEBJ0/yTooEbmQIRgJ
          // https://groups.google.com/forum/#/feedly-cloud/Aewe-rmSTwA/mTsLz8E4opMJ
          if (visual.url && visual.url !== 'none') {
            item.img = visual.url;
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
          if (item.canonical && item.canonical.href) {
            item.href = item.canonical.href;
          } else if (item.alternate && item.alternate.length && item.alternate[0].href) {
            item.href = item.alternate[0].href;
          } else if (item.originId) {
            item.href = item.originId;
          }
          // delete unused data
          delete item.alternate;
          delete item.author;
          delete item.canonical;
          delete item.categories;
          delete item.content;
          delete item.crawled;
          delete item.engagement;
          delete item.engagementRate;
          delete item.fingerprint;
          delete item.keywords;
          delete item.language;
          delete item.originId;
          delete item.recrawled;
          delete item.sid;
          delete item.thumbnail;
          delete item.updated;
          delete item.visual;
        }
        items.sort(function(a, b) {
          return CATEGORY_LOOKUP[b.estCategory] - CATEGORY_LOOKUP[a.estCategory] || b.featureVector.engagement - a.featureVector.engagement || a.featureVector.ago - b.featureVector.ago;
        });
      }
      callback(err, data, response);
    }.bind(this));
  }.bind(this)).
  catch(function(err) {
    callback(err, null, null);
  });
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
  this.scwPromise.then(function(scw) {
    var reads = [];
    var unreads = [];
    var stars = [];
    var unstars = [];
    var data = postBody.data;
    var NON_CATEGORY = ScwPromise.NON_CATEGORY;
    var KEEPUNREAD_CATEGORY = ScwPromise.KEEPUNREAD_CATEGORY;
    var CATEGORIES = ScwPromise.CATEGORIES;
    for (var i = data.length; i--;) {
      var datum = data[i];
      var category = datum.category = CATEGORIES[datum.state];
      if (category === NON_CATEGORY || category === KEEPUNREAD_CATEGORY) {
        unreads.push(datum.id);
      } else {
        reads.push(datum.id);
      }
      if (category === 'star') {
        stars.push(datum.id);
      } else {
        unstars.push(datum.id);
      }
    }
    var promises = {
      saveMatricies: new RSVP.Promise(function(resolve, reject) {
        scw.train(data, function(err) {
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
        //}.bind(this)),
        //unsaved: new RSVP.Promise(function(resolve, reject) {
        //  this.deleteSaved(unstars, function(err) { // this is troublesome
        //    if (err) {
        //      reject(err);
        //    } else {
        //      resolve();
        //    }
        //  });
      }.bind(this))
    };
    rsvpHash(promises).then(function(results) {
      callback(null, results);
    }).
    catch(function(errors) {
      callback(errors, {});
    });
  }.bind(this)).
  catch(function(err) {
    callback(err, null, null);
  });
};
