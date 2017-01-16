'use strict';

angular.module('stockMonitorApp.index', ['ngRoute','ngAnimate', 'ngSanitize', 'ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/index', {
        templateUrl: '/add-stock.html',
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

    $scope.submit = function() {
        if ($scope.symbolEntered) {
            return $http.get('/stock-info', {
                params: {
                    symbol: $scope.symbolEntered
                }
            }).then(function(response){
                console.log(response);
            });
        }
    };

    $scope.initialize();

});
