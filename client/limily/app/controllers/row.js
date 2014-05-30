var args = arguments[0] || {};
var row = $.row;
var cell = $.cell;
var getImage = require('cacheImage').getImage;

var recommends = Alloy.Collections.instance(DB);
var STATES = recommends.config.STATES;

// $model represents the current model accessible to this
// controller from the markup's model-view binding. $model
// will be null if there is no binding in place.
var state = STATES.UNREAD;
var data = {};
if ($model) {
  state = $model.get('state');
  data = JSON.parse($model.get('data'));
  if ($model && state !== STATES.UNREAD && state !== STATES.KEEPUNREAD) {
    cell.opacity = 0.8;
  }
}
