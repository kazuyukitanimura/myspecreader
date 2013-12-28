var arg = arguments[0];
var url = arg.resLocation || '/auth';
var currentWindow = arg.currentWindow;

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

