function toArrayBuffer(buffer) {
  var ab = new ArrayBuffer(buffer.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return ab;
}
function toBuffer(ab) {
  var buffer = new Buffer(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}
function toFloat64Array(buffer) {
  var ta = new Float64Array(buffer.length);
  var view = new DataView(ta.buffer);
  for (var i = 0; i < buffer.length;) {
    view.setUint32(i, (buffer[i++] << 24) | (buffer[i++] << 16) | (buffer[i++] << 8) | buffer[i++]);
  }
  return ta;
}

var start = 0;
var elapsed = 0;

var ta = Float64Array(3);
var b = new Buffer(0);

start = Date.now();
for (var i = 1000; i--;) {
  //toBuffer(ta.buffer);
  ta.buffer.length = ta.length * 8;
  b = new Buffer(ta.buffer);
}
elapsed = Date.now() - start;
console.log(elapsed);

start = Date.now();
for (var i = 10000; i--;) {
  new Float64Array(toArrayBuffer(b));
  //new Float64Array(new Uint8Array(b).buffer)
  //toFloat64Array(b);
}
elapsed = Date.now() - start;
console.log(elapsed);
