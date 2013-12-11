var util = require('util');
var Data = require('../bkv.js');

var chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

var cl = chars.length;
console.log('Words:', cl + Math.pow(cl, 2) + Math.pow(cl, 3) + Math.pow(cl, 4));

var key = '';
var data = new Data(Uint8Array);
var start = Date.now();
for (var i = 0; i < cl; i++) {
  key = chars[i];
  data.set(key, 1);
  console.log('Memory:', process.memoryUsage().heapUsed / (1024 * 1024), 'M');
}
for (var i = 0; i < cl; i++) {
  for (var j = 0; j < cl; j++) {
    key = chars[i] + chars[j];
    data.set(key, 1);
  }
  console.log('Memory:', process.memoryUsage().heapUsed / (1024 * 1024), 'M');
}
for (var i = 0; i < cl; i++) {
  for (var j = 0; j < cl; j++) {
    for (var k = 0; k < cl; k++) {
      key = chars[i] + chars[j] + chars[k];
      data.set(key, 1);
    }
  }
  console.log('Memory:', process.memoryUsage().heapUsed / (1024 * 1024), 'M');
}
for (var i = 0; i < cl; i++) {
  for (var j = 0; j < cl; j++) {
    for (var k = 0; k < cl; k++) {
      for (var l = 0; l < cl; l++) {
        key = chars[i] + chars[j] + chars[k] + chars[l];
        data.set(key, 1);
      }
    }
  }
  console.log('Memory:', process.memoryUsage().heapUsed / (1024 * 1024), 'M');
}
var elapsed = Date.now() - start;
console.log('Time:', elapsed);
