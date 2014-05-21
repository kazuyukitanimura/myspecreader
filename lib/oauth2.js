var zlib = require('zlib');
var OAuth2 = module.exports = require('oauth').OAuth2;

OAuth2.prototype.sendJSON = function(method, url, access_token, body, callback) {
  var headers = {
    'Content-Type': 'application/json'
  };
  if (this._useAuthorizationHeaderForGET) {
    headers.Authorization = this.buildAuthHeader(access_token);
    access_token = null;
  }
  if (body) {
    headers['Content-Encoding'] = 'deflate';
    zlib.deflate(body, function(err, buffer) {
      if (err) {
        callback(err);
      } else {
        this._request(method, url, headers, buffer, access_token, callback);
      }
    }.bind(this));
  } else {
    this._request(method, url, headers, body, access_token, callback);
  }
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
