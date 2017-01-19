'use strict';

var express = require('express');
var httpRequest = require('request');
var winston = require('winston');
var allStockCompanies = require('./all-companies.json');
var router = express.Router();

router.get('/', function(request, response) {
	if (request.query && request.query.symbol) {
		var credentials = require('./credentials.json');
        winston.info('Retrieving stock information for %s.', request.query.symbol);
		httpRequest.get('https://api.intrinio.com/companies?ticker=' + request.query.symbol.toUpperCase(),
                function(error, stockResponse, body) {
            if (error) {
                winston.info('There was an error retrieving stock information for %s. Error:',
                    request.query.symbol, JSON.stringify(error));
                response.send(error);
            }
            else {
                winston.info('Sending stock information for %s.', request.query.symbol);
                response.send(body);
            }
        })
        .auth(credentials.username, credentials.password, false);
	}
    else
    {
        winston.info('Sending stock information for all available companies.');
    	response.send(allStockCompanies);
    }
});

module.exports = router;
