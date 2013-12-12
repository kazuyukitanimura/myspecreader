/**
 * Bkv Class
 *
 * @param Values {Class} Array like class to store data, e.g. typed array; default: Array
 * @param maxCacheSize {Number} when the number of entries exceed the maxCacheSize, pack them into a typed array; default: 512
 */
var Bkv = module.exports = function(Values, maxCacheSize) {
  if (! (this instanceof Bkv)) { // enforcing new
    return new Bkv(Values, maxCacheSize);
  }
  this._Values = Values || Array;
  this._bkv = {};
  // {
  //  1k: typed array, // sorted keys
  //  1v: new this._Values(size), // data indexed by the position of the key
  //  2k: ...,
  //  2v: ...,
  //  ...
  this._cacheKv = {}; // cache key value
  // {
  //  1: {
  //      'k': val,
  //      ...
  //     },
  //  2: {
  //      'ke': val,
  //      ...
  //     },
  //  3: {
  //      'key': val,
  //      ...
  //     },
  //  ...
  this._maxCacheSize = maxCacheSize || 512;
  this._cacheSizes = {};
};

/**
 * binary search function
 *
 * @param key {String} key to retrieve
 */
Bkv.prototype._search = function(key) {
  var l = key.length;
  var k = l + 'k';
  var _bkv = this._bkv;
  if (_bkv[k] === undefined) {
    return - 1;
  }
  var keys = _bkv[k].toString();
  var found = '';
  var hi = keys.length / l - 1;
  var lo = 0;
  var mid = hi >>> 1;
  while (hi >= lo) {
    found = keys.substr(mid * l, l);
    if (key === found) {
      return mid;
    }
    if (key < found) {
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
    mid = lo + ((hi - lo) >>> 1);
  }
  return - 1;
};

/**
 * get function
 *
 * @param key {String} key to retrieve
 */
Bkv.prototype.get = function(key) {
  var l = key.length;
  var cacheKv = this._cacheKv[l];
  if (cacheKv && cacheKv[key] !== undefined) {
    return cacheKv[key];
  }
  var k = l + 'k';
  var v = l + 'v';
  var _bkv = this._bkv;
  var pos = this._search(key);
  return pos === - 1 ? undefined: _bkv[v][pos];
};

/**
 * set function
 *
 * @param key {String} key to save
 * @param val {String, Object, Number} any value that this._Values can contain
 */
Bkv.prototype.set = function(key, val) {
  var l = key.length;
  var cacheKv = this._cacheKv[l];
  var _cacheSizes = this._cacheSizes;
  if (!cacheKv) {
    cacheKv = this._cacheKv[l] = {};
    _cacheSizes[l] = 0;
  }
  if (cacheKv[key] === undefined) {
    _cacheSizes[l] += 1;
  }
  cacheKv[key] = val;
  this.compaction(l);
};

/**
 * delete function
 *
 * @param key {String} key to delete
 */
Bkv.prototype.del = function(key) {
  var l = key.length;
  var cacheKv = this._cacheKv[l];
  cacheKv[key] = null;
  var _cacheSizes = this._cacheSizes;
  _cacheSizes[l] = (_cacheSizes[l] | 0) + 1;
  this.compaction(l);
};

/**
 * Move all cache data to the typed array
 */
Bkv.prototype.compaction = function(l) {
  var _cacheSizes = this._cacheSizes;
  var _cacheKv = this._cacheKv;
  if (_cacheSizes[l] >= this._maxCacheSize) {
    this._compaction(l);
    delete _cacheKv[l];
    delete _cacheSizes[l];
  }
};
Bkv.prototype._compaction = function(l) {
  var _cacheKv = this._cacheKv;
  var _bkv = this._bkv;
  if (_cacheKv[l] !== undefined) {
    var cacheKv = _cacheKv[l];
    var k = l + 'k';
    var v = l + 'v';
    var vals = _bkv[v];
    var _maxCacheSize = this._maxCacheSize;
    var key = '';
    var addKeys = Object.keys(cacheKv).sort();
    var addKeysL = addKeys.length;
    if (_bkv[k] === undefined) {
      var addKeysBuf = _bkv[k] = new Buffer(addKeysL * l);
      var addVals = _bkv[v] = new this._Values(addKeysL);
      for (var i = addKeysL, j = 0; i--;) {
        key = addKeys[i];
        var val = cacheKv[key];
        if (val !== null) {
          addKeysBuf.write(key, j * l);
          addVals[j] = val;
          j += 1;
        }
      }
      addKeysBuf.length = j;
    } else {
      var bkvk = _bkv[k];
      var keys = _bkv[k].toString();
      var newLen = (keys.length / l | 0) + addKeysL;
      var newKeys = _bkv[k] = new Buffer(newLen * l);
      var newVals = _bkv[v] = new this._Values(newLen);
      key = keys.substr(0, l);
      var addKeyBuf = new Buffer(addKeys.join(''));
      var addKey = addKeys[0] || '';
      var addVal = cacheKv[addKey];
      var xWrite = false;
      var yWrite = false;
      var delKey;
      for (var x = 0, y = 0, z = 0, xStart = 0, yStart = 0, zStart = 0; x + y < newLen;) { // merging
        if (addVal === null) {
          if (y !== yStart) { // write previous y
            addKeyBuf.copy(newKeys, zStart * l, yStart * l, y * l); // faster than buf.write()
            yStart = y;
            zStart = z;
          }
          delKey = addKey;
          y += 1;
          addKey = addKeys[y] || '';
          addVal = cacheKv[addKey];
        } else if (key === delKey) {
          if (x !== xStart) { // write previous x
            bkvk.copy(newKeys, zStart * l, xStart * l, x * l); // faster than buf.write()
            xStart = x;
            zStart = z;
          }
          x += 1;
          key = keys.substr(x * l, l);
        } else if (!addKey || (key < addKey && key)) {
          if (y !== yStart) { // write previous y
            addKeyBuf.copy(newKeys, zStart * l, yStart * l, y * l); // faster than buf.write()
            yStart = y;
            zStart = z;
          }
          newVals[z] = vals[x];
          x += 1;
          key = keys.substr(x * l, l);
          z += 1;
        } else {
          if (x !== xStart) { // write previous x
            bkvk.copy(newKeys, zStart * l, xStart * l, x * l); // faster than buf.write()
            xStart = x;
            zStart = z;
          }
          newVals[z] = addVal;
          y += 1;
          addKey = addKeys[y] || '';
          addVal = cacheKv[addKey];
          z += 1;
        }
      }
      if (y !== yStart) { // write previous y
        addKeyBuf.copy(newKeys, zStart * l, yStart * l, y * l); // faster than buf.write()
        yStart = y;
        zStart = z;
      }
      if (x !== xStart) { // write previous x
        bkvk.copy(newKeys, zStart * l, xStart * l, x * l); // faster than buf.write()
        xStart = x;
        zStart = z;
      }
      newKeys.length = z;
    }
  }
};

/**
 * Serialize to store in DB
 */
Bkv.prototype.serialize = function() {
  this.compaction();
  // TODO
};

Bkv.prototype.deserialize = function() {
  // TODO
};
