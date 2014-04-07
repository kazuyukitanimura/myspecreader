var args = arguments[0] || {};
var currentWindow = args.currentWindow;
var menuIcon = $.menuIcon;

menuIcon.addEventListener('singletap', function(e) {
  e.cancelBubble = true;
  Alloy.createController('menu', {
    parentWindow: currentWindow
  }).getView().open();
});
