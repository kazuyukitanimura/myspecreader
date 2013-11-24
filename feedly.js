var CLIENT_ID = 'sandbox';
var CLIENT_SECRET = '';
var AUTH_PATH = '/auth/auth';
var TOKEN_PATH = '/auth/token';
var API_VERSION = 'v3';
var API_SUBDOMAIN = 'sandbox'; // 'cloud';
//var OAuth2 = require('simple-oauth2');
var OAuth2 = require('oauth').OAuth2;
var extend = require('node.extend');
var url = require('url');
var feedlyUrlObj = {
  protocol: 'http',
  host: API_SUBDOMAIN + '.feedly.com'
};
var feedlyApi = url.format(feedlyUrlObj);

/**
 * OAuth Configuration constants
 */
var OAUTH_CONFIG = {
  ClientId: CLIENT_ID,
  ClientSecret: CLIENT_SECRET,
  RequestTokenUrl: url.format(extend({
    pathname: '/' + API_VERSION
  },
  feedlyUrlObj)),
  AuthPath: AUTH_PATH,
  TokenPath: TOKEN_PATH
};

/**
 * Feedly API Client
 *
 * @param options {Object} API behavior options
 */
var Feedly = module.exports = function(options) {
  if (!options) {
    options = {};
  }
  if (! (this instanceof Feedly)) { // enforcing new
    return new Feedly(options);
  }

  this._oa = new OAuth2(OAUTH_CONFIG.ClientId, OAUTH_CONFIG.ClientSecret, OAUTH_CONFIG.RequestTokenUrl, OAUTH_CONFIG.AuthPath, OAUTH_CONFIG.TokenPath);
  //this._oa = new OAuth2({
  //  clientID: OAUTH_CONFIG.ClientId,
  //  clientSecret: OAUTH_CONFIG.ClientSecret,
  //  site: OAUTH_CONFIG.RequestTokenUrl,
  //  tokenPath: OAUTH_CONFIG.TokenPath,
  //  authorizationPath: OAUTH_CONFIG.AuthPath,
  //  useBasicAuthorizationHeader: false
  //}); // simple-oauth2
  //this.accessKey = options.accessKey;
  //this.accessSecret = options.accessSecret;
  this._token = options._token;
  this._results = options._results;
  //this._apiUrl = options._apiUrl || API_URL;
  //this._streamUrl = options._streamUrl || STREAM_URL;
};

/**
 *
 */
Feedly.prototype.getAuthUrl = function(params) {
  return this._oa.getAuthorizeUrl(extend({
    response_type: 'code'
  },
  params));
  //return this._oa.AuthCode.authorizeURL(params); // simple-oauth2
};

/**
 *
 */
Feedly.prototype.getAccessToken = function(code, params) {
  this._oa.getOAuthAccessToken(code, extend({
    grant_type: 'authorization_code'
  },
  params), this._saveToken);
  //this._oa.AuthCode.getToken(extend({
  //  code: code
  //},
  //params), this._saveToken); // simple-oauth2
};

/**
 *
 */
Feedly.prototype._saveToken = function(err, accessToken, refreshToken, results) {
  if (err) {
    console.log('Access Token Error', err.message);
  } else {
    this._token = accessToken || refreshToken;
    //this._token = this._oa.AccessToken.create(accessToken); // simple-oauth2
    this._results = results;
  }
};

