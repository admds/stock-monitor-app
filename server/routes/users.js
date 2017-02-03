'use strict';

var express = require('express');
var winston = require('winston');
var router = express.Router();
var UserStorage = require('../user-storage.js');
var userStorage = new UserStorage.UserStorage();

module.exports = function() {
    router.get('/', function(request, response) {
    	if (request.query && request.query.id) {
            if (request.query.id === 'current') {
                response.send(request.user);
                return;
            }

            userStorage.getUser(request.query.id, function(error, user) {
                if (error) {
                    var errorMessage = {
                        message:'There was an error retrieving the user with id ' + request.query.id + '.',
                         error: error
                     };

                    winston.error('%s Error: ', errorMessage.message, error);
                    response.statusCode(500).send(errorMessage);
                    return;
                }

                if(user) {
                    response.send(user);
                    return;
                }

                var userNotFoundMessage = {
                    message:'The user with id ' + request.query.id + ' was not found.',
                     error: 'Not found'
                 };

                response.statusCode(404).send()
            });
    	}
        else
        {
        	userStorage.getAllUsers(function(error, users) {
                if (error) {
                    var errorMessage = {
                        message:'There was an error retrieving all the users.',
                         error: error
                     };

                    winston.error('%s Error: ', errorMessage.message, error);
                    response.statusCode(500).send(errorMessage);
                    return;
                }

                response.send(users);
            });
        }
    });

    router.post( '/', function(request, response) {
        if(request.query && request.query.id && request.body) {
            userStorage.setUser(request.body);
            var message = {message: 'User with id ' + request.body.id + ' updated.'};
            response.send(message);
            return;
        }

        var error = {
            message: 'The request was missing either the body or the required query parameter.',
            error:'Bad Request'
        };

        winston.error(error.message);
        response.statusCode(400).send(error);
    });

    return router;
}
