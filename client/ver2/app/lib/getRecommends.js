var setImage = require('cacheImage').setImage;
var protocol = 'http';
var url = protocol + '://' + gDomain + '/recommends';
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
    var items = JSON.parse(this.responseText).items;
    for (var i = items.length; i--;) {
      var item = items[i];
      var recommend = Alloy.createModel('recommends', {
        id: item.id,
        data: JSON.stringify(item)
      });
      setImage(item.img);
      setImage(item.img, 'thumb', toThumb);
      // the order of saving to sqlite is important
      // the larger rowid, the newer (higher priority)
      // experimentally confirmed that the save() monotonically increase its rowid even for existing row
      // by sorting by rowid, we can always get the newest sorted ranking
      recommend.save(); // save the model to persistent storage
    }
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
