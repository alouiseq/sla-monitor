define(['angular', './pageGraph', './pageConfig', './about'], function (angular) {

    'use strict';
    
    angular.module('slamApp.controllers', [
        'controllers.PageGraphCtrl',      
        'controllers.PageConfigCtrl',      
        'controllers.AboutCtrl'      
    ]);
});