var protocol = 'http';
var domain = 'domain.com';
if (Ti.Platform.model === 'Simulator' || Ti.Platform.model.indexOf('sdk') !== - 1) {
  domain = 'localhost';
}
var url = protocol + '://' + domain + '/recommends';
//var Alloy = require('alloy'), _ = require("alloy/underscore")._, Backbone = require("alloy/backbone");
var recommends = Alloy.Models.instance('recommends');
var client = Ti.Network.createHTTPClient({
  autoRedirect: false,
  timeout: 4000 // in milliseconds
});
client.setOnload(function() { // on success
  Ti.API.debug('sucess getReccomends');
  try {
    var items = JSON.parse(this.responseText).items;
    for (var i = 0, l = items.length; i < l; i++) {
      var item = items[i];
      var recommend = Alloy.createModel('recommends', {
        id: item.id,
        data: JSON.stringify(item)
      });
      recommends.add(recommend);
      recommend.save();
    }
  } catch (e) {
    Ti.API.error(e);
    //Ti.API.debug(this.responseText);
  }
});
client.setOnerror(function(e) { // on error including a timeout
  Ti.API.debug(e.error);
  client.timeout = Math.min(client.timeout * 2, 32 * 1000); // Max 32sec
});

var getRecommends = function() {
  //Ti.API.debug('getRecommends invoked!');
  // silently ignore this if there's no network connection
  if (!Titanium.Network.online) {
    return;
  }
  client.open('GET', url);
  client.send();
};

// For Android, the service runs all the time anyway, don't use setInterval
// For iOS, setInterval shouldn't be used as a background job.
// Once this file is read as a background job, the foreground setInterval
// also gets fired, resulting in doubly firing
if (!OS_ANDROID && ! (OS_IOS && Ti.App.currentService)) {
  setInterval(getRecommends, 10 * 60 * 1000); // every 10 min
  //setInterval(getRecommends, 5 * 1000); // for test
}

getRecommends(); // execute once