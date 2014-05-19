var url = gBaseUrl + '/readids';
var recommends = Alloy.Collections.instance(DB);
var TABLE = recommends.config.adapter.collection_name;
var STATES = recommends.config.STATES;
var client = Ti.Network.createHTTPClient({
  autoRedirect: false,
  timeout: 64 * 1000, // in milliseconds
  onerror: function(e) { // on error including a timeout, has to be defined before setOnload
    Ti.API.debug(e.error);
    this.timeout = Math.min(this.timeout * 2, 256 * 1000); // Max 256sec
  }
});
client.setOnload(function() { // on success
  Ti.API.debug('sucess getReadIds');
  try {
    var db = Ti.Database.open(DB);
    var ids = JSON.parse(this.responseText).items;
    db.execute(['DELETE FROM ', TABLE, ' WHERE id IN ("', ids.join('", "'), '") AND state IN ("', [STATES.UNREAD, STATES.PASSED].join('", "'), '")'].join(''));
    db.close();
  } catch(err) {
    Ti.API.error(err);
    Ti.API.debug(this.responseText);
  }
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
