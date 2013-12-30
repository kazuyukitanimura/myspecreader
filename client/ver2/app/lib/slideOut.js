exports = function(view, duration, finishCallback) {
  //if (!OS_IOS) {
  //  view.transform = Ti.UI.create2DMatrix();
  //  return;
  //}

  var animation = Ti.UI.createAnimation({
    opacity: 0.7,
    transform: Ti.UI.create2DMatrix().translate(0, - Ti.Platform.displayCaps.platformHeight),
    //top: '-100%',
    duration: duration || 300
  });
  view.animate(animation, finishCallback || function() {});
};
