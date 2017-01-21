/* globals angular */
'use strict';

angular.module('stockMonitorApp.index', ['ngRoute', 'ngCookies', 'ngAnimate', 'ngSanitize', 'ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/index', {
        templateUrl: '/add-stock.html'
    });
}])

.controller('StockLookupCtrl', function($scope, $http, $cookies, $q) {
    $scope.oneAtATime = true;
    $scope.alerts = [];
    $scope.stocks = [];
    $scope.orderStockBy = 'ticker';
    $scope.reverseStockOrder = false;

    $scope.selectedSymbol = undefined;

    $scope.initialize = function() {
        $scope.stockCompanies = [];
        $scope.toggle = true;
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

    //TODO: Add validation for invalid ticker symbols
    $scope.submit = function() {

        // Check if symbol was indeed entered into the field.
        if ($scope.selectedSymbol && $scope.selectedSymbol.ticker) {
            // Check if already watching entered symbol.
            var cookieExists = $cookies.get("stock." + $scope.selectedSymbol.ticker.toUpperCase());

            // If not watching - make the GET call to retrieve stock information.
            if (!cookieExists) {

                var informationCall = $http.get('/information', {
                    params: {
                        symbol: $scope.selectedSymbol.ticker
                    }
                });
                var pricesCall = $http.get('/prices', {
                    params: {
                        symbol: $scope.selectedSymbol.ticker
                    }
                });
                $q.all([informationCall, pricesCall]).then(function(arrayOfResults) {
                    var stockInfo = {
                        ticker : arrayOfResults[0].data.ticker,
                        name : arrayOfResults[0].data.name,
                        sector : arrayOfResults[0].data.sector,
                        industry_category : arrayOfResults[0].data.industry_category,
                        industry_group : arrayOfResults[0].data.industry_group,
                        favorite: false,
                        movingAverages : {
                            days15 : -1,
                            days50 : -1,
                            days100 : -1,
                            days200 : -1
                        }
                    };

                    $scope.calcMovingAverages(arrayOfResults[1].data.data, stockInfo);

                    // Save volume per day over last 3 months (more data points are not needed)
                    var allVolume = arrayOfResults[1].data.data.map(function (dataPoint) {return dataPoint.volume;})
                    stockInfo.volume = allVolume.slice(0, 90);

                    console.log(stockInfo);
                    $scope.displayStockInfo(stockInfo, false);
                    $scope.toggle = true;
                });
            }
            else {
                $scope.toggle = true;
                $scope.alerts.push({msg: 'Already watching: ' + $scope.selectedSymbol.ticker.toUpperCase()});
            }
        }
        else {
            $scope.toggle = true;
            $scope.alerts.push({msg: 'Please enter ticker symbol.'});
        }
    };

    $scope.reverseStockSorting = function() {
        $scope.reverseStockOrder = !$scope.reverseStockOrder;
    }

    // Display stock information and saves last 200 days of closing prices to cookie.
    $scope.calcMovingAverages = function(arrOfDataPoints, stockInfo) {
        var allClosePrices = arrOfDataPoints.map(function (dataPoint) {return dataPoint.close;})
        stockInfo.closePrices = allClosePrices.slice(0, 200);

        stockInfo.movingAverages.days15 = $scope.calcMovingAverage(allClosePrices, 15);
        stockInfo.movingAverages.days50 = $scope.calcMovingAverage(allClosePrices, 50);
        stockInfo.movingAverages.days100 = $scope.calcMovingAverage(allClosePrices, 100);
        stockInfo.movingAverages.days200 = $scope.calcMovingAverage(allClosePrices, 200);

        return;
    };

    $scope.calcMovingAverage = function(allClosePrices, numDays) {
        var closePrices = allClosePrices.slice(0, numDays);
        var sum = closePrices.reduce(function(a, b) { return a + b; });
        return (sum / numDays).toFixed(2);
    };

    // Display stock information.
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

    // Removes view of WATCHED and deletes cookie.
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
