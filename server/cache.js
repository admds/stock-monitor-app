'use strict';

let winston = require('winston');
let redis = require('redis')
let client = redis.createClient();

client.on('error', function(error) {
    winston.error('Redis error:', error);
});

module.exports.Cache = class Cache {
    constructor() {

    }
    getCacheKey(uri, symbol) {
        return uri + '.' + symbol;
    }

    setCacheItem(uri, symbol, value) {
        var localDate = new Date();
        var currentDate = new Date(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(),
            localDate.getUTCHours(), localDate.getUTCMinutes(), localDate.getUTCSeconds() );
        var hours = currentDate.getHours();
        var secondsUntilExpire = 0;
        const stockMarketCloseHour = 21;
        if (hours > stockMarketCloseHour) {
            secondsUntilExpire = (stockMarketCloseHour - (hours - stockMarketCloseHour)) * 60 * 60;
        }
        else {
            secondsUntilExpire = (stockMarketCloseHour - hours) * 60 * 60;
        }

        client.setex(this.getCacheKey(uri, symbol), secondsUntilExpire, value, redis.print);
    }

    getCacheItem(uri, symbol, callback) {
        return client.get(this.getCacheKey(uri, symbol), callback);
    }
}
