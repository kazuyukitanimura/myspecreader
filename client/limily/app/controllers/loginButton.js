var args = arguments[0] || {};
var url = args.resLocation || '/auth';
var currentWindow = args.currentWindow;
var getRecommends = require('getRecommends');

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
  if (!Ti.App.Properties.getBool(gTERM_ACCEPTED, false)) {
    Alloy.createController('privacy').getView().addEventListener('accepted', openLoginPage);
  } else {
    openLoginPage();
  }
}
