var args = arguments[0] || {};
var currentWindow = args.currentWindow;
var page = args.page | 0;
var stars = args.stars;
var db = args.db;
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

var setOpacity = function(item, state) {
  item.cell = {
    opacity: (state !== STATES.UNREAD && state !== STATES.KEEPUNREAD) ? 0.8: 1.0
  };
};

/**
 * Unicodes
 */
var uStarBlack = '\u2605';

// fetch existing data from storage, but do not use the normal fetch option to serialize the transaction
data = table.data = [];
// https://github.com/appcelerator/alloy/blob/master/Alloy/lib/alloy/sync/sql.js
var sql = ['SELECT * FROM ', TABLE, ' WHERE state IN (', (stars ? STATES.STAR: [STATES.UNREAD, STATES.KEEPUNREAD].join(', ')), ') ORDER BY rowid DESC LIMIT ', limit, ' OFFSET ' + limit * page].join('');
var rs = db.execute(sql);
while (rs.isValidRow()) {
  var o = {};
  var fc = _.isFunction(rs.fieldCount) ? rs.fieldCount() : rs.fieldCount;
  for (var i = 0; i < fc; i++) {
    var fn = rs.fieldName(i);
    o[fn] = rs.fieldByName(fn);
  }
  data.push(o);
  rs.next();
}
rs.close();

var items = [];
for (var i = data.length; i--;) {
  var datum = data[i];
  var datumData = JSON.parse(datum.data || '{}');
  var state = datum.state;
  var item = {
    itemId: datum.id,
    img: {
      image: getImage(datumData.img, 'thumb') || 'noimage.png'
    },
    title: {
      text: datumData.title
    },
    summary: {
      text: datumData.summary
    },
    origin: {
      text: datumData.origin.title
    },
    state: {
      text: state === STATES.KEEPUNREAD ? 'Kept unread': state === STATES.STAR ? uStarBlack: ''
    },
    ago: {
      text: parseInt(datumData.published, 10) ? moment(datumData.published).fromNow() : ''
    }
  };
  setOpacity(item, state);
  items.push(item);
}
var section = table.sections[0];
section.setItems(items);

if (stars) {
  var sideLabel = Ti.UI.createLabel({
    width: Ti.Platform.displayCaps.platformWidth,
    top: '0dp',
    height: '14dp',
    text: '                          ' + uStarBlack + 'Starred',
    opacity: 0.7,
    color: '#4A4A4A',
    backgroundColor: '#E1FF00',
    textAlign: 'center'
  });
  currentWindow.add(sideLabel);
}

table.markAsRead = function(db) {
  if (data) {
    var ids = [];
    for (var i = data.length; i--;) {
      var datum = data[i];
      if (datum.state === STATES.UNREAD) {
        datum.state = STATES.PASSED;
        ids.push(datum.id);
      }
    }
    if (ids.length) {
      try {
        db.execute(['UPDATE ', TABLE, ' SET state = ', STATES.PASSED, ' WHERE id IN ("', ids.join('", "'), '")'].join(''));
      } catch(err) {
        Ti.API.error(err);
      }
    }
  }
};

var escapeQuote = function(text) {
  return text.replace(/"/g, '\\"') || '';
};

var updateState = function(itemIndex, id, state) {
  var item = section.getItemAt(itemIndex);
  setOpacity(item, state);
  section.updateItemAt(itemIndex, item);
  var db = Ti.Database.open(DB);
  db.execute(['UPDATE ', TABLE, ' SET state = ', state, ' WHERE id = "', id, '"'].join(''));
  db.close();
};

table.addEventListener('itemclick', _.debounce(function(e) {
  e.cancelBubble = true;
  var itemIndex = e.itemIndex;
  var datum = data[itemIndex];
  var img = getImage(datum.img);
  if (img.resolve) {
    img = img.resolve();
  } else if (img.nativePath) {
    img = img.nativePath;
  }
  var variables = {
    '{{img}}': escapeQuote(img),
    '{{summary}}': escapeQuote(datum.summary),
    '{{title}}': escapeQuote(datum.title),
    '{{href}}': escapeQuote(datum.href)
  };
  var keys = Object.keys(variables);
  var k = '';
  var html = gSummaryHtml;
  for (var i = keys.length; i--;) {
    k = keys[i];
    html = html.replace(new RegExp(k, 'g'), variables[k]);
  }
  var options = {
    url: gSummaryHtmlPath,
    html: html,
    unread: true,
    star: true,
    e: e
  };
  var webpage = Alloy.createController('webpage', options).getView();
  var state = webpage.state = datum.state;
  webpage.noInd = true;
  webpage.addEventListener('urlChange', function(e) {
    var viewOriginal = e.url && e.url.indexOf(gSummaryHtmlPath) === - 1;
    if (state === STATES.STAR) {
      webpage.oldState = viewOriginal ? STATES.VIEWORIGINAL: STATES.VIEWSUMMARY;
    } else if (state !== STATES.VIEWORIGINAL) {
      state = STATES.VIEWSUMMARY;
      if (viewOriginal) {
        state = STATES.VIEWORIGINAL;
      }
      datum.state = webpage.state = state;
      updateState(itemIndex, datum.id, state);
    }
  });
  webpage.addEventListener('close', function(e) {
    if (webpage.state) {
      state = datum.state = webpage.state;
      updateState(itemIndex, datum.id, state);
    }
    webpage = null;
  });
  webpage.open();
},
256, true));

table.addEventListener('swipe', function(e) {
  // prevent bubbling up to the row
  e.cancelBubble = true;
  Ti.API.debug(e.direction);
  var direction = e.direction;
  if (direction === 'right') {
    Alloy.createController('menu', {
      parentWindow: currentWindow
    }).getView().open();
  }
});

table.addEventListener('free', function(e) {
  Ti.API.debug('table free');
  table = null;
  recommends = null;
  $.destroy();
});
