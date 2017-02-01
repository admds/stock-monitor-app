/* globals angular */
'use strict';

angular.module('stockMonitorApp.index', ['ngRoute', 'ngCookies', 'ngAnimate', 'ngSanitize', 'ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/index', {
        templateUrl: '/secured/add-stock.html'
    });
}])

.controller('StockLookupCtrl', function($scope, $http, $cookies) {
    $scope.alerts = [];
    $scope.stocks = [];
    $scope.stockCompanies = [];

    $scope.orderStocksBy = 'symbol';
    $scope.priceBought = undefined;
    $scope.quantityBought = undefined;
    $scope.reverseStockOrder = false;
    $scope.selectedStock = undefined;
    $scope.selectedSymbol = undefined;
    $scope.submitButtonDisabled = true;
    $scope.user = {};

    $scope.initialize = function() {
        $scope.addSelectedSymbolWatcher();
        $scope.loadCurrentUser();
        $scope.loadStockCompanies();
        console.log('StockLookupCtrl init');
    };

    $scope.loadCurrentUser = function() {
        $http.get('/secured/users?id=current').then(function(response) {
            $scope.user = response.data;
            $scope.stocks = $scope.user.stocks;
        });
    };

    $scope.saveCurrentUser = function() {
        $scope.user.stocks = $scope.stocks.map($scope.getSavedStockInfo);
        $http.post('/secured/users?id=' + $scope.user.id, $scope.user, null, 'application/json').then(function(response) {
            // handle error responses
        });
    };

    // Loads static list of stocks for easy search
    $scope.loadStockCompanies = function() {
        $http.get('/secured/information').then(function(response) {
            $scope.stockCompanies = response.data;
        });
    };

    // Update cookie with price bought and quantity bought of certain stock.
    $scope.saveOwned = function() {
        // Check that fields are with information to save.
        if ($scope.selectedSymbol && $scope.selectedSymbol.ticker && $scope.priceBought && $scope.quantityBought) {
            // add price and quantity
            // save current user
        }
    };

    $scope.submit = function() {
        // Check if symbol has been selected.
        if ($scope.selectedSymbol && $scope.selectedSymbol.ticker) {
            var filteredStocks = $scope.stocks.filter(function(stock) {
                return stock.symbol === $scope.selectedSymbol.ticker;
            });

            // If not watching - make the GET call to retrieve stock information.
            if (filteredStocks.length === 0) {
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
                $scope.loadExtraStockInformation(stockInfo);
                $scope.loadStockPrices(stockInfo);
            }
            else {
                $scope.alerts.push({msg: 'Already watching ' + $scope.selectedSymbol.ticker});
            }
        }
        else {
            $scope.alerts.push({msg: 'Please enter a stock symbol.'});
        }
    };

    $scope.loadExtraStockInformation = function(stockInfo) {
        // Load the rest of the stock information
        stockInfo.loadingExtraStockInformation = true;
        $http.get('/secured/information', {
            params: {
                symbol: stockInfo.symbol
            }
        }).then(function(informationResponse) {
            // Set the information that we just loaded.
            stockInfo.sector = informationResponse.data.sector;
            stockInfo.industryCategory = informationResponse.data.industry_category;
            stockInfo.industryGroup = informationResponse.data.industry_group;

            stockInfo.loadingExtraStockInformation = false;
            stockInfo.loading = stockInfo.loadingStockPrices || stockInfo.loadingExtraStockInformation;
            $scope.addOrUpdateStock(stockInfo);
        });
    };

    $scope.loadDataPoints = function(stockInfo) {
        $http.get('/secured/data-points', {
            params: {
                symbol: stockInfo.symbol
            }
        }).then(function(dataPointsResponse) {
            // Set the information that we just loaded.
            if (dataPointsResponse.data.data[0].value == "nm") {
                stockInfo.priceToEarnings = "Not Meaningful (Possible negative Earnings)"
            }
            else {
                stockInfo.priceToEarnings = dataPointsResponse.data.data[0].value.toFixed(2);
            }

            stockInfo.low52week = dataPointsResponse.data.data[1].value;
            stockInfo.high52week = dataPointsResponse.data.data[2].value;

            $scope.addOrUpdateStock(stockInfo);
        });
    };

    $scope.loadStockPrices = function(stockInfo, stockSelected, callback) {
        stockInfo.loadingStockPrices = true;
        $http.get('/secured/prices', {
            params: {
                symbol: stockInfo.symbol
            }
        }).then(function(pricesResponse) {
            stockInfo.closePrice = pricesResponse.data.data[0].close;
            stockInfo.dayLow = pricesResponse.data.data[0].low;
            stockInfo.dayHigh = pricesResponse.data.data[0].high;


            if (stockSelected) {
                $scope.selectedStock.date = pricesResponse.data.data[0].date;
            }

            var allClosePrices = pricesResponse.data.data.map(function (dataPoint) {return dataPoint.close;})
            $scope.calcMovingAverages(allClosePrices, stockInfo);

            stockInfo.prices = $scope.reverseArray(pricesResponse.data.data.map(function(dataPoint) {
                return [Date.parse(dataPoint.date), dataPoint.close];
            }));

            // RSI is an array of values based on a 14-day interval.
            stockInfo.relativeStrengthIndex = $scope.reverseArray($scope.calcRSI(pricesResponse.data.data, stockInfo));
            stockInfo.relativeStrengthIndex.current = stockInfo.relativeStrengthIndex[stockInfo.relativeStrengthIndex.length - 1][1].toFixed(2);

            // Save volume per day over last 3 months (more data points are not needed)
            stockInfo.volume = $scope.reverseArray(pricesResponse.data.data.map(function (dataPoint) {
                return [Date.parse(dataPoint.date), dataPoint.volume];
            }));
            stockInfo.loadingStockPrices = false;
            stockInfo.loading = stockInfo.loadingStockPrices || stockInfo.loadingExtraStockInformation;
            $scope.addOrUpdateStock(stockInfo);
            if (callback) {
                callback();
            }
        });
    };

    $scope.loadStockNews = function(stockInfo) {
        stockInfo.loadingStockNews = true;
        $http.get('/secured/news', {
            params: {
                symbol: stockInfo.symbol
            }
        }).then(function(newsResponse) {
            // We only want the first 10 news items. Also convert the date string into a date object.
            stockInfo.news = newsResponse.data.data.splice(0, 11).map(function(news) {
                return {
                    title: news.title,
                    url: news.url,
                    publicationDate: new Date(news.publication_date),
                    summary: news.summary
                };
            });

            stockInfo.loadingStockNews = false;
        });
    };

    $scope.hasStockSelected = function() {
        return $scope.selectedStock;
    };

    $scope.hasStockSelectedDate = function() {
        return $scope.selectedStock && $scope.selectedStock.date
            && $scope.selectedStock.date != "";
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
        stockInfo.movingAverages = {};
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

    // Adds a stock to the watched list and updates the saved values for that stock.
    $scope.addOrUpdateStock = function(stockInfo) {
        var key = $scope.getStockKey(stockInfo.symbol);
        var index = $scope.stocks.map(function(stock) {
            return stock.symbol;
        }).indexOf(stockInfo.symbol);
        if (index >= 0) {
            // The stock already exists, remove the old information in case there is new information.
            $scope.stocks.splice(index, 1);
        }

        $scope.stocks.push(stockInfo);

        // Update the saved stock information.
        $scope.saveCurrentUser();
    };

    $scope.getSavedStockInfo = function(stockInfo) {
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

        $scope.loadExtraStockInformation(stockInfo);
        $scope.loadDataPoints(stockInfo);
        $scope.loadStockPrices(stockInfo, true, function() {
            $scope.createChart();
        });
        $scope.loadStockNews(stockInfo);


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
        $scope.saveCurrentUser();
    };

    // Removes view of WATCHED and deletes the save information.
    $scope.removeStock = function(symbol) {
        console.log('Removing %s from watched stocks.', symbol);
        var index = $scope.stocks.map(function(stock) {
            return stock.symbol;
        }).indexOf(symbol);
        $scope.stocks.splice(index, 1);
        $scope.saveCurrentUser();
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
