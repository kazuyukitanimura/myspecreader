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
  actInd.show();
});
webview.setUrl(url);
webpage.add(backButton);
backButton.addEventListener('click', function(e) {
  if (webview.canGoBack()) {
    webview.goBack();
  } else {
    webpage.close()
  }
});
webview.addEventListener("load", function(e) {
  actInd.hide();
  //Ti.API.info('info'+ JSON.stringify(e));
  //Ti.API.info('url'+ webview.url);
  if (webview.url.indexOf('http://localhost') === 0) { // FIXME we should not hard code like this
    $.trigger('authenticated');
    webpage.close()
  }
  if (webview.canGoBack()) {
    backButton.title = '< Back';
  } else {
    backButton.title = 'X Close';
  }
  //webview.evalJS("document.cookie = '';") // for test
});
