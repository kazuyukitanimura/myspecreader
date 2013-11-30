var Url = module.exports = require('url');

/**
 * Recursively flatten a nested array and create an url
 */
Url.prototype.join = function() {
  return Array.prototype.slice.call(arguments).reduce(function(x, y) {
    if (Array.isArray(x)) {
      x = this.join(x);
    }
    if (Array.isArray(y)) {
      y = this.join(y);
    }
    return x.trim().replace(/\/$/, '') + '/' + y.trim().replace(/^\//, '');
  });
};

