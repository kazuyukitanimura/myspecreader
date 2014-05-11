var url = gBaseUrl + '/readids';
var recommends = Alloy.Collections.instance(DB);
var TABLE = recommends.config.adapter.collection_name;
var client = Ti.Network.createHTTPClient({
  autoRedirect: false,
  timeout: 64 * 1000 // in milliseconds
});
client.setOnload(function() { // on success
  Ti.API.debug('sucess getReadIds');
  try {
    var db = Ti.Database.open(DB);
    var ids = JSON.parse(this.responseText).items;
    db.execute(['DELETE FROM ', TABLE, ' WHERE id IN ("', ids.join('", "'), '")'].join(''));
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

var getReadIds = function() {
  // silently ignore this if there's no network connection
  if (!Ti.Network.online) {
    return;
  }
  client.open('GET', url);
  client.send();
};

exports = getReadIds;
