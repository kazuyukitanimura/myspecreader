exports = function(view, duration, finishCallback) {
  //if (!OS_IOS) {
  //  view.transform = Ti.UI.create2DMatrix();
  //  return;
  //}
  if (typeof duration === 'function') {
    finishCallback = duration;
    duration = null;
  }

  view.bottom = Ti.Platform.displayCaps.platformHeight;
  var animation = Ti.UI.createAnimation({
    transform: Ti.UI.create2DMatrix().translate(0, Ti.Platform.displayCaps.platformHeight),
    duration: duration || 300
  });
  view.addEventListener('postlayout', function(e) {
    view.animate(animation, finishCallback || function() {});
  });
  return view;
};
