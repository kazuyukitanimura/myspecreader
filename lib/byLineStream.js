var Transform = require('stream').Transform;
var DEFAULT_SEPARATOR = /[\r\n]+/g;

var ByLineStream = module.exports = function(options) {
  if (! (this instanceof ByLineStream)) {
    return new ByLineStream(options);
  }
  if (options) {
    options.encoding = options.encoding || 'utf-8';
    this._separator = options.separator || DEFAULT_SEPARATOR;
  } else {
    options = {
      encoding: 'utf-8'
    };
    this._separator = DEFAULT_SEPARATOR;
  }
  Transform.call(this, options);
  this._buf = '';
};

ByLineStream.prototype = Object.create(Transform.prototype, {
  constructor: {
    value: ByLineStream
  }
});

ByLineStream.prototype._transform = function(chunk, encoding, done) {
  var lines = (this._buf + chunk).split(this._separator); // TODO overwrite the separator from option
  this._buf = lines.pop();
  for (var i = 0, l = lines.length; i < l; i++) {
    this.push(lines[i]);
  }
  done();
};

ByLineStream.prototype._flush = function(done) {
  if (this._buf) {
    this.push(this._buf);
  }
  done();
};
