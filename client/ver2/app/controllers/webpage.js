var url = arguments[0] || '/';

var webview = $.webview;
var webpage = $.webpage;
webview.hideLoadIndicator = true; // hide default spinner
webview.loading = false; // do not indicate the webview is loading
var actInd = Ti.UI.createActivityIndicator({
  width: Ti.UI.FILL,
  height: Ti.UI.FILL,
  message: 'Loading...',
  color: 'FFF',
  backgroundColor: '1F1F21',
  opacity: 0.7
});
webpage.add(actInd);
var backButton = Ti.UI.createButton({
  top: '14dp',
  left: '4dp',
  width: '70dp',
  font: {
    fontSize: '16dp'
  }
});
webview.addEventListener('beforeload', function(e) {
  if (!webpage.noInd) {
    actInd.show();
  }
});
webview.setUrl(url);
webpage.add(backButton);
backButton.addEventListener('click', function(e) {
  if (webview.canGoBack()) {
    webview.goBack();
  } else {
    webpage.close();
  }
});
webview.addEventListener('load', function(e) {
  actInd.hide();
  var url = webview.url;
  if (url.indexOf('http://localhost') === 0 && url.indexOf('state=auth') !== - 1) { // FIXME we should not hard code like this
    webpage.fireEvent('authenticated');
    webpage.close();
  }
  if (webview.canGoBack()) {
    backButton.title = '\u2329 Back'; //\u27E8 \u3008 \u2329 \u276C \u276E
  } else {
    backButton.title = '\u2573 Close'; //\u00D7\u02DF\u274C\u2A2F\u2715\u2613\u2716\u2715
  }
  //webview.evalJS("document.cookie = '';"); // for test
});
webview.addEventListener('error', function(e) {
  actInd.hide();
});
