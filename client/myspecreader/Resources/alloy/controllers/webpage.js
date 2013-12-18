function Controller() {
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "webpage";
    arguments[0] ? arguments[0]["__parentSymbol"] : null;
    arguments[0] ? arguments[0]["$model"] : null;
    arguments[0] ? arguments[0]["__itemTemplate"] : null;
    var $ = this;
    var exports = {};
    $.__views.webpage = Ti.UI.createWindow({
        id: "webpage"
    });
    $.__views.webpage && $.addTopLevelView($.__views.webpage);
    $.__views.webview = Ti.UI.createWebView({
        id: "webview"
    });
    $.__views.webpage.add($.__views.webview);
    exports.destroy = function() {};
    _.extend($, $.__views);
    var url = arguments[0] || "/";
    var webview = $.webview;
    webview.hideLoadIndicator = true;
    webview.loading = false;
    var actInd = Ti.UI.createActivityIndicator({
        width: Ti.UI.FILL,
        height: Ti.UI.FILL,
        message: "Loading...",
        color: "FFF",
        backgroundColor: "1F1F21",
        opacity: .7
    });
    $.webpage.add(actInd);
    webview.addEventListener("beforeload", function() {
        actInd.show();
    });
    webview.setUrl(url);
    webview.addEventListener("load", function(e) {
        actInd.hide();
        Ti.API.info("info" + JSON.stringify(e));
        Ti.API.info("url" + webview.url);
        0 === webview.url.indexOf("http://localhost") && Alloy.createController("index").getView().open();
    });
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;