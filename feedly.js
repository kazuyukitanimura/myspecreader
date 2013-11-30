var CLIENT_ID = 'sandbox';
var CLIENT_SECRET = require('./secret').CLIENT_SECRET;
var AUTH_PATH = '/auth/auth';
var TOKEN_PATH = '/auth/token';
var API_VERSION = 'v3';
var API_SUBDOMAIN = 'sandbox'; // 'cloud';
var ID_ALL = 'global.all';
var ID_UNCATEGORIZED = 'global.uncategorized';
//var OAuth2 = require('simple-oauth2');
var OAuth2 = require('./oauth2');
var extend = require('node.extend');
var querystring = require('querystring');
var url = require('./url');
var feedlyUrlObj = {
  protocol: 'https',
  host: API_SUBDOMAIN + '.feedly.com'
};
var feedlyApi = url.format(feedlyUrlObj);

/**
 * Convenient Functions
 */
var isObject = function(obj) {
  return typeof obj === 'object';
};

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
  this._oa.useAuthorizationHeaderforGET(true);
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
 * @params callback {Function}
 */
Feedly.prototype.getAccessToken = function(code, params, callback) {
  this._oa.getOAuthAccessToken(code, extend({
    grant_type: 'authorization_code'
  },
  params), this._saveToken.bind(this, callback));
  //this._oa.AuthCode.getToken(extend({
  //  code: code
  //},
  //params), this._saveToken); // simple-oauth2
};

/**
 * Internal callback function to save a token
 */
Feedly.prototype._saveToken = function(callback, err, accessToken, refreshToken, results) {
  if (err) {
    err = this._normalizeError(err);
  } else {
    this._token = accessToken || refreshToken;
    //this._token = this._oa.AccessToken.create(accessToken); // simple-oauth2
    this._results = results;
  }
  if (callback) {
    callback(err, results);
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
  if (isObject(params)) {
    qs = querystring.stringify(params);
    api_path.pop();
  }
  api_path = url.join(OAUTH_CONFIG.RequestTokenUrl, api_path);
  return qs ? api_path + '?' + qs: api_path;
};

/**
 * Normalize the error as an Error object.
 *
 * @param err {Object} An object to be normalized
 */
Feedly.prototype._normalizeError = function(err) {
  if (err instanceof Error) {
    return err;
  } else if (err.statusCode) {
    // for 4XX/5XX error
    var e = new Error(err.statusCode);
    try {
      e.data = JSON.parse(err.data);
    } catch(er) {
      e.data = err.data;
    }
    return e;
  } else {
    // unknown error
    return new Error(err);
  }
};

Feedly.prototype._createResponseHandler = function(callback) {
  return function(error, data, response) {
    if (error) {
      return callback && callback(this._normalizeError(error), data, response);
    } else {
      var obj;
      if (data) {
        try {
          obj = JSON.parse(data);
        } catch(e) {
          obj = data;
          return callback(e, data, reponse);
        }
        return callback && callback(undefined, obj, response);
      } else {
        return callback && callback(undefined, data, response);
      }
    }
  }.bind(this);
};

/**
 *
 */
Feedly.prototype._get = function(api_url, callback) {
  console.log(api_url);
  this._oa.get(api_url, this._token, this._createResponseHandler(callback));
};

/**
 *
 */
Feedly.prototype._post = function(api_url, input, callback) {
  if (isObject(input)) {
    input = JSON.stringify(input);
  }
  console.log(api_url, input);
  this._oa.post(api_url, this._token, input, this._createResponseHandler(callback));
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
  var api_action = 'contents';
  var params = {
    count: options.count || 20,
    ranked: options.ranked || 'newest',
    //continuation: options.continuation || 'abc',
    streamId: options.streamId || url.join('user', this._results.id, 'category', ID_ALL), // ID_UNCATEGORIZED
    unreadOnly: options.unreadOnly || true
  };
  this._get(this._buildUrl(api_path, api_action, params), callback);
};

/**
 *
 */
Feedly.prototype.getSubscriptions = function(callback) {
  var api_path = 'subscriptions';
  this._get(this._buildUrl(api_path), callback);
};

/**
 *
 */
Feedly.prototype.postSubscriptions = function(input, callback) {
  var api_path = 'subscriptions';
  this._post(this._buildUrl(api_path), input, callback);
};

/**
 *
 */
Feedly.prototype.getSearch = function(options, callback) {
  if (!options) {
    options = {};
    callback = function() {};
  }
  if (!callback) {
    callback = options;
    options = {};
  }
  var api_path = 'search';
  var api_action = 'feeds';
  var params = {
    q: options.q || '',
    n: options.n || 20
  };
  this._get(this._buildUrl(api_path, api_action, params), callback);
};

