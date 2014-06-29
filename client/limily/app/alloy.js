// The contents of this file will be executed before any of
// your view controllers are ever executed, including the index.
// You have access to all functionality on the `Alloy` namespace.
//
// This is a great place to do any initialization for your app
// or create any global variables/functions that you'd like to
// make available throughout your app. You can easily make things
// accessible globally by attaching them to the `Alloy.Globals`
// object. For example:
//
// Alloy.Globals.someGlobalFunction = function(){};
var gBaseUrl = 'https://limily.com';
var DB = 'recommends';
var TABLE = Alloy.Collections.instance(DB).config.adapter.collection_name;
var STATES = Alloy.Collections.instance(DB).config.STATES;
var gSummaryHtmlPath = 'webViews/summary.html';
var gSummaryHtml = Ti.Filesystem.getFile(gSummaryHtmlPath).read().text.replace(/(^\s+)|\n/, '');
var gTERM_ACCEPTED = 'term20140609';
var reporter = require('reporter');
reporter = 'info@limily.com';
