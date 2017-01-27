'use strict';

var express = require('express');
var winston = require('winston');

//Require for stock-info
var bodyParser = require('body-parser');
var informationRoute = require('./routes/information');
var pricesRoute = require('./routes/prices');
var newsRoute = require('./routes/news');
var dataPointsRoute = require('./routes/data-points');

var app = express();

app.set('port', (process.env.PORT || 5555));

app.use('/', express.static('client'));

app.use(bodyParser.json());
app.use('/information', informationRoute);
app.use('/prices', pricesRoute);
app.use('/news', newsRoute);
app.use('/data-points', dataPointsRoute);

app.listen(app.get('port'), function() {
	winston.info('Application is ready! Go to http://localhost:' + app.get('port'));
});
