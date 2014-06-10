var args = arguments[0] || {};
var url = args.resLocation || '/auth';
var currentWindow = args.currentWindow;
var getRecommends = require('getRecommends');
var privacyDialog = $.privacyDialog;

var TERM_ACCEPTED = 'term20140609';

var openLoginPage = function() {
  var webpage = Alloy.createController('webpage', url).getView();
  webpage.addEventListener('authenticated', function(e) {
    getRecommends();
    currentWindow.fireEvent('openRows');
    Ti.API.debug('authenticated');
  });
  webpage.open();
};

function doClick(e) {
  var termAccepted = Ti.App.Properties.getBool(TERM_ACCEPTED, false);
  if (!termAccepted) {
    privacyDialog.show();
  } else {
    openLoginPage();
  }
}

function privacyClick(e) {
  if (e.index === +e.source.cancel) { // index is integer cancel is string
    Ti.API.info('The cancel button was clicked');
    return;
  }
  Ti.App.Properties.setBool(TERM_ACCEPTED, true);
  openLoginPage();
}
