// Related Codes
// https://github.com/FokkeZB/nl.fokkezb.cachedImageView/blob/master/controllers/widget.js
// https://gist.github.com/skypanther/1901680
var extend = require('extend');
var hires = (Ti.Platform.displayCaps.density === 'high');

function cacheImage(url, props, callback) {
  if (!url || ! _.isString(url) || (OS_IOS && ! Ti.Platform.canOpenURL(url))) {
    return;
  }
  props = extend({
    preventDefaultImage: true,
    width: 'auto',
    height: 'auto',
    hires: hires,
    backgroundColor: 'white',
    image: url
  },
  props);
  var image = Ti.UI.createImageView(props);
  Ti.API.debug(url);
  function imageLoaded(e) {
    image.removeEventListener('load', imageLoaded);
    Ti.API.debug(url);
    Ti.API.debug(e.state);
    callback && callback(e);
  }
  image.addEventListener('load', imageLoaded);
}

exports = cacheImage;
