var args = arguments[0] || {};
var parentWindow = args.parentWindow;
var menu = $.menu;
var menuList = $.menuList;

function openMenu(e) {
  menuList.animate({
    left: '0dp',
    duration: 250
  });
}

function closeMenu(e) {
  menuList.animate({
    left: '-200dp',
    duration: 250
  },
  function(e) {
    menu.close();
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

function stars(e) {
  Ti.API.debug('stars');
}

function refresh(e) {
  Ti.API.debug('refresh');
  parentWindow.needAuth = true;
  parentWindow.fireEvent('openRows');
  closeMenu();
}

function settings(e) {
  Ti.API.debug('settings');
}

function about(e) {
  Ti.API.debug('about');
  Titanium.UI.createAlertDialog({
    title: 'Limily',
    message: 'ver. 1.0'
  }).show();
}

function logout(e) {
  Ti.API.debug('logout');
  Ti.Network.createHTTPClient().clearCookies('http://' + gDomain);
  refresh(e);
}

var itemClicks = [search, stars, refresh, settings, about, logout];

menuList.addEventListener('itemclick', function(e) { // ListItem does not fire itemclick
  e.cancelBubble = true;
  itemClicks[e.itemIndex](e);
});

$.background.addEventListener('singletap', function(e) {
  e.cancelBubble = true;
  closeMenu();
});
