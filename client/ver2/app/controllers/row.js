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
  var summaryHtml = 'webViews/summary.html';
  var webpage = Alloy.createController('webpage', summaryHtml).getView();
  webpage.noInd = true;
  webpage.addEventListener('load', function(e) {
    var viewOriginal = e.url && e.url.indexOf(summaryHtml) === - 1;
    if ($model && (state === 0 || state === 4)) {
      state = 2; // 2: viewSummary
      if (viewOriginal) {
        state = 3; // 3: viewOriginal
      }
      $model.set('state', state);
      $model.save();
    }
    if (viewOriginal) {
      return; // the rest of the code is for showing summary.html
    }
    var webview = e.source;
    var img = getImage(data.img);
    if (img.resolve) {
      img = img.resolve();
    } else if (img.nativePath) {
      img = img.nativePath;
    }
    img = escapeQuote(img);
    var summary = escapeQuote(data.summary);
    var title = escapeQuote(data.title);
    var href = escapeQuote(data.href);
    var script = ['document.getElementById("summary").innerHTML = "', summary, '";', 'document.getElementById("title").innerHTML = "', title, '";', 'document.getElementById("img").src = "', img, '";', 'document.getElementById("original").href = "', href, '";'].join('');
    webview.evalJS(script);
    var preload = Ti.UI.createWebView({
      url: href,
      visible: false
    });
    webpage.add(preload); // this is a fake wabview, we will never show it
    Ti.API.debug(script);
  });
  webpage.open();
}
