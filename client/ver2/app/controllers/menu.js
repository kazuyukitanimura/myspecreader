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

function search(e) {}

function stars(e) {}

function refresh(e) {}

function settings(e) {}

function about(e) {}

function logout(e) {
  Ti.API.debug('logout');
  Ti.Network.createHTTPClient().clearCookies('http://' + gDomain);
  parentWindow.needAuth = true;
  parentWindow.fireEvent('openRows');
  closeMenu();
}

var itemClicks = [search, stars, refresh, settings, about, logout];

menuList.addEventListener('itemclick', function(e) { // ListItem does not fire itemclick
  itemClicks[e.itemIndex](e);
});
