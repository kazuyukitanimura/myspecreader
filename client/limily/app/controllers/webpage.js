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

var recommends = Alloy.Collections.instance(DB);
var STATES = recommends.config.STATES;

/**
 * Unicodes
 */
var uClose = '\ue082';
var uBack = '\ue07a';
var uStarWhite = '\u2606';
var uStarBlack = '\u2605';

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
  color: '#FFF',
  backgroundColor: '#1F1F21',
  opacity: 0.7
});
webpage.add(actInd);
var backButton = Ti.UI.createButton({
  top: '16dp',
  left: '4dp',
  width: '40dp',
  font: {
    fontFamily: 'Simple-Line-Icons',
    fontSize: '30dp'
  },
  color: '#1F1F21',
  title: uClose
});
backButton.addEventListener('click', _.debounce(function(e) {
  if (webview.canGoBack()) {
    webview.goBack();
  } else {
    closeWebPage();
  }
},
256, true));
webpage.add(backButton);
var unreadButton = Ti.UI.createButton({
  top: '24dp',
  right: '24dp',
  width: '152dp',
  font: {
    fontSize: '14dp'
  },
  color: '#1F1F21',
  title: 'Keep Unread'
});
unreadButton.addEventListener('click', function(e) {
  webpage.state = STATES.KEEPUNREAD;
  closeWebPage();
});
if (options.unread) {
  webpage.add(unreadButton);
}
var starButton = Ti.UI.createButton({
  top: '11dp',
  right: '8dp',
  width: '34dp',
  font: {
    fontSize: '35dp'
  },
  color: '#1F1F21'
});
starButton.addEventListener('click', function(e) {
  var state = webpage.state;
  if (state === STATES.STAR) {
    webpage.state = webpage.oldState || STATES.VIEWSUMMARY;
    if (options.unread) {
      unreadButton.show();
    }
    this.title = uStarWhite;
  } else {
    webpage.oldState = state;
    webpage.state = STATES.STAR;
    if (options.unread) {
      unreadButton.hide();
    }
    this.title = uStarBlack;
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
  if (e.url && e.url.indexOf('http://localhost') === 0 && gBaseUrl.indexOf('localhost') === - 1) {
    webview.setUrl(e.url.replace(/^http:\/\/localhost/, gBaseUrl));
  }

  if (!webpage.noInd) {
    actInd.show();
  }
  if (options.star) {
    if (webpage.state === STATES.STAR) {
      starButton.title = uStarBlack;
      if (options.unread) {
        unreadButton.hide();
      }
    } else {
      starButton.title = uStarWhite;
    }
  }
  if (webview.canGoBack()) {
    backButton.title = uBack;
  } else {
    backButton.title = uClose;
  }

  webpage.fireEvent('urlChange', {
    url: webview.url
  });
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
Ti.App.addEventListener('closeWebpage', closeWebPage);
