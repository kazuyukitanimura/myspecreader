var setImage = require('cacheImage').setImage;
var url = gBaseUrl + '/stars';
var recommends = Alloy.Collections.instance(DB);
var TABLE = recommends.config.adapter.collection_name;
var STATES = recommends.config.STATES;
var starState = STATES.STAR;
var client = Ti.Network.createHTTPClient({
  autoRedirect: false,
  timeout: 64 * 1000, // in milliseconds
  onerror: function(e) { // on error including a timeout, has to be defined before setOnload
    Ti.API.debug(e.error);
    this.timeout = Math.min(this.timeout * 2, 256 * 1000); // Max 256sec
  },
  enableKeepAlive: true
});
client.setOnload(function() { // on success
  Ti.API.debug('sucess getStars');
  if (this.status >= 400) { // workaround
    if (this.onerror) {
      this.onerror(e);
    }
    return;
  }
  try {
    var items = JSON.parse(this.responseText).items;
    // see lib/getRecommends.js
    var sql = ['INSERT OR REPLACE INTO', TABLE, '(id, state, data) VALUES '].join(' ');
    var sqlVal = ['(?, COALESCE((SELECT state FROM ', TABLE, ' WHERE id = ?), ', starState , '), ?)'].join('');
    var sqls = [];
    var sqlArgs = [];
    for (var i = items.length; i--;) {
      var item = items[i];
      var id = item.id;
      sqls.push(sqlVal);
      sqlArgs.push(id);
      sqlArgs.push(id);
      sqlArgs.push(JSON.stringify(item));
      setImage(item.img);
      setImage(item.img, 'thumb', toThumb);
    }
    if (items.length) {
      var db = Ti.Database.open(DB);
      db.execute.apply(db, [sql + sqls.join(', ')].concat(sqlArgs));
      db.close();
    }
  } catch(err) {
    Ti.API.error(err);
    //Ti.API.debug(this.responseText);
  }
});

var getStars = function() {
  // silently ignore this if there's no network connection
  if (!Ti.Network.online) {
    return;
  }
  client.open('GET', url);
  client.send();
};

exports = getStars;
