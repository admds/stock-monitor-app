/* globals angular */
'use strict';

angular.module('stockMonitorApp.index', ['ngRoute', 'ngCookies', 'ngAnimate', 'ngSanitize', 'ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/index', {
        templateUrl: '/add-stock.html',
        controller: 'StockLookupCtrl'
    });
}])

.controller('StockLookupCtrl', function($scope, $http, $cookies) {

    $scope.alerts = [];

    $scope.initialize = function() {
        window.setTimeout(function() {
            $scope.$apply();
        }, 10000);
        console.log('StockLookupCtrl init');
    };

    $scope.submit = function() {
        //Check if symbol was indeed entered into the field
        if ($scope.symbolEntered) {

            //Check if already watching entered symbol
            var cookieExists = $cookies.get("stock." + $scope.symbolEntered.toUpperCase());

            //If not watching - make the GET call to retrieve stock information
            if (!cookieExists) {
                return $http.get('/stock-info', {
                    params: {
                        symbol: $scope.symbolEntered
                    }
                }).then(function(response){
                    //Setting cookie
                    $cookies.put('stock.' + response.data.ticker, new Date());
                    console.log(response);
                });
            }
            //If watching - show an alert indicating that it is being watched already
            else {
                $scope.alerts.push({msg: 'Already watching: ' + $scope.symbolEntered.toUpperCase()});
            }
        }
    };

    $scope.remove = function() {
        //TODO: Figure out selector value because there will be more than one from which to choose
        // like I have 2 stocks, but should only remove 1.
        // $cookies.remove("stock." + $scope.seeAboveComment);
    };

    $scope.initialize();

});
