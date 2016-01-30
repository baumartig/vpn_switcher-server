var express = require('express');
var WebSocketServer = require("websocket").server;
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var http = require('http')

// Constants
var PORT = 3000;

var isTest = process.argv[2] === 'test';
var service = require('./service');
if (isTest) {
	service = require('./testService');
}

console.log("Rest Port 	: " + PORT);
console.log("Is test 	: " + isTest);

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(8000, function() {
    console.log((new Date()) + ' Server is listening on port 8000');
});

var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
	console.log((new Date()) + ' Connection from origin ' + request.origin);

	if (!originIsAllowed(request.origin)) {// Make sure we only accept requests from an allowed origin
      request.reject();
      return;
    }
        
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

// Status Loop
var LOOP_TIME = 10000;
var sending = false;

var sendStatus = function(status) {
	if (hasWsConnections() && !sending) {
    sending = true;
		for (var connectionIndex in wsServer.connections) {
			var connection = wsServer.connections[connectionIndex];
		  var statusString = JSON.stringify(status);
      connection.sendUTF(statusString, function(error) {
          if (error) {
            console.log('Error sending status: ' + error);
          }
          sending = false;
      });
		}
	} else {
		console.log('No connection');
	}
}

var statusLoop = function () {
	if (hasWsConnections()) {
		service.getStatus(sendStatus);
	}

	setTimeout(statusLoop, LOOP_TIME);
};

var hasWsConnections = function () {
	return wsServer
			&& wsServer.connections
			&& wsServer.connections.length > 0
}

setTimeout(statusLoop, LOOP_TIME);

// App
var app = express();

app.use(bodyParser.json()); // for parsing application/json

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

app.put('/vpn/import', function (req, res) {
	var response = service.vpnImport();
  	res.send(response);
});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);