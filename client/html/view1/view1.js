'use strict';

angular.module('stockMonitorApp.view1', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/view1', {
    templateUrl: 'html/view1/view1.html',
    controller: 'View1Ctrl'
  });
}])

.controller('View1Ctrl', ['$scope', function($scope) {
  $scope.initialize = function() {
    $scope.initText = 'loading';
    window.setTimeout(function() {
      $scope.initText = 'ready';
      $scope.$apply();
    }, 10000);
    console.log('view 1 init');
  };

  $scope.initialize();
}]);
