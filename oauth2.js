var OAuth2 = module.exports = require('oauth').OAuth2;

OAuth2.prototype.post = function(url, access_token, post_body, callback) {
  var headers = {
    'Content-Type': 'application/json'
  };
  if (this._useAuthorizationHeaderForGET) {
    headers.Authorization = this.buildAuthHeader(access_token);
    access_token = null;
  }
  this._request("POST", url, headers, post_body, access_token, callback);
};

