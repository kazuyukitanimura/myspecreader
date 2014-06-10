var args = arguments[0] || {};
var clearSession = require('clearSession');
var privacy = $.privacy;

privacy.show();

function doClick(e) {
  e.cancelBubble = true;
  if (e.index === +e.source.cancel) { // index is integer cancel is string
    Ti.App.Properties.setBool(gTERM_ACCEPTED, false);
    clearSession(); // == logout
  } else {
    Ti.App.Properties.setBool(gTERM_ACCEPTED, true);
    privacy.fireEvent('accepted', e);
  }
}
