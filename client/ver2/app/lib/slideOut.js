exports = function(view, duration, finishCallback) {
  //if (!OS_IOS) {
  //  view.transform = Ti.UI.create2DMatrix();
  //  return;
  //}
  duration = duration || 500;
  finishCallback = finishCallback || function() {};

  var animation = Ti.UI.createAnimation({
    opacity: 0.7,
    transform: Ti.UI.create2DMatrix(),
    top: '-100%',
    duration: duration
  });
  view.animate(animation, finishCallback);
};
