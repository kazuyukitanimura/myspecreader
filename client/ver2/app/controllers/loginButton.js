var args = arguments[0] || {};
var url = args.resLocation || '/auth';
var currentWindow = args.currentWindow;

var webpage = Alloy.createController('webpage', url).getView();
webpage.addEventListener('close', function(e) {
  Ti.API.debug('closed');
});
webpage.addEventListener('authenticated', function(e) {
  currentWindow.fireEvent('openRows');
  Ti.API.debug('authenticated');
});

function doClick(e) {
  webpage.open();
}

