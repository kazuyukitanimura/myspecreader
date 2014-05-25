var CLIENT_ID = 'sandbox';
var CLIENT_SECRET = require('../secret').CLIENT_SECRET || '0AUDIAHZEB0ISJ1JLFWZ';
var AUTH_PATH = '/auth/auth';
var TOKEN_PATH = '/auth/token';
var API_VERSION = 'v3';
var API_SUBDOMAIN = 'sandbox'; // 'cloud';
var ID_ALL = 'global.all';
var ID_UNCATEGORIZED = 'global.uncategorized';
var ID_SAVED = 'global.saved';
var STREAM_COUNT = 2048;
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
var isFunction = function(obj) {
  return typeof obj === 'function';
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
  this._token = options.access_token || options.refresh_token;
  this._results = options;
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
};

/**
 * Get an access token and save
 *
 * @param code {String} code returned on feedly authorization
 * @param params {Object} {redirect_uri: 'http://localhost'}
 * @params callback {Function}
 */
Feedly.prototype.getAccessToken = function(code, params, callback) {
  if (isFunction(params) && ! callback) {
    callback = params;
    params = {};
  }
  this._oa.getOAuthAccessToken(code, extend({
    grant_type: 'authorization_code'
  },
  params), this._saveToken.bind(this, callback));
};

/**
 * Internal callback function to save a token
 */
Feedly.prototype._saveToken = function(callback, err, accessToken, refreshToken, results) {
  if (err) {
    err = this._normalizeError(err);
  } else {
    this._token = accessToken || refreshToken;
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
  var qs = '';
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

/**
 * Internal function to organize the data to pass to callback
 *
 * @params callback {Function}
 */
Feedly.prototype._createResponseHandler = function(callback) {
  return function(error, data, response) {
    if (!callback) {
      return;
    } else if (error) {
      return callback(this._normalizeError(error), data, response);
    } else if (data) {
      try {
        return callback(undefined, JSON.parse(data), response);
      } catch(e) {
        return callback(e, data, response);
      }
    } else {
      return callback(undefined, data, response);
    }
  }.bind(this);
};

/**
 * Internal function to perfrom http get
 *
 * @param url {String} http get url including http...
 * @params callback {Function}
 */
Feedly.prototype._get = function(api_url, callback) {
  console.log(api_url);
  this._oa.get(api_url, this._token, this._createResponseHandler(callback));
};

/**
 * Internal function to perfrom http post
 *
 * @param url {String} http post url including http...
 * @param postBody {String} or {Object} http post body
 * @params callback {Function}
 */
Feedly.prototype._post = function(api_url, postBody, callback) {
  if (isObject(postBody)) {
    postBody = JSON.stringify(postBody);
  }
  console.log(api_url, postBody);
  this._oa.post(api_url, this._token, postBody, this._createResponseHandler(callback));
};

/**
 * Internal function to perfrom http put
 *
 * @param url {String} http put url including http...
 * @param putBody {String} or {Object} http put body
 * @params callback {Function}
 */
Feedly.prototype._put = function(api_url, putBody, callback) {
  if (isObject(putBody)) {
    putBody = JSON.stringify(putBody);
  }
  console.log(api_url, putBody);
  this._oa.put(api_url, this._token, putBody, this._createResponseHandler(callback));
};

/**
 * Internal function to perfrom http delete
 *
 * @param url {String} http put url including http...
 * @param putBody {String} or {Object} http put body
 * @params callback {Function}
 */
Feedly.prototype._delete = function(api_url, callback) {
  console.log(api_url);
  this._oa.del(api_url, this._token, this._createResponseHandler(callback));
};

/**
 *
 *
 * @param options {Object}
 * @params callback {Function}
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
    count: options.count || STREAM_COUNT,
    ranked: options.ranked || 'newest',
    //continuation: options.continuation || 'abc',
    streamId: encodeURIComponent(options.streamId || url.join('user', this._results.id, 'category', ID_ALL)),
    unreadOnly: options.unreadOnly || true
  };
  this._get(this._buildUrl(api_path, api_action, params), callback);
};

/**
 *
 * @params callback {Function}
 */
Feedly.prototype.getSubscriptions = function(options, callback) {
  if (!options) {
    options = {};
    callback = function() {};
  }
  if (!callback) {
    callback = options;
    options = {};
  }
  var api_path = 'subscriptions';
  this._get(this._buildUrl(api_path), callback);
};

/**
 *
 * @param postBody {String} or {Object} http post body
 * @params callback {Function}
 */
Feedly.prototype.postSubscriptions = function(postBody, callback) {
  var api_path = 'subscriptions';
  this._post(this._buildUrl(api_path), postBody, callback);
};

/**
 *
 * @param options {Object}
 * @params callback {Function}
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

/**
 *
 * @param ids {Array} or {String} of entries
 * @param action {String} 'markAsRead' or 'keepUnread'
 * @params callback {Function}
 */
Feedly.prototype.postMarkers = function(ids, action, callback) {
  if (!ids || ! ids.length) {
    callback();
    return;
  }
  if (!Array.isArray(ids)) {
    ids = [ids];
  }
  var api_path = 'markers';
  var postBody = {
    'action': action,
    'type': 'entries',
    'entryIds': ids
  };
  this._post(this._buildUrl(api_path), postBody, callback);
};

/**
 *
 * @param ids {Array} or {String} of entries to mark as read
 * @params callback {Function}
 */
Feedly.prototype.postMarkAsRead = function(ids, callback) {
  this.postMarkers(ids, 'markAsRead', callback);
};

/**
 *
 * @param ids {Array} or {String} of entries to keep unread
 * @params callback {Function}
 */
Feedly.prototype.postKeepUnread = function(ids, callback) {
  this.postMarkers(ids, 'keepUnread', callback);
};

/**
 *
 * @param ids {Array} or {String} of entries to tag
 * @param tagId {String} to tag
 * @params callback {Function}
 */
Feedly.prototype.putTags = function(ids, tagId, callback) {
  if (!ids || ! ids.length) {
    callback();
    return;
  }
  if (!Array.isArray(ids)) {
    ids = [ids];
  }
  var api_path = url.join('tags', encodeURIComponent(tagId));
  var putBody = {
    'entryIds': ids
  };
  this._put(this._buildUrl(api_path), putBody, callback);
};

/**
 *
 * @param ids {Array} or {String} of entries to tag
 * @param tagId {String} to tag
 * @params callback {Function}
 */
Feedly.prototype.deleteTags = function(ids, tagId, callback) {
  if (!ids || ! ids.length) {
    callback();
    return;
  }
  if (!Array.isArray(ids)) {
    ids = [ids];
  }
  for (var i = ids.length; i--;) {
    ids[i] = encodeURIComponent(ids[i]);
  }
  var api_path = url.join('tags', encodeURIComponent(tagId), ids.join(','));
  this._delete(this._buildUrl(api_path), callback);
};

/**
 *
 * @param ids {Array} or {String} of entries to mark as read
 * @params callback {Function}
 */
Feedly.prototype.putSaved = function(ids, callback) {
  var tagId = url.join('user', this._results.id, 'tag', ID_SAVED);
  this.putTags(ids, tagId, callback);
};

/**
 *
 * @param ids {Array} or {String} of entries to mark as read
 * @params callback {Function}
 */
Feedly.prototype.deleteSaved = function(ids, callback) {
  var tagId = url.join('user', this._results.id, 'tag', ID_SAVED);
  this.deleteTags(ids, tagId, callback);
};
