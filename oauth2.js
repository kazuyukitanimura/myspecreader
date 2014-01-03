var OAuth2 = module.exports = require('oauth').OAuth2;

OAuth2.prototype.sendJSON = function(method, url, access_token, body, callback) {
  var headers = {
    'Content-Type': 'application/json'
  };
  if (this._useAuthorizationHeaderForGET) {
    headers.Authorization = this.buildAuthHeader(access_token);
    access_token = null;
  }
  this._request(method, url, headers, body, access_token, callback);
};

OAuth2.prototype.post = function(url, access_token, post_body, callback) {
  this.sendJSON('POST', url, access_token, post_body, callback);
};

OAuth2.prototype.put = function(url, access_token, put_body, callback) {
  this.sendJSON('PUT', url, access_token, put_body, callback);
};
