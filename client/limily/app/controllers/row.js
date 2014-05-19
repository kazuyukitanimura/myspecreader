var args = arguments[0] || {};
var row = $.row;
var cell = $.cell;
var getImage = require('cacheImage').getImage;

var recommends = Alloy.Collections.instance(DB);
var STATES = recommends.config.STATES;

// $model represents the current model accessible to this
// controller from the markup's model-view binding. $model
// will be null if there is no binding in place.
var state = STATES.UNREAD;
var data = {};
if ($model) {
  state = $model.get('state');
  data = JSON.parse($model.get('data'));
  if ($model && state !== STATES.UNREAD && state !== STATES.KEEPUNREAD) {
    cell.opacity = 0.8;
  }
}

function escapeQuote(text) {
  return text.replace(/"/g, '\\"') || '';
}

function openSummary(e) {
  e.cancelBubble = true;
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
  var htmlPath = 'webViews/summary.html';
  var html = Ti.Filesystem.getFile(htmlPath).read().text;
  var keys = Object.keys(variables);
  var k = '';
  for (var i = keys.length; i--;) {
    k = keys[i];
    html = html.replace(new RegExp(k, 'g'), variables[k]);
  }
  var options = {
    url: htmlPath,
    html: html,
    unread: true,
    star: true
  };
  var webpage = Alloy.createController('webpage', options).getView();
  webpage.state = state;
  webpage.noInd = true;
  webpage.addEventListener('urlChange', function(e) {
    var viewOriginal = e.url && e.url.indexOf(htmlPath) === - 1;
    if ($model) {
      if (state === STATES.STAR) {
        webpage.oldState = viewOriginal? STATES.VIEWORIGINAL: STATES.VIEWSUMMARY;
      } else if (state !== STATES.VIEWORIGINAL) {
        state = STATES.VIEWSUMMARY;
        if (viewOriginal) {
          state = STATES.VIEWORIGINAL;
        }
        webpage.state = state;
        $model.set('state', state);
        $model.save();
      }
    }
  });
  webpage.addEventListener('close', function(e) {
    if (webpage.state && $model) {
      state = webpage.state;
      $model.set('state', state); // keepUnread, star
      $model.save();
    }
    webpage = null;
  });
  webpage.open();
}
