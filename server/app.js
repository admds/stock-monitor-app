'use strict';

var express = require('express');
var winston = require('winston');

//Require for stock-info
var bodyParser = require('body-parser');
var stockInfo = require('./stock-info');

var app = express();

app.set('port', (process.env.PORT || 5555));

app.use('/', express.static('client'));

app.use(bodyParser.json());
app.use('/stock-info', stockInfo);

app.listen(app.get('port'), function() {
	winston.info('Application is ready! Go to http://localhost:' + app.get('port'));
});
