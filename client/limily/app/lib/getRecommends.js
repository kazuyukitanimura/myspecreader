var setImage = require('cacheImage').setImage;
var url = gBaseUrl + '/recommends';
var recommends = Alloy.Collections.instance('recommends'); // this needs to stay here for controllers/rows.js
var client = Ti.Network.createHTTPClient({
  autoRedirect: false,
  timeout: 64 * 1000 // in milliseconds
});
function toThumb(blob) {
  return blob.imageAsThumbnail(90, 0, 0);
}
client.setOnload(function() { // on success
  Ti.API.debug('sucess getReccomends');
  try {
    var db = Ti.Database.open('recommends');
    var items = JSON.parse(this.responseText).items;
    var table = recommends.config.adapter.collection_name;
    var defaultState = recommends.config.defaults.state;
    for (var i = items.length; i--;) {
      var item = items[i];
      var id = item.id;
      // UPSERT code http://stackoverflow.com/questions/418898/sqlite-upsert-not-insert-or-replace
      // the order of saving to sqlite is important
      // the larger rowid, the newer (higher priority)
      // experimentally confirmed that the save() monotonically increase its rowid even for existing row
      // by sorting by rowid, we can always get the newest sorted ranking
      db.execute(['INSERT OR REPLACE INTO ', table, ' (id, state, data) VALUES (?, COALESCE((SELECT state FROM ', table, ' WHERE id = ?), ', defaultState , '), ?)'].join(''), id, id, JSON.stringify(item));
      setImage(item.img);
      setImage(item.img, 'thumb', toThumb);
    }
    db.close();
    // TODO delte this test code
    //var rr = Alloy.createCollection('recommends');
    //rr.fetch({query: 'SELECT id, rowid, state, data FROM ' + recommends.config.adapter.collection_name});
    //rr.each(function(r){
    //  console.log(r.get('id'), r.get('rowid'), r.get('state'), r.get('data'));
    //});
  } catch(err) {
    Ti.API.error(err);
    Ti.API.debug(this.responseText);
  }
});
client.setOnerror(function(e) { // on error including a timeout
  Ti.API.debug(e.error);
  client.timeout = Math.min(client.timeout * 2, 32 * 1000); // Max 32sec
});

var getRecommends = function() {
  //Ti.API.debug('getRecommends invoked!');
  // silently ignore this if there's no network connection
  if (!Ti.Network.online) {
    return;
  }
  client.open('GET', url);
  client.send();
};

exports = getRecommends;
