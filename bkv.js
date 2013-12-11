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
  if (!_bkv.hasOwnProperty(k)) {
    return - 1;
  }
  var keys = _bkv[k];
  var found = '';
  var hi = keys.length / l - 1;
  var lo = 0;
  var lmid = 0;
  var mid = hi >> 1;
  while (hi >= lo) {
    lmid = l * mid;
    found = String.fromCharCode.apply(null, keys.slice(lmid, lmid + l));
    if (key === found) {
      return lo;
    }
    if (key < found) {
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
    mid = lo + ((hi - lo) > 1);
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
  if (cacheKv && cacheKv.hasOwnProperty(key)) {
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
  if (!cacheKv.hasOwnProperty(key)) {
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
    _cacheKv[l] = {};
    _cacheSizes[l] = 0;
  }
};
Bkv.prototype._compaction = function(l) {
  var _cacheKv = this._cacheKv;
  var _bkv = this._bkv;
  if (_cacheKv.hasOwnProperty(l)) {
    var cacheKv = _cacheKv[l];
    var k = l + 'k';
    var v = l + 'v';
    var keys = _bkv[k];
    var vals = _bkv[v];
    var _maxCacheSize = this._maxCacheSize;
    var addKeys = [];
    var removeKeys = [];
    var key = '';
    var pos = 0;
    var val;
    for (key in cacheKv) {
      if (cacheKv.hasOwnProperty(key)) {
        val = cacheKv[key];
        pos = this._search(key);
        if (pos !== - 1) {
          if (val === null) {
            removeKeys.push(key);
          } else {
            vals[pos] = val;
          }
        } else {
          addKeys.push(key);
        }
      }
    }
    removeKeys.sort();
    addKeys.sort();
    var addKeysL = addKeys.length;
    var addVals = new this._Values(addKeysL);
    for (var i = addKeysL; i--;) {
      addVals[i] = cacheKv[addKeys[i]];
    }
    if (!_bkv.hasOwnProperty(k)) {
      var addKeyArray = new Uint8Array(addKeysL);
      var addKeyStr = addKeys.join('');
      for (i = addKeysL; i--;) {
        addKeyArray[i] = addKeyStr.charCodeAt(i);
      }
      _bkv[k] = addKeyArray;
      _bkv[v] = addVals;
      return;
    }
    var newLen = vals.length + addKeysL - removeKeys.length;
    var newKeys = new Uint8Array(newLen);
    var newVals = new this._Values(newLen);
    var newKey = '';
    var rmKey = '';
    var addKey = '';
    newLen -= 1;
    for (var x = 0, y = 0, z = 0; x + y - z < newLen;) { // 3-way merge sort
      rmKey = removeKeys[z] || '';
      var xl = x * l;
      key = String.fromCharCode.apply(null, keys.slice(xl, xl + l));
      console.log(key);
      if (key === rmKey) {
        z += 1;
        x += 1;
        continue;
      }
      addKey = addKeys[y];
      pos = x + y - z;
      if (key < addKey) {
        newKeys[pos] = key;
        newVals[pos] = vals[x];
        x += 1;
      } else {
        newKeys[pos] = addKey;
        newVals[pos] = addVals[y];
        y += 1;
      }
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
