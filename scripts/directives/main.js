define(['angular', './appMetricGraph', './selfService', './globalConfig', './graphiteModule'], function (angular) {

    'use strict';
    
    angular.module('slamApp.directives', [
        'directives.appMetricGraph',      
        'directives.selfService',      
        'directives.globalConfig',      
        'directives.graphiteModule'      
    ]);
});