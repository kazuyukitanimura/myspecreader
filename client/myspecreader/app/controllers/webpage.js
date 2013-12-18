var url = arguments[0] || '/';
var webview = $.webview;
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
$.webpage.add(actInd);
webview.addEventListener('beforeload',function(e){
  actInd.show();
});
webview.setUrl(url);
webview.addEventListener("load", function(e) {
  actInd.hide();
  //Ti.API.info('info'+ JSON.stringify(e));
  //Ti.API.info('url'+ webview.url);
  if (webview.url.indexOf('http://localhost') === 0) { // FIXME we should not hard code like this
    Alloy.createController('index').getView().open(); // onLoad, go back to index
  }
});
