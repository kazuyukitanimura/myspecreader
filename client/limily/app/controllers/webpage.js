var options = arguments[0] || {};
var url = '/';
var html = '';
if (_.isString(options)) {
  url = options;
} else if (options.url) {
  url = options.url;
}
if (options.html) {
  html = options.html;
}

var webview = $.webview;
var webpage = $.webpage;
var closeWebPage = function() {
  if (webpage) {
    webpage.close();
  }
};
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
webpage.oldState = 1;
var backButton = Ti.UI.createButton({
  top: '14dp',
  left: '4dp',
  width: '70dp',
  font: {
    fontSize: '16dp'
  },
  title: '\u2573 Close'
});
backButton.addEventListener('click', function(e) {
  if (webview.canGoBack()) {
    webview.goBack();
  } else {
    closeWebPage();
  }
});
webpage.add(backButton);
var dislikeButton = Ti.UI.createButton({
  top: '14dp',
  left: '96dp',
  width: '24dp',
  font: {
    fontSize: '16dp'
  },
  title: '\uE421'
});
dislikeButton.addEventListener('click', function(e) {
  webpage.state = - 1; // FIXME is this ok?
  closeWebPage();
});
if (options.dislike) {
  webpage.add(dislikeButton);
}
var unreadButton = Ti.UI.createButton({
  top: '14dp',
  right: '24dp',
  width: '152dp',
  font: {
    fontSize: '16dp'
  },
  title: 'Keep Unread'
});
unreadButton.addEventListener('click', function(e) {
  webpage.state = 4;
  closeWebPage();
});
if (options.unread) {
  webpage.add(unreadButton);
}
var starButton = Ti.UI.createButton({
  top: '14dp',
  right: '4dp',
  width: '20dp',
  font: {
    fontSize: '16dp'
  }
});
starButton.addEventListener('click', function(e) {
  var state = webpage.state;
  if (state === 5) {
    webpage.state = webpage.oldState;
    if (options.unread) {
      dislikeButton.show();
      unreadButton.show();
    }
    this.title = '\u2606'; // white star
  } else {
    webpage.oldState = state;
    webpage.state = 5;
    if (options.unread) {
      dislikeButton.hide();
      unreadButton.hide();
    }
    this.title = '\u2605'; // black star
  }
});
if (options.star) {
  webpage.add(starButton);
}
webview.setUrl(url);
if (html) {
  webview.setHtml(html);
}
webview.addEventListener('beforeload', function(e) {
  // HACK for the sandbox enviroment
  if (e.url && e.url.indexOf('http://localhost') === 0) {
    webview.setUrl(e.url.replace(/^http:\/\/localhost/, gBaseUrl));
  }

  if (!webpage.noInd) {
    actInd.show();
  }
  if (options.star) {
    if (webpage.state === 5) {
      starButton.title = '\u2605';
      if (options.unread) {
        dislikeButton.hide();
        unreadButton.hide();
      }
    } else {
      starButton.title = '\u2606';
    }
  }
  if (webview.canGoBack()) {
    backButton.title = '\u2329 Back'; //\u27E8 \u3008 \u2329 \u276C \u276E
  } else {
    backButton.title = '\u2573 Close'; //\u00D7\u02DF\u274C\u2A2F\u2715\u2613\u2716\u2715
  }
});
webview.addEventListener('load', function(e) {
  actInd.hide();
  var url = webview.url;
  if (url.indexOf(gBaseUrl) === 0 && url.indexOf('state=auth') !== - 1) { // FIXME we should not hard code like this
    webpage.fireEvent('authenticated');
    closeWebPage();
  }
  //webview.evalJS("document.cookie = '';"); // for test
});
webview.addEventListener('error', function(e) {
  actInd.hide();
});
webpage.addEventListener('close', function() {
  webview = null;
  webpage = null;
  $.destroy();
});
