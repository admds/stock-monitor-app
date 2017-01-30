'use strict';

var cacheClass = require('../cache');
var cache = new cacheClass.Cache();
var express = require('express');
var httpRequest = require('request');
var winston = require('winston');
var router = express.Router();

router.get('/', function(request, response) {
	if (request.query && request.query.symbol) {
		cache.getCacheItem('data-points', request.query.symbol, function(error, item) {
			if (error) {
				winston.error('Cache error:', error);
			}
			else if(item) {
				winston.info('Cache hit for key %s.', cache.getCacheKey('data-points', request.query.symbol));
				response.send(item);
				return;
			}

			var credentials = require('./credentials.json');
	        winston.info('Cache miss: retrieving data-points for %s.', request.query.symbol);
            var fullUrl = 'https://api.intrinio.com/data_point?identifier=' + request.query.symbol.toUpperCase() +
                '&item=pricetoearnings,52_week_low,52_week_high';
			httpRequest.get(fullUrl, function(error, stockResponse, body) {
	            if (error) {
	                winston.info('There was an error retrieving stock data-points for %s. Error:',
	                    request.query.symbol, JSON.stringify(error));
	                response.send(error);
	            }
	            else {
	                winston.info('Sending stock data-points for %s.', request.query.symbol);
					cache.setCacheItem('data-points', request.query.symbol, body);
	                response.send(body);
	            }
	        })
	        .auth(credentials.username, credentials.password, false);
		});
	}
    else
    {
    	response.send({data:[], error: 'No stock symbol provided.'});
    }
});

module.exports = router;
