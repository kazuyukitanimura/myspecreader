var args = arguments[0] || {};
$.row.articleUrl = args.articleUrl;
var getImage = require('cacheImage').getImage;

// $model represents the current model accessible to this
// controller from the markup's model-view binding. $model
// will be null if there is no binding in place.
if ($model) {
  var state = $model.get('state');
  if (state === 0 || state === 4) {
    $.row.opacity = 0.7;
  }
}

var data = JSON.parse($model.get('data'));

function openSummary(e) {
  var summaryHtml = 'webViews/summary.html';
  var webpage = Alloy.createController('webpage', summaryHtml).getView();
  webpage.open();
  webpage.addEventListener('load', function(e) {
    var webview = e.source;
    var img = getImage(data.img);
    if (img.resolve) {
      img = img.resolve();
    } else if (img.nativePath) {
      img = img.nativePath;
    }
    var script = ['document.getElementById("summary").innerHTML = "', data.summary, '";', 'document.getElementById("title").innerHTML = "', data.title, '";', 'document.getElementById("img").src = "', img , '";'/*, 'document.getElementById("preview").src = "', data.alternate && data.alternate.href, '";'*/].join('');
    webview.evalJS(script);
  });
}
