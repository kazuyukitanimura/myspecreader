var args = arguments[0] || {};
var currentWindow = args.currentWindow;
var hasRead = args.hasRead;
var getImage = require('cacheImage').getImage;
var moment = require('alloy/moment');
var slideOut = require('slideOut');
var protocol = 'http';
var domain = 'domain.com';
if (Ti.Platform.model === 'Simulator' || Ti.Platform.model.indexOf('sdk') !== - 1) {
  domain = 'localhost';
}
var postUrl = protocol + '://' + domain + '/recommends';
var table = $.table;
var recommends = Alloy.Collections.instance('recommends');
// fetch existing data from storage
if (recommends) {
  recommends.fetch({
    query: 'SELECT * FROM ' + recommends.config.adapter.collection_name + ' WHERE state ' + (hasRead ? 'NOT ': '') + 'IN (0, 4) ORDER BY rowid DESC LIMIT ' + ((Ti.Platform.displayCaps.platformHeight / 92) | 0)
  });
}
// Perform transformations on each model as it is processed. Since these are only transformations for UI
// representation, we don't actually want to change the model. Instead, return an object that contains the
// fields you want to use in your bindings. The easiest way to do that is to clone the model and return its
// attributes with the toJSON() function.
function transformFunction(model) {
  var data = JSON.parse(transform.get('data'));
  var img = getImage(data.img, 'thumb');
  if (img) {
    data.img = img;
  }
  data.ago = moment(data.published).fromNow();
  data.origin = data.origin.title;
  return data;
  //var transform = model.toJSON();
  //var data = JSON.parse(transform.data);
  //transform.title = data.title;
  //var img = getImage(data.img, 'thumb');
  //if (img) {
  //  transform.img = img;
  //}
  //transform.summary = data.summary;
  //transform.ago = moment(data.published).fromNow();
  //transform.origin = data.origin.title;
  //return transform;
}

function getNextPage(e) {
  table = null;
  currentWindow.fireEvent('openRows', e);
}

function uploadData() {
  var recommends = Alloy.Collections.instance('recommends');
  if (recommends) {
    recommends.fetch({
      query: 'SELECT * FROM ' + recommends.config.adapter.collection_name + ' WHERE state NOT IN (0, 4)'
    });
    if (recommends.length && Ti.Network.online) {
      var data = recommends.map(function(recommend) {
        return {
          featureVector: JSON.parse(recommend.get('data')).featureVector,
          state: recommend.get('state')
        };
      });
      var client = Ti.Network.createHTTPClient();
      client.open('POST', postUrl);
      client.send({
        data: data
      });
      client.setOnerror(function(e) { // on error including a timeout
        Ti.API.debug(e.error);
        currentWindow.needAuth = true;
      });
    }
  }
  getNextPage();
}

table.addEventListener('swipe', function(e) {
  // prevent bubbling up to the row
  e.cancelBubble = true;
  Ti.API.debug(e.direction);
  var direction = e.direction;
  if (direction === 'up') {
    recommends.each(function(recommend) {
      var state = recommend.get('state');
      if (state === 0 || state === 4) {
        recommend.set({
          state: 1 // read
        }).save();
      }
    });
    slideOut(table, uploadData);
  } else if (direction === 'down') {
    getNextPage({
      hasRead: true
    });
  }
});
