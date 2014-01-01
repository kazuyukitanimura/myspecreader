var args = arguments[0] || {};
var currentWindow = args.currentWindow;
var getImage = require('cacheImage').getImage;
var moment = require('alloy/moment');
var slideOut = require('slideOut');
var table = $.table;
var recommends = Alloy.Collections.instance('recommends');
// fetch existing data from storage
if (recommends) {
  recommends.fetch({
    // TODO change the number of items dpending on the height
    query: 'SELECT data from ' + recommends.config.adapter.collection_name + ' where state IN (0, 4) ORDER BY rowid DESC LIMIT ' + ((Ti.Platform.displayCaps.platformHeight / 92) | 0)
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
  currentWindow.fireEvent('openRows');
}

table.addEventListener('swipe', function(e) {
  // prevent bubbling up to the row
  e.cancelBubble = true;
  Ti.API.debug(e.direction);
  if (e.direction === 'up') {
    slideOut(table, getNextPage);
  }
});
