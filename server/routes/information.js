'use strict';

var cacheClass = require('../cache');
var cache = new cacheClass.Cache();
var express = require('express');
var httpRequest = require('request');
var winston = require('winston');
var allStockCompanies = require('./all-companies.json');
var router = express.Router();

module.exports = function(credentials) {
	router.get('/', function(request, response) {
		if (request.query && request.query.symbol) {
			cache.getCacheItem('information', request.query.symbol, function(error, item) {
				if (error) {
					winston.error('Cache error:', error);
				}
				else if(item) {
					winston.info('Cache hit for key %s.', cache.getCacheKey('information', request.query.symbol));
					response.send(item);
					return;
				}

		        winston.info('Cache miss: retrieving stock information for %s.', request.query.symbol);
				httpRequest.get('https://api.intrinio.com/companies?ticker=' + request.query.symbol.toUpperCase(),
		                function(error, stockResponse, body) {
		            if (error) {
		                winston.info('There was an error retrieving stock information for %s. Error:',
		                    request.query.symbol, JSON.stringify(error));
		                response.send(error);
		            }
		            else {
		                winston.info('Sending stock information for %s.', request.query.symbol);
						cache.setCacheItem('information', request.query.symbol, body);
		                response.send(body);
		            }
		        })
		        .auth(credentials.intrinio.username, credentials.intrinio.password, false);
			});
		}
	    else
	    {
	        winston.info('Sending stock information for all available companies.');
	    	response.send(allStockCompanies);
	    }
	});

	return router;
};
