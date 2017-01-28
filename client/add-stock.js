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

                        stockInfo.prices = $scope.reverseArray(pricesResponse.data.data.map(function(dataPoint) {
                            return [Date.parse(dataPoint.date), dataPoint.close];
                        }))

                        // RSI is an array of values based on a 14-day interval.
                        stockInfo.relativeStrengthIndex = $scope.reverseArray($scope.calcRSI(pricesResponse.data.data, stockInfo));

                        // Save volume per day over last 3 months (more data points are not needed)
                        stockInfo.volume = $scope.reverseArray(pricesResponse.data.data.map(function (dataPoint) {
                            return [Date.parse(dataPoint.date), dataPoint.volume];
                        }));
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

        // Create the chart
        console.log('Creating a chart for ', $scope.selectedStock.symbol);
        Highcharts.stockChart('container', {
            chart:{
                panning: false
            },
            rangeSelector: {
                selected: 1
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: { // don't display the dummy year
                    month: '%e. %b',
                    year: '%b'
                },
                title: {
                     text: 'Date'
                 }
            },

            yAxis: [{
                labels: {
                    format: '{value}',
                    style: {
                        color: Highcharts.getOptions().colors[0]
                    }
                },
                title: {
                    text: 'Volume',
                    style: {
                        color: Highcharts.getOptions().colors[0]
                    }
                },
                opposite: true
            },

            {
                labels: {
                    format: '{value}',
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                },
                title: {
                    text: 'RSI',
                    style: {
                        color: Highcharts.getOptions().colors[1]
                    }
                },
                opposite: true
            },
            {
                labels: {
                    format: '{value}',
                    style: {
                        color: Highcharts.getOptions().colors[2]
                    }
                },
                title: {
                    text: 'Price',
                    style: {
                        color: Highcharts.getOptions().colors[2]
                    }
                },
                opposite: false
            }
            ],

            title: {
                text: $scope.selectedStock.symbol + ' - ' + $scope.selectedStock.name
            },

            series: [{
                name: 'Volume Traded',
                data: $scope.selectedStock.volume,
                yAxis: 0,
                tooltip: {
                    valueDecimals: 2
                }
            },
            {
                name: 'RSI',
                data: $scope.selectedStock.relativeStrengthIndex,
                yAxis: 1,
                tooltip: {
                    valueDecimals: 2
                }
            },
            {
                name: 'Close Price',
                data: $scope.selectedStock.prices,
                yAxis: 2,
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
        stockInfo.movingAverages.days15 = $scope.calcMovingAverage(allClosePrices, 15).toFixed(2);
        stockInfo.movingAverages.days50 = $scope.calcMovingAverage(allClosePrices, 50).toFixed(2);
        stockInfo.movingAverages.days100 = $scope.calcMovingAverage(allClosePrices, 100).toFixed(2);
        stockInfo.movingAverages.days200 = $scope.calcMovingAverage(allClosePrices, 200).toFixed(2);

        stockInfo.closePrices = $scope.reverseArray(allClosePrices.slice(0, 200));
    };

    $scope.calcMovingAverage = function(allClosePrices, numDays) {
        var closePrices = allClosePrices.slice(0, numDays);
        return $scope.calcArrayAverage(closePrices);
    };

    // General calculate average in array.
    $scope.calcArrayAverage = function(arr) {
        var sum = arr.reduce(function(a, b) { return a + b; });
        return (sum / arr.length);
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
    $scope.calcRSI = function(allDataPoints, stockInfo) {
        console.log("Calculating RSI...");

        // Changes is the price difference, both plus and minus, between days.
        var changes = [];
        var changes = allDataPoints.slice(0, allDataPoints.length - 1).map(function(dataPoint, index) {
            return {
                date: Date.parse(dataPoint.date),
                change: dataPoint.close - allDataPoints[index + 1].close
            };
        });

        var gainsAndLosses = [];
        changes.forEach(function(change) {
            var gain = 0;
            var loss = 0;
            if (change.change <= 0) {
                loss = change.change * -1;
            }
            else {
                gain = change.change;
            }

            gainsAndLosses.push({
                date: change.date,
                gain: gain,
                loss: loss
            });
        });

        var rsi = gainsAndLosses.slice(0, gainsAndLosses.length - 13).map(function(gainAndLoss, index) {
            // Get average gains and average losses over a two week period.
            var avgGain = $scope.calcArrayAverage(gainsAndLosses.slice(index, index + 14).map(function(gal) {
                return gal.gain;
            }));
            var avgLoss = $scope.calcArrayAverage(gainsAndLosses.slice(index, index + 14).map(function(gal) {
                return gal.loss;
            }));

            // Calculate RSI = 100 - (100 / (1+Average gains over 14 days) / (Average losses over 14 days)).
            var rsi = 100;
            if (avgLoss > 0) {
                rsi = 100 - (100 / (1 + avgGain / avgLoss));
            }

            return [gainAndLoss.date, rsi];
        });

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

        $cookies.put(key, JSON.stringify($scope.getCookieStock(stockInfo)));
    };

    $scope.getCookieStock = function(stockInfo) {
        return {
            symbol: stockInfo.symbol,
            name: stockInfo.name,
            sector: stockInfo.sector,
            industryGroup: stockInfo.industryGroup,
            industryCategory: stockInfo.industryCategory,
            favorite: stockInfo.favorite
        };
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

        $scope.selectedStock.movingAverages.days15 = stockInfo.movingAverages.days15;
        $scope.selectedStock.movingAverages.days50 = stockInfo.movingAverages.days50;
        $scope.selectedStock.movingAverages.days100 = stockInfo.movingAverages.days100;
        $scope.selectedStock.movingAverages.days200 = stockInfo.movingAverages.days200;
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
        $cookies.put(key, JSON.stringify($scope.getCookieStock(stockInfo)));
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
