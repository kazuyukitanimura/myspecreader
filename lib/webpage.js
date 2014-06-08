var fs = require('fs');
var http = require('http');
var log = require('util').log;
var express = require('express');
var bodyParser = require('body-parser');
var compress = require('compression');
var logger = require('morgan');
var engines = require('consolidate');
var methodOverride = require('method-override');
var app = express();
var url = require('./url');

var port = 8080; //80;
app.use(logger());
app.use(compress());
app.use(bodyParser());
app.use(methodOverride());
app.use(express.static(url.join(__dirname, 'public')));
app.engine('html', engines.hogan);

app.all('*', function(req, res) {
  res.render('index.html', {
    title: 'Limily',
    subtitle: 'Feed Reader',
    slogan: 'Brings you the best news',
    license: '&copy; 2014 limily.com All rights reserved except those specifically granted herein',
    blog: 'Blog',
    blogUrl: '//hobbycoding.tumblr.com',
    privacy: 'Privacy',
    privacyUrl: '',
    contact: 'Contact',
    contactEmail: 'mailto:info@limily.com',
    defaultTarget: '_blank',
    explain: 'Limily is an inteligent news feed reader. It learns your preference and reading behavior over time. To save your time, Limily automagically brings the most relevant news at the top of the list. Limily is the best learning tool for those who want to keep up with the newest technologies and trending.<br>Supported feed services: Feedly',
    appStoreUrl: '#',
    appStoreBadge: '/images/Download_on_the_App_Store_Badge_US-UK_135x40.png',
    playUrl: '#', //'https://play.google.com/store/apps/details?id=com.limily',
    playBadge: '//developer.android.com/images/brand/en_generic_rgb_wo_60.png'
  });
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
