var args = arguments[0] || {};

function doClick(e) {
  var ModalWindow = Ti.UI.createWindow({
    opacity: 0.9,
    backgroundColor: '#F7F7F7',
    top: Ti.Platform.displayCaps.platformHeight
  });
  ModalWindow.add(Ti.UI.createLabel({
    text: 'Welcome to Limily',
  }));
  ModalWindow.add(Ti.UI.createLabel({
    text: 'What is it?\nLimily is an inteligent news feed reader. It learns your preference and reading behavior over time. To save your time, Limily automagically brings the most relevant news at the top of the list. Limily is the best learning tool for those who want to keep up with the newest technologies and trending.\nSupported feed services:\nFeedly'
  }));
  ModalWindow.add(Ti.UI.createLabel({
    text: 'Limily Features',
  }));
  ModalWindow.add(Ti.UI.createLabel({
    text: 'Simple intuitive UI\nInteligent news selection from feeds',
  }));
  ModalWindow.add(Ti.UI.createLabel({
    text: 'Why do I need to login with Feedly?',
  }));
  ModalWindow.add(Ti.UI.createLabel({
    text: 'Because Limily needs a source of feeds and helps you with finding the most interesting news.',
  }));
  ModalWindow.add(Ti.UI.createLabel({
    text: 'More Information',
  }));
  ModalWindow.add(Ti.UI.createLabel({
    text: 'Link to apple store.',
  }));
  var slide = Titanium.UI.createAnimation();
  slide.top = 0;
  ModalWindow.open(slide);
  var close = Titanium.UI.createButton({
    title: 'Close'
  });
  close.addEventListener('click', function(e) {
    ModalWindow.close();
    ModalWindow = null;
    $.destroy();
  });
  ModalWindow.add(close);
}
