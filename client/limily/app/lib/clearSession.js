exports = function() {
  Ti.API.debug('logout');
  Ti.Network.createHTTPClient().clearCookies(gBaseUrl);
};
