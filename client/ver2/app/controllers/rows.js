var args = arguments[0] || {};
var currentWindow = args.currentWindow;
var moment = require('alloy/moment');
var slideOut = require('slideOut');
var table = $.table;
var recommends = Alloy.Collections.instance('recommends');
// fetch existing data from storage
recommends && recommends.fetch();
// Filter the fetched collection before rendering. Don't return the collection itself,
// but instead return an array of models that you would like to render.
function whereFunction(collection) {
  var models = collection.models;
  //models = collection.filter(function(model) {
  //  Ti.API.debug(model);
  //  var state = model.get('state');
  //  return state === 0 || state === 4;
  //});
  return models.slice(0, 6); // TODO change the number of items dpending on the height
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
  transform.img = data.img;
  transform.summary = data.summary;
  transform.ago = moment(data.published).fromNow();
  transform.origin = data.origin.title;
  return transform;
}

function getNextPage() {
  currentWindow.fireEvent('openRows');
}

table.addEventListener('swipe', function(e) {
  Ti.API.debug(e.direction);
  if (e.direction === 'up') {
    slideOut(table, getNextPage);
  }
});
