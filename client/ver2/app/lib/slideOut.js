exports = function(view, duration, finishCallback) {
  //if (!OS_IOS) {
  //  view.transform = Ti.UI.create2DMatrix();
  //  return;
  //}
  if (typeof duration === 'function') {
    finishCallback = duration;
    duration = null;
  }

  var animation = Ti.UI.createAnimation({
    opacity: 0.7,
    transform: Ti.UI.create2DMatrix().translate(0, - Ti.Platform.displayCaps.platformHeight),
    duration: duration || 300
  });
  view.animate(animation, finishCallback || function() {});
};
