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
var ID_SAVED = 'global.saved';
var TITLE_BLACKLIST = /^(AD|PR)\s*:/i;

/**
 * Convenient functions
 */
var max = Math.max;

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

var normalizedFrequency = function(array, prefix, dest) {
  var i = 0;
  var k = '';
  var maxFreq = 1;
  var tmpArray = [];
  for (i = array.length; i--;) {
    k = prefix + array[i];
    if (!dest[k]) {
      tmpArray.push(k);
      dest[k] = 1;
    } else {
      maxFreq = max(++dest[k], maxFreq);
    }
  }
  if (maxFreq > 1) {
    for (i = tmpArray.length; i--;) {
      dest[tmpArray[i]] /= maxFreq;
    }
  }
};

var createFeatureVector = function(item) {
  var j = 0;
  var k = '';
  var l = 0;
  var keywords = item.keywords || []; // key prefix: k
  var title = item.title || ''; // key prefix: t
  var summary = (item.summary && item.summary.content) || ''; // key prefix: s
  var categories = item.categories || [];
  var visual = item.visual || {};
  var featureVector = {
    img: 0 // 0 or 1
  }; // key: word, val:frequency
  if (isNumber(item.engagementRate)) {
    featureVector.engagementRate = item.engagementRate;
  }
  if (item.origin && item.origin.streamId) {
    k = 'o ' + item.origin.streamId;
    featureVector[k] = 2;
  }
  if (item.origin && item.origin.title) {
    item.src = item.origin.title;
  }
  if (item.language) {
    k = 'l ' + item.language;
    featureVector[k] = 1;
  }
  for (j = l = keywords.length; j--;) {
    k = 'k ' + keywords[j].trim().toLowerCase();
    featureVector[k] = 1 / l; // keyword should not been seen more than once
  }
  item.must = 0;
  for (j = l = categories.length; j--;) {
    var catId = categories[j].id;
    if (catId) {
      k = 'c ' + catId;
      featureVector[k] = 1 / l;
      if (catId.indexOf('global.must') !== - 1) {
        item.must = 1;
      }
    }
  }
  normalizedFrequency(tokenize(title), 't ', featureVector);
  if (visual.url && visual.url !== 'none') {
    item.img = visual.url;
    featureVector.img = 1;
  }
  summary = item.summary = stripHtml(summary);
  normalizedFrequency(tokenize(summary), 's ', featureVector);
  item.featureVector = featureVector;

  // some convenience
  if (item.canonical && item.canonical.href) {
    item.href = item.canonical.href;
  } else if (item.alternate && item.alternate.length && item.alternate[0].href) {
    item.href = item.alternate[0].href;
  } else if (item.originId) {
    item.href = item.originId;
  }
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
  item.origin = undefined;
  item.originId = undefined;
  item.recrawled = undefined;
  item.sid = undefined;
  item.thumbnail = undefined;
  item.unread = undefined;
  item.updated = undefined;
  item.visual = undefined;
  return featureVector;
};

var sortComp = function(a, b) {
  return b.must - a.must || b.score - a.score || b.featureVector.engagementRate - a.featureVector.engagementRate || b.published - a.published;
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
          item.score = (max(item.scores.viewSummary, 0.0) + max(item.scores.viewOriginal, 0.0) + max(item.scores.star, 0.0)) || max(max(item.scores.viewSummary, item.scores.viewOriginal), item.scores.star);
          //item.published = item.published | 0;
        }
        items = data.items = items.sort(sortComp).slice(0, 128);
        for (i = items.length; i--;) {
          item = items[i];
          console.log(item.title, item.featureVector.engagementRate, item.score, scw.calcScores(item.featureVector)); // TODO delete this after debugging
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
      }.bind(this)),
      unsaved: new RSVP.Promise(function(resolve, reject) {
        this.deleteSaved(unstars, function(err) {
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
  this._getReads(options, function(err, data, response) {
    if (!err) {
      var items = data.items;
      var results = [];
      var item;
      var i = 0;
      var j = 0;
      for (i = items.length; i--;) {
        if (!items[i].actionTimestamp) {
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
 *
 * @param options {Object}
 * @params callback {Function}
 */
Msr.prototype.getStars = function(options, callback) {
  if (!options) {
    options = {};
    callback = function() {};
  }
  if (!callback) {
    callback(new Error('Msr.getStars Error'));
    return;
  }
  options.streamId = url.join('user', this._results.id, 'tag', ID_SAVED);
  options.unreadOnly = 'false'; // has to be string to pass || operator
  this.getStreams(options, function(err, data, response) {
    if (!err) {
      var items = data.items;
      var item;
      for (var i = items.length; i--;) {
        item = items[i];
        createFeatureVector(item);
        item.must = undefined;
      }
    }
    callback(err, data, response);
  }.bind(this));
};

/**
 * Graceful shutdown
 */
Msr.shutdown = ScwPromise.shutdown;
