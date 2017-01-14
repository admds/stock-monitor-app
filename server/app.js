'use strict';

var express = require('express');
var winston = require('winston');

var app = express();

app.set('port', (process.env.PORT || 3000));

app.use( '/', express.static('client'));

app.listen(app.get('port'), function() {
	winston.info('Application is ready! Go to http://localhost:' + app.get('port'));
});
