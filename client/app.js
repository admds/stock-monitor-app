/* globals angular */
'use strict';

// Declare app level module which depends on views, and components
angular.module('stockMonitorApp', [
  'ngRoute',
  'stockMonitorApp.index',
  'ngRoute',
  'ngCookies',
  'ngAnimate',
  'ngSanitize',
  'ui.bootstrap'
]).
config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
  $locationProvider.hashPrefix('!');

  $routeProvider.otherwise({redirectTo: '/index'});
}]);
