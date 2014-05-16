var setImage = require('cacheImage').setImage;
var url = gBaseUrl + '/stars';
var recommends = Alloy.Collections.instance(DB);
var TABLE = recommends.config.adapter.collection_name;
var STATES = recommends.config.STATES;
var starState = STATES.STAR;
var client = Ti.Network.createHTTPClient({
  autoRedirect: false,
  timeout: 64 * 1000 // in milliseconds
});
client.setOnload(function() { // on success
  Ti.API.debug('sucess getStars');
  try {
    var db = Ti.Database.open(DB);
    var items = JSON.parse(this.responseText).items;
    for (var i = items.length; i--;) {
      var item = items[i];
      var id = item.id;
      // see lib/getRecommends.js
      db.execute(['INSERT OR REPLACE INTO ', TABLE, ' (id, state, data) VALUES (?, COALESCE((SELECT state FROM ', TABLE, ' WHERE id = ?), ', starState , '), ?)'].join(''), id, id, JSON.stringify(item));
      setImage(item.img);
      setImage(item.img, 'thumb', toThumb);
    }
    db.close();
  } catch(err) {
    Ti.API.error(err);
    Ti.API.debug(this.responseText);
  }
});
client.setOnerror(function(e) { // on error including a timeout
  Ti.API.debug(e.error);
  client.timeout = Math.min(client.timeout * 2, 256 * 1000); // Max 256sec
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
