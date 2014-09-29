var fs = require('fs');
var http = require('http');
var log = require('util').log;
var express = require('express');
var compress = require('compression');
var logger = require('morgan');
var engines = require('consolidate');
var methodOverride = require('method-override');
//var ipfilter = require('ipfilter');
var app = express();
var url = require('./url');

//var ipBlacklist = [];
var port = 80;
app.use(logger());
app.use(compress());
app.use(methodOverride());
app.set('views', url.join(__dirname, 'views'));
app.use(express.static(url.join(__dirname, 'public')));
app.engine('html', engines.hogan);
//app.use(ipfilter(ipBlacklist));
var privacyHtml = 'privacy.html';

app.all('*(php|http|admin)*', function(req, res) {
  // Do not do anything here, let the attackers hang until it times out :P
});

app.all('/' + privacyHtml, function(req, res) {
  res.render(privacyHtml, {
    title: 'Limily, Privacy and Terms',
    email: 'info@limily.com',
    website: 'limily.com',
    date: '06/28/2014',
    gaid: 'UA-4608378-5'
  });
});

app.all('*', function(req, res) {
  var host = req.headers.host;
  if (host && host.indexOf('sfchickens.com') !== - 1) {
    res.render('sfchickens.html', {
      title: 'SFChickens',
      license: '&copy; 2014 Kazuyuki Tanimura All rights reserved except those specifically granted herein',
      contact: 'Contact',
      contactEmail: 'mailto:info@sfchickens.com',
      defaultTarget: '_blank',
      description: 'Tap to move two SFChichens and catch the egg boxes conveyed on the belts. Keep the egg boxes going and deliver them to the truck as many as possible. Try not to drop the egg boxes. It goes to the next level after 10 egg boxes are loaded on the truck. It is fun and strategic. The game is over when 3 egg boxes are dropped. Bonus points after score 300. Get the highest score in the world and in your region!',
      pageImage: '/images/sfchickens.png',
      appStoreUrl: 'http://appstore.com/SFChickens',
      appStoreBadge: '/images/Download_on_the_App_Store_Badge_US-UK_135x40.png',
    });
  } else {
    res.render('index.html', {
      title: 'Limily',
      subtitle: 'Feed Reader',
      slogan: 'brings you the best news',
      license: '&copy; 2014 limily.com All rights reserved except those specifically granted herein',
      blog: 'Blog',
      blogUrl: '//limilyapp.tumblr.com',
      privacy: 'Privacy and Terms',
      privacyUrl: privacyHtml,
      contact: 'Contact',
      contactEmail: 'mailto:info@limily.com',
      defaultTarget: '_blank',
      features: ['Simple intuitive UI', 'Realtime intelligent news selection from feeds', 'Cached news can be read even offline', 'Open original website fast'],
      description: 'Limily is an intelligent news feed reader mobile app. It learns your preference and reading behavior over time. To save your time, Limily automagically brings the most relevant and personalized news at the top of the list. Limily is the best learning tool for those who want to keep up with the newest technologies and trending.<br>Supported feed services: Feedly',
      pageImage: '/images/appicon.png',
      appStoreUrl: 'https://itunes.apple.com/us/app/limily/id906986274?ls=1&mt=8',
      appStoreBadge: '/images/Download_on_the_App_Store_Badge_US-UK_135x40.png',
      playUrl: '#',
      //'https://play.google.com/store/apps/details?id=com.limily',
      playBadge: '//developer.android.com/images/brand/en_generic_rgb_wo_60.png'
    });
  }
});

var server = http.createServer(app).listen(port, function() {
  // if run as root, downgrade to the owner of this file
  if (process.getuid() === 0) {
    var stats = fs.statSync(__filename);
    process.setgid(stats.gid);
    process.setuid(stats.uid);
  }
  log('Webpage server listening to port ' + port);
});
