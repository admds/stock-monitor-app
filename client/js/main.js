'use strict';

angular.module('stockMonitorApp.index', ['ngRoute','ngAnimate', 'ngSanitize', 'ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/index', {
        templateUrl: '../html/index.html',
        controller: 'StockLookupCtrl'
    });
}])

.controller('StockLookupCtrl', function($scope, $http) {

    $scope.initialize = function() {
        window.setTimeout(function() {
            $scope.$apply();
        }, 10000);
        console.log('StockLookupCtrl init');
    };

    $scope.getStock = function(stockSymbol) {
        //TODO: Save creds on server-side
        var username = "test_username";
        var password = "test_password";
        var auth = "Basic " + window.btoa(username + ':' + password);

        return $http.get('https://api.intrinio.com/companies?ticker=NFLX', {
            headers: {
                "Authorization": auth
            }
        }).then(function(response){
            console.log(response);
        });
    };

    $scope.initialize();

});
