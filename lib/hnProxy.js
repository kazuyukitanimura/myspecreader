var request = require('request');
var cheerio = require('cheerio');
var RSVP = require('rsvp');

var HnProxy = module.exports = function(url) {
  if (! (this instanceof HnProxy)) { // enforcing new
    return new HnProxy(url);
  }
  RSVP.Promise.call(this, function(resolve, reject) {
    request(url, function(err, res, body) {
      if (err || res.statusCode !== 200) {
        reject(err);
      } else {
        var $ = cheerio.load(body);
        var results = {};
        results.summary = $('head meta[property*="description"], head meta[name*="description"]').attr('content');
        results.image = $('head meta[property*="image"]').attr('content');
        resolve(results);
      }
    });
  });
};
HnProxy.prototype = Object.create(RSVP.Promise.prototype);
