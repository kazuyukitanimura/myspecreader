var args = arguments[0] || {};
var table = $.table;
var data = [{title: 'abc'}]
var rows = [];
_.each(data, function(item) {
  rows.push(Alloy.createController('row', {
    //articleUrl: item.link,
    //image: item.image,
    title: item.title//,
    //date: item.pubDate
  }).getView());
});
table.setData(rows);
