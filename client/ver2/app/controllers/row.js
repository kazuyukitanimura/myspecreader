var args = arguments[0] || {};
var row = $.row;
var cell = $.cell;
var getImage = require('cacheImage').getImage;

// $model represents the current model accessible to this
// controller from the markup's model-view binding. $model
// will be null if there is no binding in place.
var state = 0;
var data = {};
if ($model) {
  state = $model.get('state');
  data = JSON.parse($model.get('data'));
  if ($model && state !== 0 && state !== 4) {
    cell.opacity = 0.7;
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
  for (var k in variables) {
    if (variables.hasOwnProperty(k)) {
      html = html.replace(new RegExp(k, 'g'), variables[k]);
    }
  }
  var options = {
    url: htmlPath,
    html: html,
    dislike: true,
    unread: true,
    star: true
  };
  var webpage = Alloy.createController('webpage', options).getView();
  webpage.state = state;
  webpage.noInd = true;
  webpage.addEventListener('beforeload', function(e) {
    var viewOriginal = e.url && e.url.indexOf(htmlPath) === - 1;
    if ($model && (state === 0 || state === 4)) {
      state = 2; // 2: viewSummary
      if (viewOriginal) {
        state = 3; // 3: viewOriginal
      }
      $model.set('state', state);
      $model.save();
    }
  });
  webpage.addEventListener('close', function(e) {
    if (webpage.state && $model) {
      state = webpage.state;
      $model.set('state', state); // 4: keepUnread, 5: star
      $model.save();
    }
    webpage = null;
  });
  webpage.open();
}
