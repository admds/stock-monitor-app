/* globals angular */
'use strict';

angular.module('stockMonitorApp.index', ['ngRoute', 'ngCookies', 'ngAnimate', 'ngSanitize', 'ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/index', {
        templateUrl: '/add-stock.html'
    });
}])

.controller('StockLookupCtrl', function($scope, $http, $cookies) {
    $scope.alerts = [];
    $scope.stocks = [];
    $scope.stockCompanies = [];
    $scope.orderStocksBy = 'symbol';
    $scope.reverseStockOrder = false;
    $scope.selectedSymbol = undefined;
    $scope.selectedStock = undefined;
    $scope.submitButtonDisabled = true;


    $scope.initialize = function() {
        $scope.addSelectedSymbolWatcher();

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
                var stockInfo = JSON.parse(cookies[property]);
                $scope.stocks.push(stockInfo);
            }
        }
    };

    $scope.submit = function() {
        // Check if symbol has been selected.
        if ($scope.selectedSymbol && $scope.selectedSymbol.ticker) {
            // Check if we are already watching the selected symbol.
            var cookieExists = $cookies.get($scope.getStockKey($scope.selectedSymbol.ticker));

            // If not watching - make the GET call to retrieve stock information.
            if (!cookieExists) {
                // Go ahead and display the basic stock information (name and symbol).
                var stockInfo = {
                    symbol : $scope.selectedSymbol.ticker,
                    name : $scope.selectedSymbol.name,
                    sector : '',
                    industry_category : '',
                    industry_group : '',
                    favorite: false,
                    loading: true,
                    movingAverages : {}
                };

                $scope.addOrUpdateStock(stockInfo);

                // Load the rest of the stock information
                var informationCall = $http.get('/information', {
                    params: {
                        symbol: stockInfo.symbol
                    }
                }).then(function(informationResponse) {
                    // Set the information that we just loaded.
                    stockInfo.sector = informationResponse.data.sector;
                    stockInfo.industryCategory = informationResponse.data.industry_category;
                    stockInfo.industryGroup = informationResponse.data.industry_group;

                    $scope.addOrUpdateStock(stockInfo);
                    var pricesCall = $http.get('/prices', {
                        params: {
                            symbol: stockInfo.symbol
                        }
                    }).then(function(pricesResponse) {
                        var allClosePrices = pricesResponse.data.data.map(function (dataPoint) {return dataPoint.close;})
                        $scope.calcMovingAverages(allClosePrices, stockInfo);

                        // RSI is an array of values based on a 14-day interval.
                        var rsi = $scope.reverseArray($scope.calcRSI(allClosePrices, stockInfo));

                        // Save volume per day over last 3 months (more data points are not needed)
                        var allVolume = pricesResponse.data.data.map(function (dataPoint) {return dataPoint.volume;})
                        stockInfo.volume = allVolume.slice(0, 90);
                        stockInfo.loading = false;
                        $scope.addOrUpdateStock(stockInfo);
                        $scope.toggle = true;
                    });
                });
            }
            else {
                $scope.toggle = true;
                $scope.alerts.push({msg: 'Already watching ' + $scope.selectedSymbol.ticker});
            }
        }
        else {
            $scope.toggle = true;
            $scope.alerts.push({msg: 'Please enter a stock symbol.'});
        }
    };

    $scope.hasStockSelected = function() {
        return $scope.selectedStock;
    };

    $scope.createChart = function() {
        if (!$scope.selectedStock) {
            return;
        }

        console.log('Creating a chart for ', $scope.selectStock.symbol);

        // Create the chart
        Highcharts.stockChart('container', {
            rangeSelector: {
                selected: 1
            },

            title: {
                text: $scope.selectedStock.symbol + ' - ' + $scope.selectedStock.name + ' Stock Price'
            },

            series: [{
                name: $scope.selectedStock.symbol,
                data: $scope.selectedStock.volume,
                tooltip: {
                    valueDecimals: 2
                }
            }]
        });
    }

    $scope.sortStocks = function(orderByValue) {
        console.log($scope.orderStocksBy);
        $scope.orderStocksBy = orderByValue;
    };

    $scope.reverseStockSorting = function() {
        $scope.reverseStockOrder = !$scope.reverseStockOrder;
    };

    // Display stock information and saves last 200 days of closing prices to cookie.
    $scope.calcMovingAverages = function(allClosePrices, stockInfo) {
        stockInfo.movingAverages.days15 = $scope.calcMovingAverage(allClosePrices, 15);
        stockInfo.movingAverages.days50 = $scope.calcMovingAverage(allClosePrices, 50);
        stockInfo.movingAverages.days100 = $scope.calcMovingAverage(allClosePrices, 100);
        stockInfo.movingAverages.days200 = $scope.calcMovingAverage(allClosePrices, 200);

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

    // Adds a stock to the watched list and updates the cookie for that stock.
    $scope.addOrUpdateStock = function(stockInfo) {
        var key = $scope.getStockKey(stockInfo.symbol);
        var cookieExists = $cookies.get(key);
        if (cookieExists) {
            // The stock already exists, remove the old information in case there is new information.
            $cookies.remove(key);
        }
        else {
            // The stock doesn't exist add it  to watched stockes.
            $scope.stocks.push(stockInfo);
        }

        // Update the cached stock information.
        $cookies.put(key, JSON.stringify(stockInfo));
    };

    $scope.addSelectedSymbolWatcher = function() {
        $scope.$watch('selectedSymbol', function() {
            var stockSymbols = $scope.stocks.map(function(stockInfo) {
                return stockInfo.symbol;
            });
            if ($scope.selectedSymbol && $scope.selectedSymbol.ticker && stockSymbols.indexOf($scope.selectedSymbol.ticker) === -1 ) {
                $scope.submitButtonDisabled = false;
            }
            else {
                $scope.submitButtonDisabled = true;
            }
        });
    };

    $scope.selectStock = function(stockInfo) {
        $scope.selectedStock = stockInfo;
        $scope.createChart();
    };

    $scope.getStockKey = function(symbol) {
        return 'stock.' + symbol;
    };

    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };

    $scope.favoriteStock = function(symbol) {
        var stockInfo = $scope.stocks.filter(function(stock) {
            return stock.symbol === symbol;
        })[0];

        if (stockInfo.favorite) {
            console.log('Unfavoriting %s stock.', stockInfo.symbol);
        }
        else {
            console.log('Favoriting %s stock.', stockInfo.symbol );
        }

        stockInfo.favorite = !stockInfo.favorite;

        // Re-add the stock information to the cookie with the updated favorite value.
        var key = $scope.getStockKey(stockInfo.symbol)
        $cookies.remove(key);
        $cookies.put(key, JSON.stringify(stockInfo));
    };

    // Removes view of WATCHED and deletes cookie.
    $scope.removeStock = function(symbol) {
        console.log('Removing %s from watched stocks.', symbol);

        $cookies.remove($scope.getStockKey(symbol));
        var index = $scope.stocks.map(function(stock) {
            return stock.symbol;
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
