define(['angular'], function (angular) {
    'use strict';

    /**
     * @ngdoc function
     * @name slamApp.controller:PageConfigCtrl
     * @description
     * # PageConfigCtrl
     * Controller of the slamApp
     */
    angular.module('controllers.PageConfigCtrl', [])
        .controller('PageConfigCtrl', function ($scope, ClientService) {

            /*** DEFAULTS ***/

            $scope.userThresholdTime;
            $scope.userThresholdSLA;
            $scope.dataSource;


            /*** INITIALIZE ***/

            $scope.setDataSource = ClientService.setDataSource;
            $scope.setThreshTime = ClientService.setThresholdTime;
            $scope.setThreshSLA = ClientService.setThresholdSLA;

            $scope.userThresholdTime = ClientService.getThresholdTime() || 30000;
            $scope.userThresholdSLA = ClientService.getThresholdSLA() || 100;
            $scope.dataSource = ClientService.getDataSource() || 'test';
            
        });
});
