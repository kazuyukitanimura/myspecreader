var protocol = "http";

var domain = "domain.com";

("Simulator" === Ti.Platform.model || -1 !== Ti.Platform.model.indexOf("sdk")) && (domain = "localhost");

var url = protocol + "://" + domain + "/recommends";

var client = Ti.Network.createHTTPClient({
    autoRedirect: false,
    timeout: 4e3
});

client.setOnload(function() {
    Ti.API.debug("sucess getReccomends");
    var items = JSON.parse(this.responseText).items;
    var recommends = Alloy.createCollection("recommends");
    for (var i = 0, l = items.length; l > i; i++) {
        var item = items[i];
        recommends.push({
            id: item.id,
            data: JSON.stringify(item)
        });
    }
    recommends.create();
});

client.setOnerror(function(e) {
    Ti.API.debug(e.error);
    client.timeout = Math.min(2 * client.timeout, 32e3);
});

var getRecommends = function() {
    if (!Titanium.Network.online) return;
    client.open("GET", url);
    client.send();
};

false || true && Ti.App.currentService || setInterval(getRecommends, 6e5);

getRecommends();