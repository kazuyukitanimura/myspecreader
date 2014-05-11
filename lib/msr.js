//var cheerio = require('cheerio');
var natural = require('natural');
var RSVP = require('rsvp');
var rsvpHash = RSVP.hash;
var treebankWordTokenizer = new natural.TreebankWordTokenizer();
//natural.PorterStemmer.attach(); // String.stem() and String.tokenizeAndStem()
var Feedly = require('./feedly');
var ScwPromise = require('./scwPromise');
var url = require('./url');

var ID_READ = 'global.read';
var ANALYZE_COUNT = 1024;
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
//http://99webtools.com/list-english-stop-words.php
//http://www.ranks.nl/stopwords
//http://dev.mysql.com/doc/refman/5.1/en/fulltext-stopwords.html
ignores = ignores.concat(["able", "about", "across", "after", "all", "almost", "also", "among", "and", "any", "are", "because", "been", "but", "can", "cannot", "could", "dear", "did", "does", "either", "else", "ever", "every", "for", "from", "get", "got", "had", "has", "have", "her", "hers", "him", "his", "how", "however", "i", "into", "its", "just", "least", "let", "like", "likely", "may", "might", "most", "must", "neither", "nor", "not", "off", "often", "only", "other", "our", "own", "rather", "said", "say", "says", "she", "should", "since", "some", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "tis", "too", "twas", "wants", "was", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would", "yet", "you", "your", "ain't", "aren't", "can't", "could've", "couldn't", "didn't", "doesn't", "don't", "hasn't", "he'd", "he'll", "he's", "how'd", "how'll", "how's", "i'd", "i'll", "i'm", "i've", "isn't", "it's", "might've", "mightn't", "must've", "mustn't", "shan't", "she'd", "she'll", "she's", "should've", "shouldn't", "that'll", "that's", "there's", "they'd", "they'll", "they're", "they've", "wasn't", "we'd", "we'll", "we're", "weren't", "what'd", "what's", "when'd", "when'll", "when's", "where'd", "where'll", "where's", "who'd", "who'll", "who's", "why'd", "why'll", "why's", "won't", "would've", "wouldn't", "you'd", "you'll", "you're", "you've"]);

var tokenize = function(text) {
  //return stripHtml(text).replace(strip, '').split(separator);
  //var tokens = treebankWordTokenizer.tokenize(stripHtml(text));
  var tokens = treebankWordTokenizer.tokenize(text);
  for (var i = tokens.length; i--;) {
    var token = tokens[i].toLowerCase();
    if (token.length < 3 || ignores.indexOf(token) !== - 1 || /^\.+$/.test(token)) {
      tokens.splice(i, 1); // remove
      continue;
    }
    //tokens[i] = token.replace(/\.$|^'/, '').stem(); // remove punctuations
    tokens[i] = token.replace(/\.$|^'/, ''); // remove punctuations
  }
  return tokens;
  //return stripHtml(text).tokenizeAndStem();
};

var titleBlacklist = function(items) {
  for (var i = items.length; i--;) {
    item = items[i];
    /**
     * Black list
     */
    if (TITLE_BLACKLIST.test(item.title)) {
      items.splice(i, 1);
    }
  }
};

var isNumber = function(obj) {
  return (typeof obj) === 'number';
};

var createFeatureVector = function(item) {
  var j = 0;
  var k = '';
  var keywords = item.keywords || []; // key prefix: k
  var title = item.title || ''; // key prefix: t
  var summary = (item.summary && item.summary.content) || ''; // key prefix: s
  var categories = item.categories || [];
  var visual = item.visual || {};
  var featureVector = {
    img: 0 // 0 or 1
  }; // key: word, val:frequency
  if (isNumber(item.engagement)) {
    featureVector.engagement = item.engagement | 0;
  }
  if (isNumber(item.engagementRate)) {
    featureVector.engagementRate = item.engagementRate;
  }
  if (item.origin && item.origin.streamId) {
    k = 'o ' + item.origin.streamId;
    featureVector[k] = 4;
    item.origin.htmlUrl = undefined;
    item.origin.streamId = undefined;
  }
  if (item.language) {
    k = 'l ' + item.language;
    featureVector[k] = 1;
  }
  for (j = keywords.length; j--;) {
    k = 'k ' + keywords[j].trim().toLowerCase();
    featureVector[k] = 1; // keyword should not been seen more than once
  }
  item.must = 0;
  for (j = categories.length; j--;) {
    var catId = categories[j].id;
    if (catId) {
      k = 'c ' + catId;
      featureVector[k] = 1;
      if (catId.indexOf('global.must') !== - 1) {
        item.must = 1;
      }
    }
  }
  var titlePieces = tokenize(title);
  for (j = titlePieces.length; j--;) {
    k = 't ' + titlePieces[j];
    featureVector[k] = (featureVector[k] | 0) + 1;
  }
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
  return featureVector;
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
    this.scwPromise = new ScwPromise(userId, this.analyzePastReads.bind(this));
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
        var items = data.items;
        var item;
        titleBlacklist(items);
        for (var i = items.length; i--;) {
          item = items[i];
          var featureVector = createFeatureVector(item);
          item.scores = scw.calcScores(featureVector);
          item.score = (item.scores.viewSummary + item.scores.viewOriginal) / Object.keys(featureVector).length;
          if (item.canonical && item.canonical.href) {
            item.href = item.canonical.href;
          } else if (item.alternate && item.alternate.length && item.alternate[0].href) {
            item.href = item.alternate[0].href;
          } else if (item.originId) {
            item.href = item.originId;
          }
          item.published = item.published | 0;
          // delete unused data
          item.actionTimestamp = undefined;
          item.alternate = undefined;
          item.author = undefined;
          item.canonical = undefined;
          item.categories = undefined;
          item.content = undefined;
          item.crawled = undefined;
          item.engagement = undefined;
          item.engagementRate = undefined;
          item.fingerprint = undefined;
          item.keywords = undefined;
          item.language = undefined;
          item.originId = undefined;
          item.recrawled = undefined;
          item.sid = undefined;
          item.thumbnail = undefined;
          item.unread = undefined;
          item.updated = undefined;
          item.visual = undefined;
        }
        items.sort(function(a, b) {
          return b.must - a.must || b.score - a.score || b.featureVector.engagement - a.featureVector.engagement || b.published - a.published;
        });
        for (i = items.length; i--;) {
          item = items[i];
          console.log(item.title, item.score, scw.calcScores(item.featureVector));
          item.scores = undefined;
          item.score = undefined;
          item.must = undefined;
        }
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
    var CATEGORIES = ScwPromise.CATEGORIES;
    for (var i = data.length; i--;) {
      var datum = data[i];
      var category = datum.category = CATEGORIES[datum.state];
      if (category === NON_CATEGORY) {
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

/**
 *
 * @param options {Object}
 * @params callback {Function}
 */
Msr.prototype._getReads = function(options, callback) {
  options.streamId = url.join('user', this._results.id, 'tag', ID_READ);
  options.unreadOnly = 'false'; // has to be string to pass || operator
  this.getStreams(options, callback);
};

/**
 *
 * @param options {Object}
 * @params callback {Function}
 */
Msr.prototype.getReadIds = function(options, callback) {
  if (!options) {
    options = {};
    callback = function() {};
  }
  if (!callback) {
    callback(new Error('Msr.getReadIds Error'));
    return;
  }
  this._getReads(options, function(err, data, response) {
    if (!err) {
      var items = data.items;
      for (var i = items.length; i--;) {
        items[i] = items[i].id;
      }
    }
    callback(err, data, response);
  }.bind(this));
};

/**
 *
 * @param options {Object}
 * @params callback {Function}
 */
Msr.prototype.analyzePastReads = function(options, callback) {
  if (!options) {
    options = {};
    callback = function() {};
  }
  if (!callback) {
    callback(new Error('Msr.analyzePastReads Error'));
    return;
  }
  options.count = ANALYZE_COUNT;
  this._getReads(options, function(err, data, response) {
    if (!err) {
      var items = data.items;
      var results = [];
      var item;
      var i = 0;
      var j = 0;
      for (i = items.length; i--;) {
        if(!items[i].actionTimestamp) {
          items.splice(i, 1);
        }
      }
      items.sort(function(a, b) {
        return a.actionTimestamp - b.actionTimestamp;
      });
      for (i = items.length; i--;) {
        item = items[i];
        if (i) {
          for (j = i; j--;) {
            var item_below = items[j];
            if (item.actionTimestamp - item_below.actionTimestamp > 99) {
              break;
            }
          }
          if (i - j > 1) {
            items.splice(j + 1, i - j); // filter out articles marked as read together
          }
          i = j + 1;
        }
      }
      titleBlacklist(items);
      for (i = items.length; i--;) {
        item = items[i];
        results.push({
          category: 'viewOriginal',
          featureVector: createFeatureVector(item)
        });
      }
      data = results;
    }
    callback(err, data, response);
  }.bind(this));
};

/**
 * Graceful shutdown
 */
Msr.shutdown = ScwPromise.shutdown;
