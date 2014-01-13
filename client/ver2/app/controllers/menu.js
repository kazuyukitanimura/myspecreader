var args = arguments[0] || {};
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
