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
var rows = $.rows;
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
var rowData = [];
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
  rowData.push(o);
  rs.next();
}
rs.close();

var items = [];
for (var i = 0, l = rowData.length; i < l; i++) {
  var rowDatum = rowData[i];
  var data = rowDatum.data = JSON.parse(rowDatum.data || '{}');
  var state = rowDatum.state;
  var item = {
    itemId: rowDatum.id,
    img: {
      image: getImage(data.img, 'thumb') || 'noimage.png'
    },
    title: {
      text: data.title
    },
    summary: {
      text: data.summary
    },
    src: {
      text: data.origin.title
    },
    state: {
      text: state === STATES.KEEPUNREAD ? 'Kept unread': state === STATES.STAR ? uStarBlack: ''
    },
    ago: {
      text: parseInt(data.published, 10) ? moment(data.published).fromNow() : ''
    }
  };
  setOpacity(item, state);
  items.push(item);
}
var section = rows.sections[0];
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

rows.markAsRead = function(db) {
  if (rowData) {
    var ids = [];
    for (var i = rowData.length; i--;) {
      var rowDatum = rowData[i];
      if (rowDatum.state === STATES.UNREAD) {
        rowDatum.state = STATES.PASSED;
        ids.push(rowDatum.id);
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

rows.addEventListener('itemclick', _.debounce(function(e) {
  e.cancelBubble = true;
  var itemIndex = e.itemIndex;
  var rowDatum = rowData[itemIndex];
  var data = rowDatum.data;
  var img = getImage(data.img);
  if (img.resolve) {
    img = img.resolve();
  } else if (img.nativePath) {
    img = img.nativePath;
  }
  var variables = {
    '{{img}}': escapeQuote(img),
    '{{summary}}': escapeQuote(data.summary),
    '{{title}}': escapeQuote(data.title),
    '{{href}}': escapeQuote(data.href)
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
  var state = webpage.state = rowDatum.state;
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
      rowDatum.state = webpage.state = state;
      updateState(itemIndex, rowDatum.id, state);
    }
  });
  webpage.addEventListener('close', function(e) {
    if (webpage.state) {
      state = rowDatum.state = webpage.state;
      updateState(itemIndex, rowDatum.id, state);
    }
    webpage = null;
  });
  webpage.open();
},
256, true));

rows.addEventListener('swipe', function(e) {
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

rows.addEventListener('free', function(e) {
  Ti.API.debug('table free');
  rows = null;
  recommends = null;
  $.destroy();
});
