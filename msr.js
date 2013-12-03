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
  if (options.id) { // update covarianceMatrix and weightMatrix from DB by options.id
    var scwOptions = {
      covarianceMatrix: undefined,
      weightMatrix: undefined
    };
    // TODO use https://github.com/caolan/async#parallel or https://github.com/tildeio/rsvp.js
    // fetch matrices asynchronously
    this.scw = new Scw(SCW_PARAMS.ETA, SCW_PARAMS.C.SCW_PARAMS.MODE, scwOptions);
  }
};
Msr.prototype = Object.create(Msr.prototype); // Inheritance ECMAScript 5 for Object.create

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
      var items = data.itmes;
      var scw = this.scw;
      for (var i = items.length; i--;) {
        var item = items[i];
        var keywords = item.keywords;
        var title = item.title;
        var summary = item.summary.content;
        var published = item.published;
        var originId = item.origin.streamId;

        var featureVector = {};
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

