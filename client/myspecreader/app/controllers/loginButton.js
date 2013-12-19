var url = arguments[0] || '/auth';
var previousWin = arguments[1] || 'index';

function doClick(e) {
  var controller = Alloy.createController('webpage', url, previousWin);
  controller.getView().open();
}

