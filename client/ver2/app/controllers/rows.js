var args = arguments[0] || {};
var currentWindow = args.currentWindow;
var hasRead = args.hasRead;
var stars = args.stars;
var getImage = require('cacheImage').getImage;
var delImage = require('cacheImage').delImage;
var moment = require('alloy/moment');
var slideOut = require('slideOut');
var protocol = 'http';
var postUrl = protocol + '://' + gDomain + '/recommends';
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
  table = null;
  currentWindow.fireEvent('openRows', e);
}

function uploadData(e) {
  Alloy.Collections.instance('recommends').each(function(recommend) {
    var state = recommend.get('state');
    if (state === 0) {
      recommend.set({
        state: 1 // read
      }).save();
    }
  });
  e.stars = stars;
  e.hasRead = hasRead;
  getNextPage(e);
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
        recommends.each(function(recommend) {
          var data = JSON.parse(recommend.get('data'));
          var state = recommend.get('state');
          if (state !== 4 && state !== 5) { // do not delete markAsUnread and star
            recommend.destroy(); // delete from persistance
            var img = data.img;
            if (img) {
              delImage(img);
              delImage(img, 'thumb');
            }
          }
        });
        table = null;
      });
      client.setOnerror(function(e) { // on error including a timeout
        Ti.API.debug(e.error);
        currentWindow.needAuth = true;
        table = null;
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
    slideOut(table, uploadData);
  } else if (direction === 'right') {
    Alloy.createController('menu', {
      parentWindow: currentWindow
    }).getView().open();
  }
});
