'use strict';

var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    profileId: String,
    name: String,
    stocks: Array
});

module.exports = mongoose.model('User', userSchema);
