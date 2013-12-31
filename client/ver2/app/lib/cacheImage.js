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

function _getFile(url, ver) {
  if (!url || ! _.isString(url) || (OS_IOS && ! Ti.Platform.canOpenURL(url))) {
    return;
  }
  var md5 = Ti.Utils.md5HexDigest(url + (ver || '')) + _getExtension(url);
  return Titanium.Filesystem.getFile(Titanium.Filesystem.applicationCacheDirectory, md5);
}

function _getBlob(image) {
  return Ti.UI.createImageView({
    backgroundColor: 'white',
    image: image,
    height: Ti.UI.SIZE,
    width: Ti.UI.SIZE,
    preventDefaultImage: true
  }).toImage();
};

function getImage(url, ver) {
  var file = _getFile(url, ver);
  return file ? (file.exists() ? file: url) : file;
}

function setImage(url, ver, as) {
  var file = _getFile(url, ver);
  if (file && ! file.exists()) { // need to save
    var blob = _getBlob(url);
    file.write(as? as(blob): blob);
  }
}

exports.getImage = getImage;
exports.setImage = setImage;
