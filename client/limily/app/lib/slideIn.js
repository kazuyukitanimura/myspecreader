exports = function(view, duration, finishCallback) {
  //if (!OS_IOS) {
  //  view.transform = Ti.UI.create2DMatrix();
  //  return;
  //}
  if (typeof duration === 'function') {
    finishCallback = duration;
    duration = null;
  }

  view.setTop(parseInt(view.getTop(), 10) - Ti.Platform.displayCaps.platformHeight); // setBottom does not work
  var animation = Ti.UI.createAnimation({
    transform: Ti.UI.create2DMatrix().translate(0, Ti.Platform.displayCaps.platformHeight),
    duration: duration || 200
  });
  view.animate(animation, finishCallback || function() {});
  return view;
};
