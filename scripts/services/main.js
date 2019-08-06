define(['angular', './clientService', './configService', './calcsService', './graphiteService'], function (angular) {

    'use strict';
    
    angular.module('slamApp.services', [
        'services.ClientService',      
        'services.ConfigService',      
        'services.CalculationsService',      
        'services.GraphiteService'      
    ]);
});