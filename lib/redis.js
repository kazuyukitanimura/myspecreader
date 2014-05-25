var options = {
  return_buffers: true
};

var port = null;
var host = null;

var redis = module.exports = require('redis').createClient(port, host, options);

redis.on('error', function(err) {
  console.error('Redis:', err);
});

Float64Array.prototype.toBuffer = function() {
  var arrayBuffer = this.buffer;
  arrayBuffer.length = this.length * 8;
  return new Buffer(arrayBuffer);
};
Buffer.prototype.toFloat64Array = function() {
  var length = this.length;
  var ab = new ArrayBuffer(length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < length; ++i) {
    view[i] = this[i];
  }
  return new Float64Array(ab);
};

redis.saveMatricies = function(userId, categories, covarianceMatrix, weightMatrix, callback) {
  categories = categories || Object.keys(covarianceMatrix || {});
  var keys = {};
  var j = 0;
  var k = 0;
  for (var i = categories.length; i--;) {
    var covVec = covarianceMatrix[categories[i]];
    var poses = Object.keys(covVec || {});
    for (j = poses.length; j--;) {
      keys[poses[j]] = 1;
    }
  }
  var fields = Object.keys(keys);
  var kv = {};
  for (i = fields.length; i--;) {
    var field = fields[i];
    var data = new Float64Array(categories.length << 1);
    for (j = categories.length; j--;) {
      var category = categories[j];
      k = j << 1;
      data[k] = covarianceMatrix.getOrDefault(category).getOrDefault(field);
      data[k + 1] = weightMatrix.getOrDefault(category).getOrDefault(field);
    }
    kv[field] = data.toBuffer();
  }
  this.hmset(userId, kv, callback);
};

redis.loadMatricies = function(userId, categories, callback) {
  this.hgetall(userId, function(err, kv) {
    if (err) {
      callback(err);
    } else {
      var covarianceMatrix = {};
      var weightMatrix = {};
      var category = '';
      for (var i = categories.length; i--;) {
        category = categories[i];
        covarianceMatrix[category] = {};
        weightMatrix[category] = {};
      }
      var fields = Object.keys(kv || {});
      var field = '';
      for (i = fields.length; i--;) {
        field = fields[i];
        var data = kv[field].toFloat64Array();
        for (var j = categories.length; j--;) {
          category = categories[j];
          var k = j << 1;
          covarianceMatrix[category][field] = data[k];
          weightMatrix[category][field] = data[k + 1];
        }
      }
      callback(null, {
        covarianceMatrix: covarianceMatrix,
        weightMatrix: weightMatrix
      });
    }
  });
};
