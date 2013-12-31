// Related Codes
// https://github.com/FokkeZB/nl.fokkezb.cachedImageView/blob/master/controllers/widget.js
// https://gist.github.com/skypanther/1901680
var extend = require('extend');

function _getExtension(path) {
  // from http://stackoverflow.com/a/680982/292947
  var re = /(?:(\.[^.]+))?$/;
  var ext = re.exec(path)[1];
  return (ext) ? ext: '';
}

function _getFile(url) {
  if (!url || ! _.isString(url) || (OS_IOS && ! Ti.Platform.canOpenURL(url))) {
    return;
  }
  var md5 = Ti.Utils.md5HexDigest(url) + _getExtension(url);
  return Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, md5);
}

function _loadImage(image) {
  return Ti.UI.createImageView({
    backgroundColor: 'white',
    image: image,
    height: Ti.UI.SIZE,
    width: Ti.UI.SIZE,
    preventDefaultImage: true
  }).toImage();
};

function getImage(url) {
  var file = _getFile(url);
  return file ? _loadImage(file.exists() ? file: url) : file;
}

function setImage(url) {
  var file = _getFile(url);
  if (file && ! file.exists()) { // need to save
    file.write(_loadImage(url));
  }
}

exports.getImage = getImage;
exports.setImage = setImage;
