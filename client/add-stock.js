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
            else {
                //TODO: Print near input field too
                console.log('Already Watching ' + $scope.symbolEntered.toUpperCase());
            }



        }
    };

    $scope.initialize();

});
