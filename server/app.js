'use strict';

var express = require('express');
var winston = require('winston');

var app = express();

app.set('port', (process.env.PORT || 3000));

app.get('/', function(request, response) {
	response.send('Hello World!!!');
});

app.listen(app.get('port'), function() {
	winston.info('Application is ready! Go to http://localhost:' + app.get('port'));
});
