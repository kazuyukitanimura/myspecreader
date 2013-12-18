function Controller() {
    require("alloy/controllers/BaseController").apply(this, Array.prototype.slice.call(arguments));
    this.__controllerPath = "index";
    arguments[0] ? arguments[0]["__parentSymbol"] : null;
    arguments[0] ? arguments[0]["$model"] : null;
    arguments[0] ? arguments[0]["__itemTemplate"] : null;
    var $ = this;
    var exports = {};
    $.__views.index = Ti.UI.createWindow({
        backgroundColor: "white",
        id: "index"
    });
    $.__views.index && $.addTopLevelView($.__views.index);
    exports.destroy = function() {};
    _.extend($, $.__views);
    var authUrl = "http://localhost/auth";
    var client = Ti.Network.createHTTPClient({
        autoRedirect: false,
        timeout: 1e3
    });
    client.open("HEAD", authUrl);
    client.send();
    client.setOnload(function() {
        var resLocation = this.getResponseHeader("Location");
        if (302 === this.status && "/" !== resLocation) {
            var loginButton = Alloy.createController("loginButton", resLocation).getView();
            $.index.add(loginButton);
        }
    });
    client.setOnerror(function(e) {
        Ti.API.debug(e.error);
        client.timeout = Math.min(2 * client.timeout, 2048e3);
        setTimeout(function() {
            client.open("HEAD", authUrl);
            client.send();
        }, client.timeout);
    });
    $.index.open();
    _.extend($, exports);
}

var Alloy = require("alloy"), Backbone = Alloy.Backbone, _ = Alloy._;

module.exports = Controller;