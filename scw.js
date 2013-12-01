// https://github.com/kazuyukitanimura/scw
var fs = require('fs');
var ByLineStream = require('./byLineStream');

var MAX_FLOAT = Number.MAX_VALUE;
var NON_CATEGORY;
var NON_CATEGORY_SCORE = - MAX_FLOAT;

var innerProduct = function(featureVector, weightVector) {
  var score = 0.0;
  for (var pos in featureVector) {
    if (featureVector.hasOwnProperty(pos) && weightVector.hasOwnProperty(pos)) {
      score += weightVector[pos] * featureVector[pos];
    }
  }
  return score;
};

var calcLossScore = function(scores, correct, margin) {
  if (!margin) {
    margin = 0.0;
  }
  var correctDone = false;
  var predictDone = false;
  var loss_score = margin;
  for (var category in scores) {
    if (scores.hasOwnProperty(category)) {
      var score = scores[category];
      if (category === correct) {
        loss_score -= score;
        correctDone = true;
      } else if (!predictDone) {
        nonCorrectPredict = category;
        if (nonCorrectPredict !== NON_CATEGORY) {
          loss_score += score;
          predictDone = true;
        }
      }
      if (correctDone && predictDone) {
        break;
      }
    }
  }
  return [ - loss_score, nonCorrectPredict];
};

var Vector = function(defaultVal) {
  if (! (this instanceof Vector)) { // enforcing new
    return new Vector(defaultVal);
  }
  this.defaultVal = defaultVal;
};

Vector.prototype.getDefault = function() {
  return this.defaultVal;
};

var Matrix = function(defaultVal) {
  if (! (this instanceof Matrix)) { // enforcing new
    return new Matrix(defaultVal);
  }
  this.defaultVal = defaultVal;
};

Matrix.prototype.getDefault = function() {
  return new Vector(self.defaultVal);
};

var Datum = function(category, featureVector) {
  if (! (this instanceof Datum)) { // enforcing new
    return new Datum(category, featureVector);
  }
  this.category = category;
  this.featureVector = featureVector;
};

var SCW = function(phi, C, mode) {
  if (!C) {
    C = 1.0;
  }
  if (!mode) {
    mode = 2;
  }
  if (! (this instanceof SCW)) { // enforcing new
    return new SCW(phi, C, mode);
  }
  this.phi = phi;
  this.phi2 = Math.pow(phi, 2);
  this.phi4 = Math.pow(phi, 4);
  this.mode = mode;
  this.C = C;
  this.covarianceMatrix = Matrix(1.0); // key: category, value covarianceVector;
  this.weightMatrix = Matrix(0.0); // key: category, value weightVector;
};

SCW.prototype.train = function(dataGen, maxIteration) {
  var callback = function(datum) {
    var scores = this.calcScores(datum.featureVector);
    this.update(datum, scores);
  }.bind(this);
  for (var i = maxIteration; i--;) {
    dataGen(callback);
  }
};

SCW.prototype.test = function(featureVector) {
  var scores = this.calcScores(featureVector);
  var maxScore = NON_CATEGORY_SCORE;
  var maxCategory = NON_CATEGORY;
  for (var category in scores) {
    if (scores.hasOwnProperty(category)) {
      var value = scores[category];
      if (maxScore < value) {
        maxScore = value;
        maxCategory = category;
      }
    }
  }
  return maxCategory;
};

SCW.prototype.calcScores = function(featureVector) {
  var scores = {};
  scores[NON_CATEGORY] = NON_CATEGORY_SCORE;
  var weightMatrix = this.weightMatrix;
  for (var category in weightMatrix) {
    if (weightMatrix.hasOwnProperty(category)) {
      var weightVector = weightMatrix[category];
      scores[category] = innerProduct(featureVector, weightVector);
    }
  }
  return scores;
};

SCW.prototype.calcV = function(datum, nonCorrectPredict) {
  var v = 0.0;
  var correctCov = this.covarianceMatrix[datum.category] || this.covarianceMatrix.getDefault();
  var featureVector = datum.featureVector;
  var pos;
  for (pos in featureVector) {
    if (featureVector.hasOwnProperty(pos)) {
      v += (correctCov[pos] || correctCov.getDefault()) * Math.pow(featureVector[pos], 2);
    }
  }

  if (nonCorrectPredict === NON_CATEGORY) {
    return v;
  }

  var wrongCov = this.covarianceMatrix[nonCorrectPredict] || this.covarianceMatrix.getDefault();
  for (pos in featureVector) {
    if (featureVector.hasOwnProperty(pos)) {
      v += (wrongCov[pos] || wrongCov.getDefault()) * Math.pow(featureVector[pos], 2);
    }
  }
  return v;
};

SCW.prototype.calcAlpha = function(m, v) {
  if (this.mode === 1) {
    return this.calcAlpha1(m, v);
  } else if (this.mode === 2) {
    return this.calcAlpha2(m, v);
  }
  return 0.0;
};

SCW.prototype.calcAlpha1 = function(m, v) {
  var psi = 1.0 + this.phi2 / 2.0;
  var zeta = 1.0 + this.phi2;
  var alpha = ( - m * psi + Math.sqrt(Math.pow(m, 2) * this.phi4 / 4.0 + v * this.phi2 * zeta)) / (v * zeta);
  return Math.min(Math.max(alpha, 0.0), this.C); // assuming this.C > 0.0
};

SCW.prototype.calcAlpha2 = function(m, v) {
  var n = v + 1.0 / (2.0 * this.C);
  var gamma = this.phi * Math.sqrt(this.phi2 * Math.pow(m, 2) * Math.pow(v, 2) + 4.0 * n * v * (n + v * this.phi2));
  var alpha = ( - (2.0 * m * n + this.phi2 * m * v) + gamma) / (2.0 * (Math.pow(n, 2) + n * v * this.phi2));
  return Math.max(alpha, 0.0);
};

SCW.prototype.calcBeta = function(v, alpha) {
  var u_sqrt = ( - alpha * v * this.phi + Math.sqrt(Math.pow(alpha, 2) * Math.pow(v, 2) * this.phi2 + 4.0 * v)) / 2.0;
  return alpha * this.phi / (u_sqrt + v * alpha * this.phi); // beta
};

SCW.prototype.update = function(datum, scores) {
  var lossResults = calcLossScore(scores, datum.category);
  var m = lossResults[0];
  var nonCorrectPredict = lossResults[1];
  var v = this.calcV(datum, nonCorrectPredict);
  var alpha = this.calcAlpha(m, v);
  var beta = this.calcBeta(v, alpha);

  if (alpha > 0.0) {
    var pos, val;
    var featureVector = datum.featureVector;
    var correctWeight = this.weightMatrix[datum.category] || this.weightMatrix.getDefault();
    var correctCov = this.covarianceMatrix[datum.category] || this.covarianceMatrix.getDefault();
    for (pos in featureVector) {
      if (featureVector.hasOwnProperty(pos)) {
        val = featureVector[pos];
        if (!correctCov.hasOwnProperty(pos)) {
          correctCov[pos] = correctCov.getDefault();
        }
        correctWeight[pos] = (correctWeight[pos] || correctWeight.getDefault()) + alpha * correctCov[pos] * val;
        correctCov[pos] -= beta * Math.pow(val, 2) * Math.pow(correctCov[pos], 2);
      }
    }

    if (nonCorrectPredict === NON_CATEGORY) {
      return;
    }

    var wrongWeight = this.weightMatrix[nonCorrectPredict] || this.weightMatrix.getDefault();
    var wrongCov = this.covarianceMatrix[nonCorrectPredict] || this.covarianceMatrix.getDefault();
    for (pos in featureVector) {
      if (featureVector.hasOwnProperty(pos)) {
        val = featureVector[pos];
        if (!wrongCov.hasOwnProperty(pos)) {
          wrongCov[pos] = wrongCov.getDefault();
        }
        wrongWeight[pos] = (wrongWeight[pos] || wrongWeight.getDefault()) - alpha * wrongCov[pos] * val;
        wrongCov[pos] += beta * Math.pow(val, 2) * Math.pow(correctCov[pos], 2);
      }
    }
  }
};

var parseFile = function(filePath, callback) {
  fs.createReadStream(filePath).pipe(new ByLineStream()).on('readable', function() {
    var pieces = this.read().strip().split(' ');
    var category = pieces.shift();
    var featureVector = {};
    for (var i = pieces.length; i--;) {
      var kv = pieces[i].split(':');
      featureVector[kv[0]] = parseFloat(kv[1]);
    }
    var datum = new Datum(category, featureVector);
    if (callback) {
      callback(datum);
    }
  });
};

// http://stackoverflow.com/questions/18082/validate-numbers-in-javascript-isnumeric/174921
var isNumeric = function(num) {
  return (num >= 0 || num < 0);
};

var main = function() {
  var trainPath = process.argv[2];
  var testPath = process.argv[3];
  var train = parseFile.bind(this, trainPath);
  var test = parseFile.bind(this, testPath);

  var scw;
  var success = 0;
  var testSize = 0;
  var testCallback = function(datum) {
    testSize += 1;
    if (datum.category === scw.test(datum.featureVector)) {
      success += 1;
    }
  };

  var mode = (process.argv.length > 3) ? parseInt(process.argv[4], 10) : undefined;
  var maxIteration = (process.argv.length > 4) ? parseInt(process.argv[5], 10) : 1;

  var eta = 10.0; // 100.0;
  for (var i = 5; i--;) {
    var C = 1.0;
    for (var j = 10; j--;) {
      console.log('eta:', eta);
      console.log('C:', C);
      var args = [eta, C];
      if (isNumeric(mode)) {
        args.push(mode);
      }
      scw = new Function.prototype.bind.apply(SCW, args); // hack to use new operator and apply http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
      scw.train(train, maxIteration);
      success = 0;
      testSize = 0;
      test(testCallback);
      console.log('accuracy:', success, '/', testSize, '=', 100.0 * success / testSize, '%');
      C *= 0.5;
    }
    eta *= 0.1;
  }
};

