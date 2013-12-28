var url = arguments[0] || '/auth';

function doClick(e) {
  var webpage = Alloy.createController('webpage', url).getView();
  webpage.open();
  webpage.addEventListener('close', function(e) {
    Ti.API.debug('closed');
  });
  Ti.App.addEventListener('authenticated', function(e) {
    Ti.App.fireEvent('openRows');
    Ti.API.debug('authenticated');
  });
}

