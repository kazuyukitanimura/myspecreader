function doClick(e) {
  var controller = Alloy.createController('page');
  controller.getView();
  controller.getView().open();
  //alert($.label.text);
}

$.index.open();
