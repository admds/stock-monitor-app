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
    $scope.stocks = [];
    $scope.orderStockBy = 'ticker';
    $scope.reverseStockOrder = false;

    $scope.selectedSymbol = undefined;

    $scope.initialize = function() {
        $scope.stockCompanies = [];
        $scope.loadStockCompanies();

        // If there are no displayed stocks, check cookies to display
        if ($scope.stocks.length === 0) {
            $scope.displayWatchedStocks();
        }

        console.log('StockLookupCtrl init');
    };

    // Loads static list of stocks for easy search
    $scope.loadStockCompanies = function() {
        $http.get('/information').then(function(response) {
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
        // Check if symbol was indeed entered into the field
        if ($scope.selectedSymbol.ticker) {

            // Check if already watching entered symbol
            var cookieExists = $cookies.get("stock." + $scope.selectedSymbol.ticker.toUpperCase());

            // If not watching - make the GET call to retrieve stock information
            if (!cookieExists) {
                return $http.get('/information', {
                    params: {
                        symbol: $scope.selectedSymbol.ticker
                    }
                }).then(function(response){
                    // Setting cookie and display information
                    var stockInfo = {
                        ticker: response.data.ticker,
                        name: response.data.name,
                        sector: response.data.sector,
                        industry_category: response.data.industry_category,
                        industry_group: response.data.industry_group,
                        favorite: false
                    };
                    $scope.displayStockInfo(stockInfo, false);
                });
            }
            else {
                $scope.alerts.push({msg: 'Already watching: ' + $scope.selectedSymbol.ticker.toUpperCase()});
            }
        }
    };

    $scope.reverseStockSorting = function() {
        $scope.reverseStockOrder = !$scope.reverseStockOrder;
    }

    // Display stock information
    $scope.displayStockInfo = function(stockInfo, isLoading) {
        if (!isLoading) {
            $cookies.put('stock.' + stockInfo.ticker, JSON.stringify(stockInfo));
        }

        $scope.stocks.push(stockInfo);
    };

    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };

    $scope.favoriteStock = function(symbol) {

        var stockInfo = $scope.stocks.filter(function(stock) {
            return stock.ticker === symbol;
        })[0];

        if (stockInfo.favorite) {
            console.log('Unfavoriting %s stock.', stockInfo.ticker);
        }
        else {
            console.log('Favoriting %s stock.', stockInfo.ticker );
        }

        stockInfo.favorite = !stockInfo.favorite;

        // Re-add the stock information to the cookie with the updated favorite value.
        $cookies.remove('stock.' + stockInfo.ticker);
        $cookies.put('stock.' + stockInfo.ticker, JSON.stringify(stockInfo));
    };

    // Removes view of WATCHED and deletes cookie
    $scope.removeStock = function(symbol) {
        console.log('Removing %s from watched stocks.', symbol);

        $cookies.remove('stock.' + symbol);
        var index = $scope.stocks.map(function(stock) {
            return stock.ticker;
        }).indexOf(symbol);
        $scope.stocks.splice(index, 1);
    };

    $scope.initialize();

});
