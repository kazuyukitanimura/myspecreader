var args = arguments[0] || {};
var currentWindow = args.currentWindow;
var homeIcon = $.homeIcon;

homeIcon.addEventListener('touchstart', function(e) {
  e.cancelBubble = true;
  currentWindow.needAuth = true;
  currentWindow.unloadViews();
  currentWindow.fireEvent('loggedin');
});
