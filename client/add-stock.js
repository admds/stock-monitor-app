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

    $scope.oneAtATime = true;
    $scope.alerts = [];
    $scope.groups = [];

    $scope.selectedSymbol = undefined;

    $scope.initialize = function() {
        $scope.stockCompanies = [];
        $scope.loadStockCompanies();

        //If there are no displayed stocks, check cookies to display
        if ($scope.groups.length === 0) {
            $scope.displayWatchedStocks();
        }

        console.log('StockLookupCtrl init');
    };

    //Loads static list of stocks for easy search
    $scope.loadStockCompanies = function() {
        $http.get('/stock-info').then(function(response) {
            $scope.stockCompanies = response.data;
        });
    };

    $scope.displayWatchedStocks = function () {
        var cookies = $cookies.getAll();

        for(var property in cookies) {
            if (property.indexOf('stock.') === 0) {
                $scope.displayStockInfo(JSON.parse(cookies[property]), true);
            }
        }
    };

    $scope.submit = function() {
        //Check if symbol was indeed entered into the field
        if ($scope.selectedSymbol.ticker) {

            //Check if already watching entered symbol
            var cookieExists = $cookies.get("stock." + $scope.selectedSymbol.ticker.toUpperCase());

            //If not watching - make the GET call to retrieve stock information
            if (!cookieExists) {
                return $http.get('/stock-info', {
                    params: {
                        symbol: $scope.selectedSymbol.ticker
                    }
                }).then(function(response){
                    //Setting cookie and display information
                    var stockInfo = {
                        ticker : response.data.ticker,
                        name : response.data.name,
                        sector : response.data.sector,
                        industry_category : response.data.industry_category,
                        industry_group : response.data.industry_group
                    };
                    $scope.displayStockInfo(stockInfo, false);
                });
            }
            //If watching - show an alert indicating that it is being watched already
            else {
                $scope.alerts.push({msg: 'Already watching: ' + $scope.selectedSymbol.ticker.toUpperCase()});
            }
        }
    };

    //Display stock information
    $scope.displayStockInfo = function(stockInfo, isLoading) {
        if (!isLoading) {
            $cookies.put('stock.' + stockInfo.ticker, JSON.stringify(stockInfo));
        }

        $scope.groups.push(stockInfo);
    };

    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };

    //Removes view of WATCHED and deletes cookie
    $scope.removeStock = function(index) {
        var ticker = $scope.groups[index].ticker;
        console.log('removeStock: ' + ticker);

        $cookies.remove('stock.' + ticker);
        $scope.groups.splice(index, 1);
    };

    $scope.initialize();

});
