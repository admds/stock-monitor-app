/* globals angular */
'use strict';

angular.module('stockMonitorApp.index', ['ngRoute', 'ngCookies', 'ngAnimate', 'ngSanitize', 'ui.bootstrap'])

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/index', {
        templateUrl: '/add-stock.html',
        controller: 'StockLookupCtrl'
    });
}])

.controller('StockLookupCtrl', function($scope, $http, $cookies, $q) {
    $scope.button = {
        submit : {
            text : "Submit",
            loading : false
        }
    };
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
        $scope.button.submit.text = "Please wait";
        $scope.button.submit.loading = true;

        //Check if symbol was indeed entered into the field
        if ($scope.selectedSymbol.ticker) {
            var stockInfo;

            //Check if already watching entered symbol
            var cookieExists = $cookies.get("stock." + $scope.selectedSymbol.ticker.toUpperCase());

            //If not watching - make the GET call to retrieve stock information
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
                    stockInfo = {
                        ticker : arrayOfResults[0].data.ticker,
                        name : arrayOfResults[0].data.name,
                        sector : arrayOfResults[0].data.sector,
                        industry_category : arrayOfResults[0].data.industry_category,
                        industry_group : arrayOfResults[0].data.industry_group,
                        movingAverages : {
                            days15 : -1,
                            days50 : -1,
                            days100 : -1,
                            days200 : -1
                        }
                    };

                    $scope.calcMovingAverages(arrayOfResults[1].data.data, stockInfo);

                    console.log(stockInfo);
                    $scope.displayStockInfo(stockInfo, false);
                });
            }
            else {
                $scope.alerts.push({msg: 'Already watching: ' + $scope.selectedSymbol.ticker.toUpperCase()});
            }
        }
        $scope.button.submit.text = "Submit";
        $scope.button.submit.loading = false;
    };

    $scope.calcMovingAverages = function(arrOfDataPoints, stockInfo) {
        console.log("Calculating moving averages: 15, 50, 100, 200");
        var allClosePrices = arrOfDataPoints.map(function (dataPoint) {return dataPoint.close;})

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
