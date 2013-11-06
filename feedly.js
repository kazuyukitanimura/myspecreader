var extend = require('node.extend');
var OAuth2 = require('oauth').OAuth2;
var url = require('url');
var feedlyUrlObj = {
  protocol: 'http',
  host: 'cloud.feedly.com'
};
var feedlyApi = url.format(feedlyUrlObj);

/**
 * OAuth Configuration constants
 */
var OAUTH_CONFIG = {
  RequestTokenUrl: url.format(extend({
    pathname: '/v3'
  },
  feedlyUrlObj)),
  AccessTokenUrl: ''
};

/**
 * Twitter API Client
 *
 * @param consumerKey {String} consumerKey OAuth Consumer Key
 * @param consumerSecret {String} consumerSecret OAuth Consumer Secret
 * @param options {Object} API behavior options
 */
var Feedly = module.exports = function(consumerKey, consumerSecret, options) {
  if (!options) {
    options = {};
  }
  if (! (this instanceof Feedly)) { // enforcing new
    return new Feedly(consumerKey, consumerSecret, options);
  }

  this._oa = new OAuth(consumerKey, consumerSecret, OAUTH_CONFIG.RequestTokenUrl, '/auth/auth', '/auth/toekn', null);
  this.accessKey = options.accessKey;
  this.accessSecret = options.accessSecret;
  this._token = options._token;
  this._token_secret = options._token_secret;
  this._results = options._results;

  this._apiUrl = options._apiUrl || API_URL;
  this._streamUrl = options._streamUrl || STREAM_URL;
};

