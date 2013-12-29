var args = arguments[0] || {};
var table = $.table;
var recommends = Alloy.Collections.instance('recommends');
// fetch existing data from storage
recommends && recommends.fetch();
// Filter the fetched collection before rendering. Don't return the collection itself,
// but instead return an array of models that you would like to render.
function whereFunction(collection) {
  var models = collection.models;
  return models.slice(models.length - 10);
}
// Perform transformations on each model as it is processed. Since these are only transformations for UI
// representation, we don't actually want to change the model. Instead, return an object that contains the
// fields you want to use in your bindings. The easiest way to do that is to clone the model and return its
// attributes with the toJSON() function.
function transformFunction(model) {
  var transform = model.toJSON();
  var data = JSON.parse(transform.data);
  Ti.API.debug(data.title);
  transform.title = data.title;
  return transform;
}
//var data = [{title: 'abc'}]
//var rows = [];
//_.each(data, function(item) {
//  rows.push(Alloy.createController('row', {
//    //articleUrl: item.link,
//    //image: item.image,
//    title: item.title//,
//    //date: item.pubDate
//  }).getView());
//});
//table.setData(rows);
