// https://github.com/kazuyukitanimura/scw
var fs = require('fs');
var ByLineStream = require('./byLineStream');

var MAX_FLOAT = Number.MAX_VALUE;
var NON_CATEGORY = typeof undefined;
var NON_CATEGORY_SCORE = - MAX_FLOAT;

var max = Math.max;
var min = Math.min;
var sqrt = Math.sqrt;
var pow = Math.pow;

var Vector = function(defaultVal, existing) {
  if (! (this instanceof Vector)) { // enforcing new
    return new Vector(defaultVal, existing);
  }
  Object.defineProperty(this, 'defaultVal', {
    value: defaultVal,
    enumerable: false // do not show during for-in
  });
  var key = '';
  var keys = Object.keys(existing || {});
  for (var i = keys.length; i--;) {
    key = keys[i];
    this[key] = existing[key];
  }
};

Vector.prototype.getOrDefault = function(key) {
  if (!this.hasOwnProperty(key)) {
    this[key] = this.defaultVal;
  }
  return this[key];
};

var Matrix = function(defaultVal, existing) {
  if (! (this instanceof Matrix)) { // enforcing new
    return new Matrix(defaultVal, existing);
  }
  Object.defineProperty(this, 'defaultVal', {
    value: defaultVal,
    enumerable: false // do not show during for-in
  });
  var key = '';
  var keys = Object.keys(existing || {});
  for (var i = keys.length; i--;) {
    key = keys[i];
    this[key] = new Vector(defaultVal, existing[key]);
  }
};

Matrix.prototype.getOrDefault = function(key) {
  if (!this.hasOwnProperty(key)) {
    this[key] = new Vector(this.defaultVal);
  }
  return this[key];
};

//Matrix.prototype.countDefault = function(featureKeys) {
//  var count = 0;
//  var defaultVal = this.defaultVal;
//  var keys = Object.keys(this);
//  for (var i = featureKeys.length; i--;) {
//    var featureKey = featureKeys[i];
//    for (var j = keys.length; j--;) {
//      if (this[keys[j]][featureKey] === defaultVal) {
//        count++;
//        break;
//      }
//    }
//  }
//  return count;
//};

var Datum = function(category, featureVector) {
  if (! (this instanceof Datum)) { // enforcing new
    return new Datum(category, featureVector);
  }
  this.category = category;
  this.featureVector = featureVector;
};

var SCW = module.exports = function(phi, C, mode, options) {
  if (!C) {
    C = 1.0;
  }
  if (!mode) {
    mode = 2;
  }
  if (!options) {
    options = {};
  }
  if (! (this instanceof SCW)) { // enforcing new
    return new SCW(phi, C, mode, options);
  }
  this.phi = phi;
  this.phi2 = pow(phi, 2);
  this.phi4 = pow(phi, 4);
  this.C = C;
  this.covarianceMatrix = new Matrix(1.0, options.covarianceMatrix); // key: category, value covarianceVector;
  this.weightMatrix = new Matrix(0.0, options.weightMatrix); // key: category, value weightVector;
  if (mode === 1) {
    this.calcAlpha = this.calcAlpha1;
  } else if (mode === 2) {
    this.calcAlpha = this.calcAlpha2;
  }
};
SCW.NON_CATEGORY = NON_CATEGORY;
SCW.NON_CATEGORY_SCORE = NON_CATEGORY_SCORE;

SCW.prototype.train = function(dataGen, maxIteration) {
  if (!maxIteration) {
    maxIteration = 1;
  }
  for (var i = maxIteration; i--;) {
    dataGen(this.update.bind(this));
  }
};

SCW.prototype.test = function(featureVector) {
  var scores = this.calcScores(featureVector);
  var maxScore = NON_CATEGORY_SCORE;
  var maxCategory = NON_CATEGORY;
  var category = '';
  var score = 0.0;
  var categories = Object.keys(scores);
  for (var i = 0; i < categories.length; i++) {
    category = categories[i];
    score = scores[category];
    if (maxScore < score) {
      maxScore = score;
      maxCategory = category;
    }
  }
  return maxCategory;
};

SCW.prototype.calcScores = function(featureVector) {
  var scores = {};
  scores[NON_CATEGORY] = NON_CATEGORY_SCORE;
  var weightMatrix = this.weightMatrix;
  var category = '';
  var categories = Object.keys(weightMatrix);
  var pos = '';
  var poses = Object.keys(featureVector || {});
  for (var i = categories.length; i--;) {
    category = categories[i];
    var weightVector = weightMatrix[category];
    var score = 0.0;
    for (var j = poses.length; j--;) {
      pos = poses[j];
      score += weightVector.getOrDefault(pos) * featureVector[pos];
    }
    scores[category] = score;
  }
  return scores;
};

SCW.prototype.calcV = function(datum, nonCorrectPredict) {
  var v = 0.0;
  var correctCov = this.covarianceMatrix.getOrDefault(datum.category);
  var featureVector = datum.featureVector;
  var pos = '';
  var poses = Object.keys(featureVector || {});
  for (var i = poses.length; i--;) {
    pos = poses[i];
    v += correctCov.getOrDefault(pos) * pow(featureVector[pos], 2);
  }

  if (nonCorrectPredict === NON_CATEGORY) {
    return v;
  }

  var wrongCov = this.covarianceMatrix.getOrDefault(nonCorrectPredict);
  for (i = poses.length; i--;) {
    pos = poses[i];
    v += wrongCov.getOrDefault(pos) * pow(featureVector[pos], 2);
  }
  return v;
};

SCW.prototype.calcAlpha = function(m, v) {
  return 0.0;
};

SCW.prototype.calcAlpha1 = function(m, v) {
  var phi2 = this.phi2;
  var psi = 1.0 + phi2 / 2.0;
  var zeta = 1.0 + phi2;
  var alpha = ( - m * psi + sqrt(pow(m, 2) * this.phi4 / 4.0 + v * phi2 * zeta)) / (v * zeta);
  return min(max(alpha, 0.0), this.C); // assuming this.C > 0.0
};

SCW.prototype.calcAlpha2 = function(m, v) {
  var n = v + 0.5 / this.C;
  var vPhi2 = v * this.phi2;
  var mHalf = m * 0.5;
  var vPhi2MHalf = vPhi2 * mHalf;
  var n2PlusnNVPhi2 = n * (n + vPhi2);
  var alpha = ( - (m * n + vPhi2MHalf) + this.phi * sqrt(v * (vPhi2MHalf * mHalf + n2PlusnNVPhi2))) / n2PlusnNVPhi2;
  return max(alpha, 0.0);
};

SCW.prototype.calcBeta = function(v, alpha) {
  var phi = this.phi;
  var alphaPhi = alpha * this.phi;
  var vAlphaPhiHalf = v * alphaPhi * 0.5;
  return alphaPhi / (vAlphaPhiHalf + sqrt(pow(vAlphaPhiHalf, 2) + v));
};

SCW.prototype.getMarginNonCorrectPredict = function(scores, correct) {
  var nonCorrectPredict = NON_CATEGORY;
  var nonCorrectScore = NON_CATEGORY_SCORE;
  var m = 0.0;
  var category = '';
  var score = 0.0;
  var categories = Object.keys(scores || {});
  for (var i = 0; i < categories.length; i++) {
    category = categories[i];
    score = scores[category];
    if (category === correct) {
      m += score;
    } else if (score > nonCorrectScore) {
      nonCorrectPredict = category;
      nonCorrectScore = score;
    }
  }
  if (nonCorrectScore !== NON_CATEGORY_SCORE) {
    m -= nonCorrectScore;
  }
  return [max(m, 0.0), nonCorrectPredict]; // max(m, 0.0) somehow improves the result. overfitting?
};

SCW.prototype.update = function(datum) {
  var scores = this.calcScores(datum.featureVector);
  var marginNonCorrectPredict = this.getMarginNonCorrectPredict(scores, datum.category);
  var m = marginNonCorrectPredict[0];
  var nonCorrectPredict = marginNonCorrectPredict[1];
  var v = this.calcV(datum, nonCorrectPredict);
  if (this.phi * sqrt(v) <= m) { // loss score
    return;
  }
  var alpha = this.calcAlpha(m, v);
  if (alpha === 0.0) {
    return;
  }
  var beta = this.calcBeta(v, alpha);
  if (beta === 0.0) {
    return;
  }

  var pos = '';
  var val = 0.0;
  var featureVector = datum.featureVector;
  var correctWeight = this.weightMatrix.getOrDefault(datum.category);
  var correctCov = this.covarianceMatrix.getOrDefault(datum.category);
  var poses = Object.keys(featureVector || {});
  for (var i = poses.length; i--;) {
    pos = poses[i];
    val = featureVector[pos];
    correctWeight[pos] = correctWeight.getOrDefault(pos) + alpha * correctCov.getOrDefault(pos) * val;
    correctCov[pos] -= beta * pow(val, 2) * pow(correctCov[pos], 2);
  }

  if (nonCorrectPredict === NON_CATEGORY) {
    return;
  }

  var wrongWeight = this.weightMatrix.getOrDefault(nonCorrectPredict);
  var wrongCov = this.covarianceMatrix.getOrDefault(nonCorrectPredict);
  for (i = poses.length; i--;) {
    pos = poses[i];
    val = featureVector[pos];
    wrongWeight[pos] = wrongWeight.getOrDefault(pos) - alpha * wrongCov.getOrDefault(pos) * val;
    wrongCov[pos] += beta * pow(val, 2) * pow(correctCov[pos], 2);
  }
};

var parseFile = function(filePath, next, callback) {
  if (!callback) {
    return;
  }
  fs.createReadStream(filePath).pipe(new ByLineStream()).on('readable', function() {
    var pieces = this.read().trim().split(' ');
    var category = pieces.shift();
    var featureVector = {};
    for (var i = pieces.length; i--;) {
      var kv = pieces[i].split(':');
      featureVector[kv[0]] = parseFloat(kv[1]);
    }
    var datum = new Datum(category, featureVector);
    callback(datum);
  }).on('end', next);
};

var main = function() {
  var trainPath = process.argv[2];
  var testPath = process.argv[3];
  var mode = (process.argv.length > 4) ? parseInt(process.argv[4], 10) : undefined;
  var maxIteration = (process.argv.length > 5) ? parseInt(process.argv[5], 10) : 1;

  var scw;
  var success = 0;
  var testSize = 0;
  var testCallback = function(datum) {
    testSize += 1;
    if (datum.category === scw.test(datum.featureVector)) {
      success += 1;
    }
  };
  var test = parseFile.bind(this, testPath, function() {
    console.log('accuracy:', success, '/', testSize, '=', 100.0 * success / testSize, '%');
  });
  var train = parseFile.bind(this, trainPath, function() {
    success = 0;
    testSize = 0;
    test(testCallback);
  });

  var eta = 10.0; // 100.0;
  for (var i = 5; i--;) {
    var C = 1.0;
    for (var j = 10; j--;) {
      console.log('eta:', eta);
      console.log('C:', C);
      scw = new SCW(eta, C, mode);
      scw.train(train, maxIteration);
      //break;
      C *= 0.5;
    }
    //break;
    eta *= 0.1;
  }
};

if (require.main === module) {
  main();
}
