function Controller() {
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "page";
    arguments[0] ? arguments[0]["__parentSymbol"] : null;
    arguments[0] ? arguments[0]["$model"] : null;
    arguments[0] ? arguments[0]["__itemTemplate"] : null;
    var $ = this;
    var exports = {};
    $.__views.page = Ti.UI.createWindow({
        id: "page"
    });
    $.__views.page && $.addTopLevelView($.__views.page);
    $.__views.webview = Ti.UI.createWebView({
        id: "webview",
        url: "http://localhost/auth"
    });
    $.__views.page.add($.__views.webview);
    exports.destroy = function() {};
    _.extend($, $.__views);
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;