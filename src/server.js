var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var server = require('http').createServer(app)

// Constants
var PORT = 3000;

var isTest = process.argv[2] === 'test';
var service = require('./service');
if (isTest) {
	service = require('./testService');
}

console.log("Rest Port 	: " + PORT);
console.log("Is test 	: " + isTest);

// App
var app = express();

app.use(bodyParser.json()); // for parsing application/json

// Add headers
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5000');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.put('/restart', function (req, res) {
	var response = service.restart();
  	res.send(response);
});

app.get('/settings', function (req, res) {
  	res.json(service.getSettings());
});

app.put('/settings', function (req, res) {
	console.log("set settings:" + JSON.stringify(req.body));
	var settings = req.body;

	var settings = service.setSettings(settings);

  	res.json(settings);
});

app.get('/current', function (req, res) {
  	res.json(service.getCurrentVpn());
});

app.put('/current', function (req, res) {
	console.log("set current vpn:" + JSON.stringify(req.body));
	var newVpn = req.body;

	var currentVpn = service.setCurrentVpn(newVpn);

  	res.json(currentVpn);
});

app.get('/vpn/list', function (req, res) {
  	res.json(service.getVpnList());
});

app.get('/vpn/favorites', function (req, res) {
  	res.json(service.getVpnFavoritesList());
});

app.get('/vpn/get/:name', function (req, res) {
	console.log('GET vpn. VPNs:' + req.params);
	if(req.params.name < 0) {
    	res.statusCode = 404;
    	return res.send('Error 404: No vpn found');
  	}

	var name = req.params.name;

	var vpn = service.getVpn(name);

	if (vpn) {
		return res.json(vpn);
	} else {
		res.statusCode = 404;
    	return res.send('Error 404: No vpn found');
	}
});

app.get('/vpn/toggle-favorite/:name', function (req, res) {
	console.log('GET vpn. VPNs:' + req.params);
	if(req.params.name < 0) {
    	res.statusCode = 404;
    	return res.send('Error 404: No vpn found');
  	}

	var name = req.params.name;

	var vpn = service.toggleVpnFavorite(name);

	if (vpn) {
		return res.json(vpn);
	} else {
		res.statusCode = 404;
    	return res.send('Error 404: No vpn found');
	}
});

app.get('/vpn/import', function (req, res) {
  	res.json(service.vpnImport());
});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);