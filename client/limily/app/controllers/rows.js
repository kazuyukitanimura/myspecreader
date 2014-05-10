var args = arguments[0] || {};
var currentWindow = args.currentWindow;
var page = args.page | 0;
var stars = args.stars;
var getImage = require('cacheImage').getImage;
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
var table = $.table;
var recommends = Alloy.Collections.instance(DB);
var TABLE = recommends.config.adapter.collection_name;
var STATES = recommends.config.STATES;
var limit = ((Ti.Platform.displayCaps.platformHeight / 92) | 0);

/**
 * Unicodes
 */
var uDislike = '\ue06d';
var uStarBlack = '\u2605';

// fetch existing data from storage
if (recommends) {
  recommends = Alloy.Collections.rowsData;
  recommends.fetch({
    query: ['SELECT * FROM ', TABLE, ' WHERE state IN (', (stars ? STATES.STAR: [STATES.UNREAD, STATES.KEEPUNREAD].join(', ')), ') ORDER BY rowid DESC LIMIT ', limit, ' OFFSET ' + limit * page].join('')
  });
}

if (stars) {
  var sideLabel = Ti.UI.createLabel({
    width: Ti.Platform.displayCaps.platformHeight,
    left: 24,
    text: uStarBlack + ' Starred',
    transform: Ti.UI.create2DMatrix().rotate( - 90),
    opacity: 0.7,
    color: '#4A4A4A',
    backgroundColor: '#E0FF00',
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
  data.state = state === STATES.KEEPUNREAD ? 'Kept unread': state === STATES.STAR ? uStarBlack: state === STATES.DISLIKE ? uDislike: '';
  data.ago = moment(data.published).fromNow();
  return data;
}

table.markAsRead = function() {
  if (recommends) {
    var ids = [];
    recommends.each(function(recommend) {
      if (recommend.get('state') === STATES.UNREAD) {
        recommend.set('state', STATES.PASSED);
        ids.push(recommend.get('id'));
      }
    });
    if (ids.length) {
      try {
        var db = Ti.Database.open(DB); // update multiple rows at the same time
        db.execute(['UPDATE ', TABLE, ' SET state = ', STATES.PASSED, ' WHERE id IN ("', ids.join('", "'), '")'].join(''));
        db.close();
      } catch(err) {
        Ti.API.error(err);
      }
    }
  }
};

table.addEventListener('singletap', function(e) { // since tableViewRow does not fire singletap, manually fire it. Do not use click since it also fires swipe
  var row = e.row;
  if (row) {
    row.fireEvent('singletap', e);
  }
});

table.free = function() {
  Ti.API.debug('table free');
  table = null;
  recommends = null;
  $.destroy();
};
