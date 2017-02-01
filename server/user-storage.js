'use strict';

let winston = require('winston');
let redis = require('redis')
let client = redis.createClient();

const key = 'user';

client.on('error', function(error) {
    winston.error('Redis error:', error);
});

module.exports.UserStorage = class UserStorage {
    constructor() {}

    setUser(user) {
        winston.info('Storing user using key: %s and id %s.', key, user.id);
        client.hset(key, user.id, JSON.stringify(user));
    }

    getUser(id, callback) {
        return client.hget(key, id, function(error, userString) {
            var user;
            if (userString) {
                user = JSON.parse(userString);
            }

            callback(error, user);
        });
    }

    getAllUsers(callback) {
        return client.hgetall(key, callback);
    }
}
