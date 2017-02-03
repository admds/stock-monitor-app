'use strict';

var express = require('express');
var httpRequest = require('request');
var winston = require('winston');
var router = express.Router();
var cacheClass = require('../cache');
var cache = new cacheClass.Cache();

module.exports = function(credentials) {
	router.get('/', function(request, response) {
		if (request.query && request.query.symbol) {
			cache.getCacheItem('news', request.query.symbol, function(error, item) {
				if (error) {
					winston.error('Cache Error:', error);
				} else if (item) {
					winston.info('Cache hit for key %s.', cache.getCacheKey('news', request.query.symbol));
					response.send(item);
					return;
				}

		        winston.info('Cache miss: retrieving stock news for %s.', request.query.symbol);
				httpRequest.get('https://api.intrinio.com/news?identifier=' + request.query.symbol.toUpperCase(),
		                function(error, stockResponse, body) {
		            if (error) {
		                winston.info('There was an error retrieving stock news for %s. Error:',
		                    request.query.symbol, JSON.stringify(error));
		                response.send(error);
		            }
		            else {
		                winston.info('Sending stock news for %s.', request.query.symbol);
						cache.setCacheItem('news', request.query.symbol, body);
		                response.send(body);
		            }
		        })
		        .auth(credentials.intrinio.username, credentials.intrinio.password, false);
			});
		}
	    else
	    {
	    	response.send({data:[], error: 'No stock symbol provided.'});
	    }
	});
	return router;
}
