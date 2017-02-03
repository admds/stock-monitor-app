var winston = require('winston');
var FacebookStrategy = require('passport-facebook').Strategy;
var User = require('../user-storage');

module.exports = function(passport, credentials) {

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.profileId);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findOne({profileId: id}, function(err, user) {
            done(err, user);
        });
    });

    passport.use(new FacebookStrategy({
        clientID: credentials.facebook.clientID,
        clientSecret: credentials.facebook.clientSecret,
        callbackURL: credentials.facebook.callbackURL,
        enableProof: true
    },

    // Facebook will send back the token and profile.
    function(token, refreshToken, profile, done) {
        process.nextTick(function() {
            User.findOne({profileId: profile.id}, function(error, user) {
                // Was there an error retrieving the user?
                if (error) {
                    winston.error('There was an error retrieving the Facebook user %s from storage. Error: ', profile.displayName, error);
                    return done(error);
                }

                // Does the user already exist?
                if (user) {
                    winston.info('Found Facebook user %s.', user.name);
                    return done(null, user);
                }

                // The user doesn't exist yet. Create a new user in storage.
                winston.info('Creating a new user with id %s', profile.id);
                var newUser = new User();
                newUser.profileId = profile.id;
                newUser.name = profile.displayName;
                newUser.stocks = [];
                newUser.save(function(error) {
                    if (error) {
                        winston.error('There was an error saving the new user to storage.', error);
                        done(error);
                        return;
                    }

                    return done(null, newUser);
                });
            });
        });
    }));
};
