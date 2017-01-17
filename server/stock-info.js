'use strict';

var express = require('express');
var httpRequest = require('request');
var winston = require('winston');
var allStockCompanies = require('../all-companies.json');
var router = express.Router();

router.get('/', function(request, response) {
    winston.info('in stock-info');
	if (request.query && request.query.symbol) {
		// Do stuff here
		var credentials = require('../credentials.json');
        winston.info('Retrieving stock information for', request.query.symbol);
		httpRequest.get('https://api.intrinio.com/companies?ticker=' + request.query.symbol.toUpperCase(), function(error, stockResponse, body) {
            if (error) {
                response.send(error);
            }
            else {
                response.send(body);
            }
        })
        .auth(credentials.username, credentials.password, false);
	}
    else
    {
    	response.send(allStockCompanies);
    }
});

module.exports = router;
//TODO: Save creds on server-side
// var username = "test_username";
// var password = "test_password";
// var auth = "Basic " + window.btoa(username + ':' + password);

// https://api.intrinio.com/companies?ticker=NFLX

// headers: {
//     "Authorization": auth
// }
