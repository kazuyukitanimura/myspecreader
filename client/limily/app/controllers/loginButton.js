var args = arguments[0] || {};
var url = args.resLocation || '/auth';
var currentWindow = args.currentWindow;
var getRecommends = require('getRecommends');

var termAccepted = 'term20140609';

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
  var termAccepted = Ti.App.Properties.getBool(termAccepted, false);
  if (!termAccepted) {
    var dialog = Ti.UI.createAlertDialog({
      cancel: 0,
      buttonNames: ['Cancel', 'Accept'],
      message: 'aaa',
      title: 'Privacy and Terms of Use'
    });
    dialog.addEventListener('click', function(e) {
      if (e.index === e.source.cancel) {
        Ti.API.info('The cancel button was clicked');
        return;
      }
      Ti.App.Properties.setBool(termAccepted, true);
      openLoginPage();
    });
    dialog.show();
  } else {
    openLoginPage();
  }
}
