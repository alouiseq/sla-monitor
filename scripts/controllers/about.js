define(['angular'], function (angular) {
    'use strict';

    /**
     * @ngdoc function
     * @name slamApp.controller:AboutCtrl
     * @description
     * # AboutCtrl
     * Controller of the slamApp
     */
    angular.module('controllers.AboutCtrl', [])
        .controller('AboutCtrl', function () {
            this.awesomeThings = [
                'HTML5 Boilerplate',
                'AngularJS',
                'Karma'
            ];
        });
});
