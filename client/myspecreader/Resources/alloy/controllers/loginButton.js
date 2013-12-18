function Controller() {
    function doClick() {
        var controller = Alloy.createController("webpage", url);
        controller.getView().open();
    }
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "loginButton";
    arguments[0] ? arguments[0]["__parentSymbol"] : null;
    arguments[0] ? arguments[0]["$model"] : null;
    arguments[0] ? arguments[0]["__itemTemplate"] : null;
    var $ = this;
    var exports = {};
    var __defers = {};
    $.__views.loginButton = Ti.UI.createButton({
        font: {
            fontSize: "20dp"
        },
        title: "Login with Feedly",
        id: "loginButton"
    });
    $.__views.loginButton && $.addTopLevelView($.__views.loginButton);
    doClick ? $.__views.loginButton.addEventListener("click", doClick) : __defers["$.__views.loginButton!click!doClick"] = true;
    exports.destroy = function() {};
    _.extend($, $.__views);
    var url = arguments[0] || "/auth";
    __defers["$.__views.loginButton!click!doClick"] && $.__views.loginButton.addEventListener("click", doClick);
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;