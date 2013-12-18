var url = arguments[0] || '/auth';

function doClick(e) {
  var controller = Alloy.createController('webpage', url);
  controller.getView().open();
}

