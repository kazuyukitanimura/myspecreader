var args = arguments[0] || {};
var currentWindow = args.currentWindow;
var hasRead = args.hasRead;
var getImage = require('cacheImage').getImage;
var moment = require('alloy/moment');
var slideOut = require('slideOut');
var table = $.table;
var recommends = Alloy.Collections.instance('recommends');
// fetch existing data from storage
if (recommends) {
  recommends.fetch({
    // TODO change the number of items dpending on the height
    query: 'SELECT * from ' + recommends.config.adapter.collection_name + ' where state ' + hasRead ? 'NOT ': '' + 'IN (0, 4) ORDER BY rowid DESC LIMIT ' + ((Ti.Platform.displayCaps.platformHeight / 92) | 0)
  });
}
// Perform transformations on each model as it is processed. Since these are only transformations for UI
// representation, we don't actually want to change the model. Instead, return an object that contains the
// fields you want to use in your bindings. The easiest way to do that is to clone the model and return its
// attributes with the toJSON() function.
function transformFunction(model) {
  var transform = model.toJSON();
  var data = JSON.parse(transform.data);
  //Ti.API.debug(data);
  transform.title = data.title;
  //transform.img = data.img;
  var img = getImage(data.img, 'thumb');
  if (img) {
    transform.img = img;
  }
  transform.summary = data.summary;
  transform.ago = moment(data.published).fromNow();
  transform.origin = data.origin.title;
  return transform;
}

function getNextPage(e) {
  table = null;
  currentWindow.fireEvent('openRows', e);
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
    slideOut(table, getNextPage);
  } else if (direction === 'down') {
    getNextPage({
      hasRead: true
    });
  }
});
