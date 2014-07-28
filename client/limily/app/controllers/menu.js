var args = arguments[0] || {};
var parentWindow = args.parentWindow;
var clearSession = require('clearSession');
var menu = $.menu;
var menuList = $.menuList;
var MENU_OPEN = 'menuOpen';

function openMenu(e) {
  if (Ti.App.Properties.getBool(MENU_OPEN, false)) {
    closeMenu();
  } else {
    Ti.App.Properties.setBool(MENU_OPEN, true);
    menuList.animate({
      left: '0dp',
      duration: 250
    });
  }
}

function closeMenu(e) {
  menuList.animate({
    left: '-200dp',
    duration: 250
  },
  function(e) {
    Ti.App.Properties.setBool(MENU_OPEN, false);
    if (menu) {
      menu.close();
      menu = null;
    }
    menuList = null;
    $.destroy();
  });
}

menu.addEventListener('swipe', function(e) {
  e.cancelBubble = true;
  Ti.API.debug(e.direction);
  if (e.direction === 'left') {
    closeMenu();
  }
});
menu.addEventListener('postlayout', openMenu);

function search(e) {
  Ti.API.debug('search');
}

function recent(e) {
  Ti.API.debug('recent');
  parentWindow.fireEvent('openRows', {
    page: 1
  });
  closeMenu();
}

function stars(e) {
  Ti.API.debug('stars');
  parentWindow.unloadViews();
  parentWindow.fireEvent('openRows', {
    stars: true
  });
  closeMenu();
}

function home(e) {
  Ti.API.debug('home');
  parentWindow.needAuth = true;
  parentWindow.unloadViews();
  parentWindow.fireEvent('loggedin');
  closeMenu();
}

function settings(e) {
  Ti.API.debug('settings');
}

function rate(e) {
  // https://gist.github.com/dawsontoth/1011043
  if (Ti.Android) {
    Ti.Platform.openURL('market://details?id='); // TODO
  } else {
    Ti.Platform.openURL('https://itunes.apple.com/'); // TODO
  }
}

function about(e) {
  Ti.API.debug('about');
  Titanium.UI.createAlertDialog({
    title: 'Limily',
    message: 'ver. 1.0'
  }).show();
}

function logout(e) {
  clearSession();
  home(e);
}

//var itemClicks = [home, search, stars, recent, settings, about, logout];
var itemClicks = [home, stars, rate, about, logout]; // TODO implement search and settings, then delete this line and put back the above line

menuList.addEventListener('itemclick', function(e) { // ListItem does not fire itemclick
  e.cancelBubble = true;
  itemClicks[e.itemIndex](e);
});

$.background.addEventListener('singletap', function(e) {
  e.cancelBubble = true;
  closeMenu();
});
