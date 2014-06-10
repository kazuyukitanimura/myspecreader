var args = arguments[0] || {};

function doClick(e) {
  var ModalWindow = Ti.UI.createWindow({
    opacity: 0.9,
    backgroundColor: '#F7F7F7',
    top: Ti.Platform.displayCaps.platformHeight
  });
  var scrollView = Ti.UI.createScrollView({
    contentHeight: 'auto',
    showVerticalScrollIndicator: true,
    height: Ti.Platform.displayCaps.platformHeight,
    width: Ti.Platform.displayCaps.platformWidth,
    color: '#1F1F21',
    font: {
      fontSize: '11dp'
    },
    layout: 'vertical'
  });
  ModalWindow.add(scrollView);
  scrollView.add(Ti.UI.createLabel({
    text: 'Welcome to Limily',
    font: {
      fontWeight: 'bold',
      fontSize: 20
    },
    left: 20,
    top: 40
  }));
  scrollView.add(Ti.UI.createLabel({
    text: 'What is it?',
    font: {
      fontWeight: 'bold',
      fontSize: 17
    },
    left: 20,
    top: 20
  }));
  scrollView.add(Ti.UI.createLabel({
    text: 'Limily is an inteligent news feed reader. It learns your preference and reading behavior over time. To save your time, Limily automagically brings the most relevant news at the top of the list. Limily is the best learning tool for those who want to keep up with the newest technologies and trending.\nSupported feed services: Feedly',
    left: 20,
  }));
  scrollView.add(Ti.UI.createLabel({
    text: 'Limily Features',
    font: {
      fontWeight: 'bold',
      fontSize: 17
    },
    left: 20,
    top: 20
  }));
  scrollView.add(Ti.UI.createLabel({
    text: 'Simple intuitive UI\nInteligent news selection from feeds\nCached news can be read even offline',
    left: 20,
  }));
  scrollView.add(Ti.UI.createLabel({
    text: 'Why do I need to login with Feedly?',
    font: {
      fontWeight: 'bold',
      fontSize: 17
    },
    left: 20,
    top: 20
  }));
  scrollView.add(Ti.UI.createLabel({
    text: 'Because Limily needs a source of feeds and helps you with finding the most interesting news.',
    left: 20,
  }));
  var privacy = Ti.UI.createButton({
    title: 'Privacy and Terms of Use',
    font: {
      fontWeight: 'bold',
      fontSize: 17
    },
    left: 20,
    top: 20
  });
  privacy.addEventListener('click', function(e) {
    Alloy.createController('privacy');
  });
  scrollView.add(privacy);
  var contactus = Ti.UI.createButton({
    title: 'Contact us',
    font: {
      fontWeight: 'bold',
      fontSize: 17
    },
    left: 20,
    top: 20
  });
  contactus.addEventListener('click', function(e) {
    var emailDialog = Ti.UI.createEmailDialog();
    emailDialog.toRecipients = ['info@limily.com'];
    emailDialog.open();
  });
  scrollView.add(contactus);
  var slide = Titanium.UI.createAnimation();
  slide.top = 0;
  ModalWindow.open(slide);
  var close = Titanium.UI.createButton({
    top: 14,
    left: 4,
    font: {
      fontSize: 17
    },
    title: '\u2573 Close'
  });
  close.addEventListener('click', function(e) {
    ModalWindow.close();
    ModalWindow = null;
    $.destroy();
  });
  ModalWindow.add(close);
}
