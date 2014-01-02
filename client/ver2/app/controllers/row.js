var args = arguments[0] || {};
$.row.articleUrl = args.articleUrl;

// $model represents the current model accessible to this
// controller from the markup's model-view binding. $model
// will be null if there is no binding in place.
if ($model) {
  var state = $model.get('state');
  if (state === 0 || state === 4) {
    $.row.opacity = 0.7;
  }
}

function openSummary() {

}
