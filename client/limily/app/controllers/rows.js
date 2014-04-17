var args = arguments[0] || {};
var currentWindow = args.currentWindow;
var hasRead = args.hasRead;
var stars = args.stars;
var getImage = require('cacheImage').getImage;
var delImage = require('cacheImage').delImage;
var moment = require('alloy/moment');
moment.lang('en', {
  relativeTime: {
    future: "just now",
    past: "%s ago",
    s: "seconds",
    m: "a minute",
    mm: "%d min",
    h: "an hour",
    hh: "%d hours",
    d: "a day",
    dd: "%d days",
    M: "a month",
    MM: "%d months",
    y: "a year",
    yy: "%d years"
  }
});
var slideOut = require('slideOut');
var postUrl = gBaseUrl + '/recommends';
var table = $.table;
var recommends = Alloy.Collections.instance('recommends');
var limit = ((Ti.Platform.displayCaps.platformHeight / 92) | 0);
// fetch existing data from storage
if (recommends) {
  recommends.fetch({
    query: ['SELECT * FROM ', recommends.config.adapter.collection_name, ' WHERE state ', (hasRead ? 'NOT ': ''), 'IN (', (stars ? '5': '0, 4'), ') ORDER BY rowid DESC LIMIT ', limit].join('')
  });
  if (!recommends.length) {
    var allRead = Ti.UI.createLabel({
      width: Ti.UI.FILL,
      height: Ti.UI.FILL,
      text: '\u2714 All Read',
      color: '#1F1f21',
      textAlign: 'center'
    });
    table.add(allRead);
    setTimeout(getNextPage, 5 * 1000); // FIXME call getNextPage on update of recommends isntead of polling
  }
}
if (stars || hasRead) {
  var sideLabel = Ti.UI.createLabel({
    width: Ti.Platform.displayCaps.platformHeight,
    left: 24,
    text: stars ? '\u2605 Starred': 'Recently Read',
    transform: Ti.UI.create2DMatrix().rotate( - 90),
    opacity: 0.7,
    color: stars ? '#4A4A4A': '#898C90',
    backgroundColor: stars ? '#E0FF00': '#D1EEFC',
    textAlign: 'center'
  });
  table.add(sideLabel);
}
// Perform transformations on each model as it is processed. Since these are only transformations for UI
// representation, we don't actually want to change the model. Instead, return an object that contains the
// fields you want to use in your bindings. The easiest way to do that is to clone the model and return its
// attributes with the toJSON() function.
function transformFunction(model) {
  var data = JSON.parse(model.get('data'));
  var state = model.get('state');
  data.img = getImage(data.img, 'thumb') || 'noimage.png';
  data.origin = data.origin.title;
  data.state = state === 4 ? 'Kept unread': state === 5 ? '\u2605': state === - 1 ? '\uE421': '';
  data.ago = moment(data.published).fromNow();
  return data;
}

function getNextPage(e) {
  currentWindow.fireEvent('openRows', e);
  table = null;
}

function markAsRead(e) {
  var ids = [];
  Alloy.Collections.instance('recommends').each(function(recommend) {
    if (recommend.get('state') === 0) {
      ids.push(recommend.get('id'));
    }
  });
  if (ids.length) {
    var db = Ti.Database.open('recommends'); // update multiple rows at the same time
    var table = recommends.config.adapter.collection_name;
    db.execute(['UPDATE ', table, ' SET state = 1 WHERE id IN ("', ids.join('", "'), '")'].join(''));
    db.close();
  }
  e.stars = stars;
  e.hasRead = hasRead;
  getNextPage(e);
  setTimeout(uploadData, 2048);
}

function uploadData() {
  var recommends = Alloy.createCollection('recommends'); // always create a new local instance
  if (recommends) {
    recommends.fetch({
      query: ['SELECT * FROM', recommends.config.adapter.collection_name, 'WHERE state NOT IN (0) ORDER BY rowid ASC LIMIT', Math.max(limit * 2, 12)].join(' ')
    });
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
          var recommend = recommends.at(i);
          var data = JSON.parse(recommend.get('data'));
          var state = recommend.get('state');
          if (state !== 4 && state !== 5) { // do not delete markAsUnread and star
            ids.push(recommend.get('id'));
            var img = data.img;
            if (img) {
              delImage(img);
              delImage(img, 'thumb');
            }
          }
        }
        if (ids.length) {
          var db = Ti.Database.open('recommends'); // delete multiple rows at the same time
          var table = recommends.config.adapter.collection_name;
          db.execute(['DELETE FROM ', table, ' WHERE id IN ("', ids.join('", "'), '")'].join(''));
          db.close();
        }
      });
      client.setOnerror(function(e) { // on error including a timeout
        Ti.API.debug(e.error);
        currentWindow.needAuth = true;
        currentWindow = null;
      });
    }
  }
}

table.addEventListener('singletap', function(e) { // since tableViewRow does not fire singletap, manually fire it. Do not use click since it also fires swipe
  var row = e.row;
  if (row) {
    row.fireEvent('singletap', e);
  }
});

table.addEventListener('swipe', function(e) {
  // prevent bubbling up to the row
  e.cancelBubble = true;
  Ti.API.debug(e.direction);
  var direction = e.direction;
  if (direction === 'up') {
    slideOut(table, markAsRead);
  } else if (direction === 'right') {
    Alloy.createController('menu', {
      parentWindow: currentWindow
    }).getView().open();
  }
});
