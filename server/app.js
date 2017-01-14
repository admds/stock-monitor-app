'use strict';

var ExpressServer = require('express-server');
var winston = require('winston');

var server = new ExpressServer({
	name: 'My Express Server',
	port: 3000,
    requestLog: true,
		logLevel: 'debug'
});

server.start(function() {
	winston.info('Application is ready! Go to http://localhost:' + server.port);
});

process.on('SIGINT', function() {
	server.stop();
	process.exit();
}.bind(this)); // jshint ignore:line
