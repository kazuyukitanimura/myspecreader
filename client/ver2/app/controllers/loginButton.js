var url = arguments[0] || '/auth';

function doClick(e) {
  var webpage = Alloy.createController('webpage', url).getView();
  webpage.open();
  webpage.addEventListener('close', function(e) {
    Ti.API.debug('closed');
  });
  webpage.addEventListener('authenticated', function(e) {
    Ti.API.debug('authenticated');
  });
}

