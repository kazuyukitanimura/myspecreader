var Url = module.exports = require('url');

/**
 * Recursively flatten a nested array and create an url
 */
Url.join = function() {
  return Array.prototype.slice.call(arguments).reduce(function(x, y) {
    if (Array.isArray(x)) {
      x = Url.join.apply(null, x);
    }
    if (Array.isArray(y)) {
      y = Url.join.apply(null, y);
    }
    return x.trim().replace(/\/$/, '') + '/' + y.trim().replace(/^\//, '');
  });
};
