var CLIENT_ID = 'sandbox';
var CLIENT_SECRET = require('./secret').CLIENT_SECRET;
var AUTH_PATH = '/auth/auth';
var TOKEN_PATH = '/auth/token';
var API_VERSION = 'v3';
var API_SUBDOMAIN = 'sandbox'; // 'cloud';
//var OAuth2 = require('simple-oauth2');
var OAuth2 = require('oauth').OAuth2;
var extend = require('node.extend');
var path = require('path');
var querystring = require('querystring');
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
    pathname: API_VERSION
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
 * Get the first url to ask for authorization
 *
 * @param params {Object} {redirect_uri: 'http://localhost', scope: 'https://cloud.feedly.com/subscriptions', state: 'now' }
 */
Feedly.prototype.getAuthUrl = function(params) {
  return this._oa.getAuthorizeUrl(extend({
    response_type: 'code'
  },
  params));
  //return this._oa.AuthCode.authorizeURL(params); // simple-oauth2
};

/**
 * Get an access token and save
 *
 * @param code {String} code returned on feedly authorization
 * @param params {Object} {redirect_uri: 'http://localhost'}
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
 * Internal callback function to save a token
 */
Feedly.prototype._saveToken = function(err, accessToken, refreshToken, results) {
  if (err) {
    console.error('Access Token Error', err.message);
  } else {
    this._token = accessToken || refreshToken;
    //this._token = this._oa.AccessToken.create(accessToken); // simple-oauth2
    this._results = results;
    console.log(this._token);
  }
};

/**
 * Internal function to build the url with the specified path and params
 *
 * @params api_path {String} the path string.
 * @param params {Object} (optional) the query parameter object.
 */
Feedly.prototype._buildUrl = function() { //api_path, params
  var api_path = Array.prototype.slice.call(arguments);
  var params = api_path[api_path.length - 1];
  var qs;
  if (typeof params === 'object') {
    qs = querystring.stringify(params);
    api_path.pop();
  }
  api_path = path.join.apply(path, api_path);
  api_path = path.join(OAUTH_CONFIG.RequestTokenUrl, path.normalize(api_path));
  return qs ? api_path + '?' + qs: api_path;
};

/**
 *
 */
Feedly.prototype._get = function(url, callback) {
  this._oa.get(url, this._toekn, callback);
};

/**
 *
 */
Feedly.prototype.getStreams = function(options, callback) {
  if (!options) {
    options = {};
    callback = function() {};
  }
  if (!callback) {
    callback = options;
    options = {};
  }
  var api_path = 'streams';
  var api_action = 'id';
  var params = {
    //count: options.count || 20,
    //ranked: options.ranked || 'newest',
    //continuation: options.continuation || 'abc',
    streamId: options.streamId || 'all',
    unreadOnly: options.unreadOnly || true
  };
  this._get(this._buildUrl(api_path, api_action, params), callback);
};

