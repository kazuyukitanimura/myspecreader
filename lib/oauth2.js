//var zlib = require('zlib');
var OAuth2 = module.exports = require('oauth').OAuth2;

OAuth2.prototype.sendJSON = function(method, url, access_token, body, callback) {
  var headers = {
    'Content-Type': 'application/json',
    Authorization: this.buildAuthHeader(access_token)
  };
  access_token = null;
  // XXX Feedly does not seem to take either deflate nor gzip
  //if (body) {
  //  headers['Content-Encoding'] = 'deflate';
  //  zlib.deflate(body, function(err, buffer) {
  //    if (err) {
  //      callback(err);
  //    } else {
  //      this._request(method, url, headers, buffer, access_token, callback);
  //    }
  //  }.bind(this));
  //} else {
  //  this._request(method, url, headers, body, access_token, callback);
  //}
  this._request(method, url, headers, body, access_token, callback);
};

OAuth2.prototype.get = function(url, access_token, callback) {
  var headers = {
    'Accept-Encoding': 'deflate, gzip',
    Authorization: this.buildAuthHeader(access_token)
  };
  access_token = null;
  this._request('GET', url, headers, '', access_token, callback);
};

OAuth2.prototype.post = function(url, access_token, post_body, callback) {
  this.sendJSON('POST', url, access_token, post_body, callback);
};

OAuth2.prototype.put = function(url, access_token, put_body, callback) {
  this.sendJSON('PUT', url, access_token, put_body, callback);
};

OAuth2.prototype.del = function(url, access_token, callback) {
  this.sendJSON('DELETE', url, access_token, '', callback);
};
