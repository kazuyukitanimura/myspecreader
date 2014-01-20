var args = arguments[0] || {};
var currentWindow = args.currentWindow;
var stars = args.stars;
var menuIcon = $.menuIcon;

menuIcon.addEventListener('singletap', function(e) {
  e.cancelBubble = true;
  Alloy.createController('menu', {
    parentWindow: currentWindow,
    stars: stars
  }).getView().open();
});
