var RSVP = require('rsvp');
var Scw = require('./scw');
var redis = require('./redis');

var GLOBAL_USER_ID = 'global';

var SCW_PARAMS = {
  ETA: 10.0,
  // 100.0
  C: 1.0,
  MODE: 2 // 0, 1, or 2
};

var NON_CATEGORY = Scw.NON_CATEGORY;
var NON_CATEGORY_SCORE = Scw.NON_CATEGORY_SCORE;
var CATEGORIES = [Scw.NON_CATEGORY, 'pass', 'viewSummary', 'viewOriginal', 'star'];
var CATEGORIES_LEN = CATEGORIES.length;
// DO NOT CHANGE THE ORDER OR DELETE MEMBERS
// undefined: none of the categories
// through: was not opend by showing only title
// summary: summary was read by clicking title but the original contents were not viewed
// original: summary was read and original contents were opened
// star: starred
var CATEGORY_LOOKUP = {};
for (var i = CATEGORIES_LEN; i--;) {
  CATEGORY_LOOKUP[CATEGORIES[i]] = i;
}

// global singleton for global scw
var gScw;

var originalTrain = Scw.prototype.train;
Scw.prototype.train = function(data, callback) {
  originalTrain.call(this, function(trainCallback) {
    for (var i = data.length; i--;) {
      trainCallback(data[i]);
    }
  });
  originalTrain.call(gScw, function(trainCallback) {
    for (var i = data.length; i--;) {
      trainCallback(data[i]);
    }
  });

  redis.saveMatricies(this.userId, CATEGORIES, this.covarianceMatrix, this.weightMatrix, callback || function() {});
  redis.saveMatricies(GLOBAL_USER_ID, CATEGORIES, gScw.covarianceMatrix, gScw.weightMatrix, function() {});
};

redis.loadMatricies(GLOBAL_USER_ID, CATEGORIES, function(err, scwOptions) { // sync method?
  if (err) {
    console.error(err);
  } else {
    gScw = new Scw(SCW_PARAMS.ETA, SCW_PARAMS.C, SCW_PARAMS.MODE, scwOptions);
  }
});

var ScwPromise = module.exports = function(userId, analyzePastReads) {
  if (! (this instanceof ScwPromise)) { // enforcing new
    return new ScwPromise(userId);
  }
  RSVP.Promise.call(this, function(resolve, reject) {
    redis.loadMatricies(userId, CATEGORIES, function(err, scwOptions) {
      if (err) {
        // If an error occurs, the user of this class is responsible to call renew this insrance
        console.error(err);
        reject(err);
      } else {
        if (!Object.keys(scwOptions.covarianceMatrix[NON_CATEGORY]).length) {
          scwOptions = gScw; // copy a global scwOptions if scwOptions is empty
        }
        var scw = this.scw = new Scw(SCW_PARAMS.ETA, SCW_PARAMS.C, SCW_PARAMS.MODE, scwOptions);
        scw.userId = userId;
        if (scwOptions === gScw && analyzePastReads) {
          // For the first time user, train from the past read articles
          analyzePastReads({}, function(err, data, response) {
            if (err) {
              reject(err);
            } else {
              scw.train(data, function(err) {
                if (err) {
                  reject(err);
                } else {
                  resolve(scw);
                }
              });
            }
          });
        } else {
          resolve(scw);
        }
      }
    }.bind(this));
  });
};
ScwPromise.prototype = Object.create(RSVP.Promise.prototype);
ScwPromise.NON_CATEGORY = NON_CATEGORY;
ScwPromise.CATEGORIES = CATEGORIES;
ScwPromise.CATEGORY_LOOKUP = CATEGORY_LOOKUP;
ScwPromise.shutdown = redis.quit.bind(redis);
