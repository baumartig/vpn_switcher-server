module.exports = {
  restart: function () {
    // whatever
    console.log("RESTART SERVER")
  },
  getSettings: function () {
    return testService.testSettings;
  },
  setSettings: function (settings) {
    testService.testSettings = settings;

    return testService.testSettings;
  },
  getCurrentVpn: function () {
    return testService.currentVpn;
  },
  setCurrentVpn: function (currentVpn) {
  	testService.currentVpn = currentVpn;

    return testService.currentVpn;
  },
  getVpnList: function () {
    return testService.testVpns;
  },
  getVpnFavoritesList: function () {
    var favorites = [];
	for (var vpnIndex in testService.testVpns) {
		var vpn = testService.testVpns[vpnIndex];
		if (vpn.favorite) {
			favorites.push(vpn);
		}
	}

	return favorites;
  },
  getVpn: function (vpnName) {
    return testService.getVpn(vpnName);
  },
  toggleVpnFavorite: function(vpnName) {
  	var vpn = testService.getVpn(vpnName);

  	if (vpn) {
  		vpn.favorite = !vpn.favorite;
  	}

  	return vpn;
  },

  vpnImport: function () {
  	testService.testVpns = require('./test/test_vpns.json');

  	return testService.testVpns;
  }
};

var testService = {	
	testVpns: require('./test/test_vpns.json'),
	testSettings: require('./test/test_settings.json'),
	currentVpn: {},

	getVpn: function(name) {
		for (var vpnIndex in testVpns) {
			var vpn = testVpns[vpnIndex];
			if (vpn.name == name) {
				return vpn;
			}
		}
	}
}