var setImage = require('cacheImage').setImage;
var protocol = 'http';
var domain = 'domain.com';
if (Ti.Platform.model === 'Simulator' || Ti.Platform.model.indexOf('sdk') !== - 1) {
  domain = 'localhost';
}
var url = protocol + '://' + domain + '/recommends';
var recommends = Alloy.Collections.instance('recommends'); // this needs to stay here for controllers/rows.js
var client = Ti.Network.createHTTPClient({
  autoRedirect: false,
  timeout: 4000 // in milliseconds
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
      //setImage(item.img);
      setImage(item.img, 'thumb', toThumb);
      // the order of saving to sqlite is important
      // the larger rowid, the newer (higher priority)
      // FIXME The save does not guarantee reorder the old entries
      recommend.save(); // save the model to persistent storage
    }
  } catch(e) {
    Ti.API.error(e);
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
