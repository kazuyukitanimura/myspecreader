var getReadIds = require('getReadIds');
var getStars = require('getStars');
var setImage = require('cacheImage').setImage;
var url = gBaseUrl + '/recommends';
var recommends = Alloy.Collections.instance(DB);
var TABLE = recommends.config.adapter.collection_name;
var STATES = recommends.config.STATES;
var unreadState = STATES.UNREAD;
var client = Ti.Network.createHTTPClient({
  autoRedirect: false,
  timeout: 64 * 1000, // in milliseconds
  onerror: function(e) { // on error including a timeout, has to be defined before setOnload
    Ti.API.debug(e.error);
    this.timeout = Math.min(this.timeout * 2, 256 * 1000); // Max 256sec
  },
  enableKeepAlive: true
});
function toThumb(blob) {
  return blob.imageAsThumbnail(90, 0, 0);
}
client.setOnload(function(e) { // on success
  Ti.API.debug('sucess getReccomends');
  if (this.status >= 400) { // workaround
    if (this.onerror) {
      this.onerror(e);
    }
    return;
  }
  try {
    var items = JSON.parse(this.responseText).items;
    // UPSERT code http://stackoverflow.com/questions/418898/sqlite-upsert-not-insert-or-replace
    // the order of saving to sqlite is important
    // the larger rowid, the newer (higher priority)
    // experimentally confirmed that the save() monotonically increase its rowid even for existing row
    // by sorting by rowid, we can always get the newest sorted ranking
    var sql = ['INSERT OR REPLACE INTO', TABLE, '(id, state, data) VALUES '].join(' ');
    // http://stackoverflow.com/questions/1609637/is-it-possible-to-insert-multiple-rows-at-a-time-in-an-sqlite-database
    var sqlVal = ['(?, COALESCE((SELECT state FROM ', TABLE, ' WHERE id = ?), ', unreadState , '), ?)'].join('');
    var sqls = [];
    var sqlArgs = [];
    for (var i = items.length; i--;) {
      var item = items[i];
      var id = item.id;
      sqls.push(sqlVal);
      sqlArgs.push(id);
      sqlArgs.push(id);
      sqlArgs.push(JSON.stringify(item));
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

var getRecommends = function() {
  //Ti.API.debug('getRecommends invoked!');
  // silently ignore this if there's no network connection
  if (!Ti.Network.online) {
    return;
  }
  client.open('GET', url);
  client.send();
  getReadIds();
  getStars();
};

exports = getRecommends;
