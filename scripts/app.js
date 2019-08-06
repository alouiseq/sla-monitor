/*jshint unused: vars */
define(['angular', 'controllers/main', 'directives/main', 'services/main']/*deps*/, function (angular)/*invoke*/ {
    'use strict';

    /**
     * @ngdoc overview
     * @name slamApp
     * @description
     * # slamApp
     *
     * Main module of the application.
     */
    return angular
        .module('slamApp', [
            'slamApp.controllers',
            'slamApp.directives',
            'slamApp.services',
            /*angJSDeps*/
            'ngResource',
            'ngRoute',
            // 'ui.router'
        ])
        .value('urls', {
            baseUrl: 'http://slam.internal.shutterfly.com'
            // baseUrl: 'http://localhost'
            // baseUrl: 'http://10.86.67.8:8080'
        })
        .config(function ($routeProvider) {
            $routeProvider
                .when('/graphs', {
                    templateUrl: 'views/pageGraph.html',
                    controller: 'PageGraphCtrl',
                    controllerAs: 'pageGraph',
                    resolve: {
                        response: function getMonitors (ClientService, ConfigService) {                           
                            // Get all active SLAM monitors or specific monitors based on brand                     
                            return ClientService.getMonitors(ConfigService.getMock());
                        }
                    }
                })
                .when('/graphs/:brand', {
                    templateUrl: 'views/pageGraph.html',
                    controller: 'PageGraphCtrl',
                    controllerAs: 'pageGraph',
                    resolve: {
                        response: function getMonitors (ClientService, ConfigService) {                           
                            // Get all active SLAM monitors or specific monitors based on brand                     
                            return ClientService.getMonitors(ConfigService.getMock());
                        }
                    }
                })
                .when('/admin', {
                    templateUrl: 'views/globalConfig.html',                    
                })
                .when('/selfservice', {
                    templateUrl: 'views/localConfig.html',
                })
                .when('/about', {
                    templateUrl: 'views/about.html',
                    controller: 'AboutCtrl',
                    controllerAs: 'about'
                })
                .otherwise({
                    redirectTo: '/graphs'
                });
        })
        // .config(function ($stateProvider, $urlRouterProvider) {            
        //     $stateProvider
        //         .state('graphs', {
        //             url: '/graphs',
        //             templateUrl: 'views/pageGraph.html',
        //             controller: 'PageGraphCtrl'
        //             // controllerAs: 'pageGraph'
        //         })
        //         .state('graphs-brand', {
        //             url: '/graphs/:brand',
        //             templateUrl: 'views/pageGraph.html',
        //             controller: 'PageGraphCtrl'
        //             // controllerAs: 'pageGraph'
        //         })
        //         .state('admin', {
        //             url: '/admin',
        //             templateUrl: 'views/pageConfig.html',
        //             // controller: 'PageConfigCtrl',
        //             // controllerAs: 'pageConfig'
        //         })
        //         .state('about', {
        //             url: '/about',
        //             templateUrl: 'views/about.html',
        //             controller: 'AboutCtrl',
        //             controllerAs: 'about'
        //         });
            
        //     $urlRouterProvider.otherwise('/graphs');
        // })
        .run(function ($rootScope, urls, $window, $route, ConfigService, ClientService) {

            // Get a number of tickets based on page size specified
            // statusServices.getTicketsDetail(0);

            // Specify url for http requests
            urls.baseUrl = 'http://slam.internal.shutterfly.com';
            // urls.baseUrl = location.origin;
            // urls.baseUrl = 'http://localhost'
            // urls.baseUrl = 'http://10.86.67.8:8080';
            
        });
});
