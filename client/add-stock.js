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
                        movingAverages : {}
                    };

                    var allClosePrices = arrayOfResults[1].data.data.map(function (dataPoint) {return dataPoint.close;})
                    $scope.calcMovingAverages(allClosePrices, stockInfo);

                    // RSI is an array of values based on a 14-day interval.
                    var rsi = $scope.reverseArray($scope.calcRSI(allClosePrices, stockInfo));

                    // Save volume per day over last 3 months (more data points are not needed)
                    var allVolume = arrayOfResults[1].data.data.map(function (dataPoint) {return dataPoint.volume;})
                    stockInfo.volume = $scope.reverseArray(allVolume.slice(0, 90));

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
    $scope.calcMovingAverages = function(allClosePrices, stockInfo) {
        stockInfo.movingAverages.days15 = $scope.reverseArray($scope.calcMovingAverage(allClosePrices, 15));
        stockInfo.movingAverages.days50 = $scope.reverseArray($scope.calcMovingAverage(allClosePrices, 50));
        stockInfo.movingAverages.days100 = $scope.reverseArray($scope.calcMovingAverage(allClosePrices, 100));
        stockInfo.movingAverages.days200 = $scope.reverseArray($scope.calcMovingAverage(allClosePrices, 200));

        stockInfo.closePrices = $scope.reverseArray(allClosePrices.slice(0, 200));

        return;
    };

    $scope.calcMovingAverage = function(allClosePrices, numDays) {
        var closePrices = allClosePrices.slice(0, numDays);
        return $scope.calcArrayAverage(closePrices);
    };

    // General calculate average in array.
    $scope.calcArrayAverage = function(arr) {
        var sum = arr.reduce(function(a, b) { return a + b; });
        return (sum / arr.length).toFixed(2);
    };

    /** Definition RSI (Relative Strength Index)-
    The relative strength index (RSI) is a momentum indicator, that compares
    the magnitude of recent gains and losses over a specified time period to
    measure speed and change of price movements of a security. It is primarily
    used to attempt to identify overbought or oversold conditions in the
    trading of an asset.

    Overbought = RSI > 70
    Oversold = RSI < 30
    **/
    $scope.calcRSI = function(allClosePrices, stockInfo) {
        console.log("Calculating RSI...");

        // Changes is the price difference, both plus and minus, between days.
        var changes = new Array(allClosePrices.length - 1);
        for (var index = 0; index < changes.length; index++) {
            changes[index] = (allClosePrices[index] - allClosePrices[index + 1]).toFixed(2);
        }

        var gains = new Array(changes.length);
        var losses = new Array(changes.length);

        for (var index = 0; index < changes.length; index++) {
            if (changes[index] <= 0) {
                gains[index] = 0;
                losses[index] = changes[index] * -1;
            } else {
                gains[index] = changes[index] * 1;
                losses[index] = 0;
            }
        }

        // Get average gains and average losses.
        var avgGains = new Array(changes.length - 13);
        var avgLosses = new Array(changes.length - 13);
        for (var index = 0; index < avgGains.length; index++) {
            avgGains[index] = $scope.calcArrayAverage(gains.slice(index, index + 14)) * 1;
            avgLosses[index] = $scope.calcArrayAverage(losses.slice(index, index + 14)) * 1;
        }

        // Calculate RS = (Average gains over 14 days) / (Average losses over 14 days).
        var rs = new Array(avgGains.length);
        for (var index = 0; index < avgGains.length - 15; index++) {
            rs[index] = avgGains[index] / avgLosses[index];
        }

        var rsi = new Array(rs.length);
        for (var index = 0; index < rsi.length - 1; index++) {
            if (avgLosses[index] < 0) {
                rsi[index] = 100;
            } else {
                rsi[index] = 100 - (100 / (1 + rs[index]));
            }
        }

        return rsi;
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

    $scope.reverseArray = function (arr) {
        var temp = [];
        var length = arr.length;
        for (var index = (length - 1); index !== 0; index--) {
            temp.push(arr[index]);
        }
        return temp;
    }

    $scope.initialize();
});
