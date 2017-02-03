'use strict';

var express = require('express');
var winston = require('winston');
var router = express.Router();
var User = require('../user-storage');

module.exports = function() {
    router.get('/', function(request, response) {
    	if (request.query && request.query.id) {
            if (request.query.id === 'current') {
                response.send(request.user);
                return;
            }

            User.findOne({profileId: request.query.id}, function(error, user) {
                if (error) {
                    var errorMessage = {
                        message:'There was an error retrieving the user with id ' + request.query.id + '.',
                         error: error
                     };

                    winston.error('%s Error: ', errorMessage.message, error);
                    response.status(500).send(errorMessage);
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

                response.status(404).send()
            });
    	}
        else
        {
            User.find({}, function(error, users) {
                if (error) {
                    var errorMessage = {
                        message:'There was an error retrieving all the users.',
                         error: error
                     };

                    winston.error('%s Error: ', errorMessage.message, error);
                    response.status(500).send(errorMessage);
                    return;
                }

                response.send(users);
            });
        }
    });

    router.post( '/', function(request, response) {
        if(request.query && request.query.id && request.body) {
            User.findOne({profileId: request.query.id}, function(findError, user) {
                if (findError || !user) {
                    var findErrorMessage = {
                        message:'The user with id ' + request.query.id + ' could not be found.',
                        error: findError
                    };
                    winston.error(findErrorMessage.message, findError);
                    response.status(404).send(findErrorMessage);
                    return;
                }

                user.profileId = request.query.id;
                user.name = request.body.name;
                user.stocks = request.body.stocks;
                user.save(function(saveError) {
                    if (saveError) {
                        var saveErrorMessage = {
                            message:'There was an error saving the user with id ' + request.query.id + '.',
                            error: saveError
                        };
                        winston.error(findErrorMessage.message, saveError);
                        response.status(500).send(saveErrorMessage);
                        return;
                    }

                    var message = {message: 'User with id ' + request.query.id + ' saved.'};
                    response.send(message);
                });
            });
            return;
        }

        var error = {
            message: 'The request was missing either the body or the required query parameter.',
            error:'Bad Request'
        };

        winston.error(error.message);
        response.status(400).send(error);
    });

    return router;
}
