const storage = require('node-persist');
const vpnStorage = require('node-persist');
const http = require('http');
const util = require('util');
const exec = require('child_process').exec;
const fs = require('fs');
const countryRegex = new RegExp('[A-Z]{2}');
const vpnGetCountryRegex = new RegExp('^[A-Z]{2}');
const vpnStatusLineRegex = new RegExp("[-A-Za-z0-9_]+(?=')");

const currentVpnId = 'vpn_switcher-currentVpn';
const settingsId = 'vpn_switcher-settingsVpn';

const execOpt = {
	shell: '/bin/bash'
}

storage.initSync();
storage.init({
	dir:'appDb'
});

vpnStorage.initSync();
vpnStorage.init({
	dir:'vpnDb'
});

module.exports = {
  restart: function () {
    service.restart();
  },

  getSettings: function () {
  	var settings = storage.getItem(settingsId);

  	// wenn wir keine Einstellungen haben initialisieren wir sie
  	if (!settings) {
  		settings = {
  			"vpn-username": {
				"label"	:	"VPN Username",
				"type"	:	"text",
				"value"	:	""
			},
			"vpn-password": {
				"label"	:	"VPN Password",
				"type"	:	"password",
				"value"	:	""
			}
		};

		storage.setItem(settingsId, settings);
  	}

    return settings;
  },

  setSettings: function (settings) {
    storage.setItemSync(settingsId, settings);

    // save the VPN Username and Password
    var accountContent = settings['vpn-username'].value
			    			+ "\n"
			    			+ settings['vpn-password'].value;
    fs.writeFile("/etc/openvpn/user.txt",
    			accountContent, 
                function (err) {
				  if (err) throw err;
				});

    return storage.getItem(settingsId);
  },

  getCurrentVpn: function () {
    return storage.getItem(currentVpnId);
  },

  setCurrentVpn: function (currentVpn) {
    storage.setItemSync(currentVpnId, currentVpn);

  	service.stopVpn(function () {
  		service.startVpn(currentVpn.name);
  	});

    return storage.getItem(currentVpnId);
  },

  getVpnList: function () {
    var vpns = vpnStorage.values();
    return vpns;
  },

  getVpnFavoritesList: function () {
    var vpns = vpnStorage.values();
    var favorites = [];
	for (var vpnIndex in vpns) {
		var vpn = vpns[vpnIndex];
		if (vpn.favorite) {
			favorites.push(vpn);
		}
	}

	return favorites;
  },

  getVpn: function (vpnName) {
    return vpnStorage.getItem(vpnName);
  },

  toggleVpnFavorite: function(vpnName) {
  	var vpn = vpnStorage.getItem(vpnName);

  	if (vpn) {
  		vpn.favorite = !vpn.favorite;
  		vpnStorage.setItem(vpn.name, vpn);
  	}

  	return vpn;
  },

  vpnImport: function () {
  	return service.importVpns();
  },

  getStatus: function(sendStatus) {
  	service.refreshStatus(sendStatus);
  }
};

var service = {

	status : {
		hasTunnel: false,
		country: ""
	},

	restart: function() {
		console.log('called restart');
		exec("shutdown -r now ", puts);
	},

	startVpn: function(vpnName, whenStarted) {
		console.log('called start vpn: ' + vpnName);
		exec("service openvpn start " + vpnName, execOpt, function (error, stdout, stderr) {
			puts(error, stdout, stderr);

			if (whenStarted) {
				whenStarted();
			}
		});
	},

	stopVpn: function(whenStoped) {
		console.log('called stop vpn')
		exec("service openvpn stop", execOpt, function (error, stdout, stderr) {
			puts(error, stdout, stderr);

			if (whenStoped) {
				whenStoped();
			}
		});
	},

	refreshStatus: function(sendStatus) {
		exec("ifconfig tun0", function (error, stdout, stderr) {
			// parse output and save the tun0 status
			if (stdout && stdout.length > 0) {
				console.error('Tunnel device found.');
				service.status.hasTunnel = true;
			} else {
				// no tun device
				console.error('No tunnel device found.');
				service.status.hasTunnel = false;
			}
			sendStatus(service.status);
		});
		try {
			http.get("http://freegeoip.net/json/", function (response) {
				// parse output and save the country status
				var statusCode = response.statusCode;
				if (statusCode == 200) {
					response.on('data', function (data) {
						var jsonResponse = JSON.parse(data);
						var country = jsonResponse.country_code;

						if (countryRegex.test(country)) {
							console.error('Current country: ' + country);
							service.status.country = country;
						} else {
							service.status.country = undefined;
							console.error('Invalid current country: ' + country);
						}
	  				});
				} else {
					console.error('Error getting country information statusCode: '
						+ response.statusCode
						+ ' statusMessage: ' + response.statusMessage);
				}

				sendStatus(service.status);
			});
		} catch (error) {
			console.log(error);
		}
	},

	importVpns: function() {
		exec("service openvpn status",
			execOpt, 
			function (error, stdout, stderr) {
			var lines = stdout.split('\n');
			var vpnConfigs = [];
			for (var index in lines) {
				var line = lines[index];
				if (typeof line === 'string' && line.length > 0) {
					var result = vpnStatusLineRegex.exec(line);
					if (result && result[0].length > 0) {
						vpnConfigs.push(result[0]);
					}
				}
			}

			for (var index in vpnConfigs) {
				var vpnName = vpnConfigs[index];
				var dbVpn = vpnStorage.getItem(vpnName);
				var vpnCountry = getCountryFromVpnName(vpnName);
				if (!dbVpn) {
					console.log('Hinzufügen des Vpns: ' + vpnName);
					vpnStorage.setItemSync(vpnName, {
						"name"		: vpnName,
						"country"	: vpnCountry,
						"favorite"	: false
					});
				}
			}

			// suchen nach nicht mehr vorhandenen vpns
		    var dbVpns = vpnStorage.values();
		    var removed = [];
			for (var index in dbVpns) {
				var dbVpn = dbVpns[index];
				var found = false;
				console.log('DB Vpn: ' + dbVpn.name);
				for (var statusIndex in vpnConfigs) {
					var statusVpnName = vpnConfigs[statusIndex];
					if (statusVpnName === dbVpn.name) {
						found = true;
						break;
					}
				}

				if (!found) {
					removed.push(dbVpn);
				}
			}

			// entfernen der nicht mehr vorhandenen Vpns
			for (var index in removed) {
				var removedVpn = removed[index];
				console.log('Löschen des Vpns: ' + removedVpn.name);
				if (removedVpn.name) {
					vpnStorage.removeItemSync(removedVpn.name);
				}
			}
		});
	}
}

function getCountryFromVpnName(vpnName) {
	var result = vpnGetCountryRegex.exec(vpnName);
	if (result && result[0].length > 0) {
		return result[0];
	} else {
		return undefined;
	}
}

function puts(error, stdout, stderr) {
	console.log('stdout: ' + stdout);
  	console.log('stderr: ' + stderr);
  	if (error !== null) {
		console.log('exec error: ' + error);
	}
}