var args = arguments[0] || {};

function doClick(e) {
  var ModalWindow = Ti.UI.createWindow({
    opacity: 0.9,
    backgroundColor: '#F7F7F7',
    top: Ti.Platform.displayCaps.platformHeight
  });
  var slide = Titanium.UI.createAnimation();
  slide.top = 0;
  ModalWindow.open(slide);
  var close = Titanium.UI.createButton({
    title: 'Close'
  });
  close.addEventListener('click', function(e) {
    ModalWindow.close();
    ModalWindow = null;
  });
  ModalWindow.add(close);
  //Ti.UI.createAlertDialog({
  //  title: 'Welcome to Limily',
  //  message: 'What is it?\nLimily is an inteligent news feed reader. It learns your preference and reading behavior over time. To save your time, Limily automagically brings the most relevant news at the top of the list. Limily is the best learning tool for those who want to keep up with the newest technologies and trending.\nSupported feed services:\nFeedly'
  //}).show();
}
