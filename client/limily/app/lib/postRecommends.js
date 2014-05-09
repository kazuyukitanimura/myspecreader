var delImage = require('cacheImage').delImage;
var postUrl = gBaseUrl + '/recommends';
var limit = ((Ti.Platform.displayCaps.platformHeight / 92) | 0);
var sendLimit = Math.max(limit * 2, 12);

exports = function(leaveLimit, index) {
  var recommends = Alloy.createCollection(DB); // always create a new local instance
  var TABLE = recommends.config.adapter.collection_name;
  var STATES = recommends.config.STATES;
  if (recommends) {
    recommends.fetch({
      query: ['SELECT * FROM', TABLE, 'WHERE state NOT IN (', STATES.UNREAD, ', ', STATES.KEEPUNREAD, ') ORDER BY rowid ASC'].join(' ')
    });
    console.log('leaveLimit', leaveLimit);
    recommends = _.first(recommends.initial(leaveLimit | 0), sendLimit); // do not send the leaveLimit amount of recommends, returns an array
    if (recommends.length && Ti.Network.online) {
      var data = recommends.map(function(recommend) {
        var data = JSON.parse(recommend.get('data'));
        var state = recommend.get('state');
        return {
          id: data.id,
          featureVector: data.featureVector,
          state: state
        };
      });
      var client = Ti.Network.createHTTPClient();
      client.open('POST', postUrl);
      client.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
      client.send(JSON.stringify({ // explicit stringify is required to send JSON that includes arrays
        data: data
      }));
      client.setOnload(function(e) {
        // collection changes in the loop, so we cannot use recommends.each http://developer.appcelerator.com/question/149527/delete-sql-query-on-alloy-collections
        var ids = [];
        for (var i = recommends.length; i--;) {
          var recommend = recommends[i];
          var data = JSON.parse(recommend.get('data'));
          var state = recommend.get('state');
          if (state !== STATES.KEEPUNREAD && state !== STATES.STAR) { // do not delete markAsUnread and star
            ids.push(recommend.get('id'));
            console.log('sent', data.title);
            var img = data.img;
            if (img) {
              delImage(img);
              delImage(img, 'thumb');
            }
          }
        }
        if (ids.length) {
          var db = Ti.Database.open(DB); // delete multiple rows at the same time
          db.execute(['DELETE FROM ', TABLE, ' WHERE id IN ("', ids.join('", "'), '")'].join(''));
          db.close();
        }
      });
      client.setOnerror(function(e) { // on error including a timeout
        Ti.API.debug(e.error);
        index.needAuth = true;
      });
    }
  }
};