'use strict';

var fs = require('fs');
var path    = require('path');
var https = require('https');
var express = require('express');
var winston = require('winston');
var passport = require('passport');
require('./config/passport')(passport);

//Require for stock-info
var bodyParser = require('body-parser');
var informationRoute = require('./routes/information');
var pricesRoute = require('./routes/prices');
var newsRoute = require('./routes/news');
var dataPointsRoute = require('./routes/data-points');
var connectEnsureLogin = require('connect-ensure-login');
var expressSession = require('express-session');

var app = express();
app.use(expressSession({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', function(request, response) {
	if (connectEnsureLogin.ensureLoggedIn('/')) {
		response.redirect('/secured');
		return;
	}

	response.redirect('/login');
})

app.get('/login', function(request, response) {
	response.sendFile(path.join(__dirname, '../client', 'login.html'));
});

app.use('/client', express.static('client'));
app.get('/secured*',connectEnsureLogin.ensureLoggedIn(), function(request, response, next) {
	next();
});
app.use('/secured', express.static('client/secured'));

app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }),
function(request, response) {
	response.redirect('/secured');
});

app.get('/logout', function(request, response) {
	request.logout();
	response.redirect('/login');
});

app.use(bodyParser.json());

app.use('/secured/information', informationRoute);
app.use('/secured/prices', pricesRoute);
app.use('/secured/news', newsRoute);
app.use('/secured/data-points', dataPointsRoute);

https.createServer({
  key: fs.readFileSync('./server/certificate/device.key'),
  cert: fs.readFileSync('./server/certificate/device.crt')
}, app).listen((process.env.PORT || 5555), function() {
	winston.info('Application started.');
});
