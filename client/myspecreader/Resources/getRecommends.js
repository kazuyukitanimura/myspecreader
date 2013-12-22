var protocol = "http";

var domain = "domain.com";

("Simulator" === Ti.Platform.model || -1 !== Ti.Platform.model.indexOf("sdk")) && (domain = "localhost");

var url = protocol + "://" + domain + "/rrecommends";

var client = Ti.Network.createHTTPClient({
    autoRedirect: false,
    timeout: 1e3
});

client.setOnload(function() {
    Ti.API.debug("sucess getReccomends");
});

client.setOnerror(function(e) {
    Ti.API.debug(e.error);
    client.timeout = Math.min(2 * client.timeout, 32e3);
});

var getRecommends = function() {
    Ti.API.debug("getRecommends invoked!");
    if (!Titanium.Network.online) return;
    client.open("GET", url);
    client.send();
};

false || true && Ti.App.currentService || setInterval(getRecommends, 5e3);

getRecommends();