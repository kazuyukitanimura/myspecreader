var args = arguments[0] || {};

function doClick(e) {
  var ModalWindow = Ti.UI.createWindow({
    width: 200,
    height: 300,
    backgroundColor: '#E0FF00'
  });
  ModalWindow.open({
    modal: true
  });
}
