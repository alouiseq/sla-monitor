define(['angular'], function (angular) {
    'use strict';

    /**
     * @ngdoc function
     * @name slamApp.directive:globalConfig
     * @description Configurable global settings for SLA and threshold values
     * # globalConfig
     * Directive of the slamApp
     */
    angular.module('directives.globalConfig', [])
        .directive('globalConfig', function (ClientService, ConfigService, urls, $interval, $timeout) {
         
            return {
                restrict: 'EA',
                templateUrl: 'views/adminConfig.html',
                scope: {

                },
                link: function (scope, element) {

                    /*** DEFAULTS ***/                    
                    
                    // Client options                    
                    scope.thresholdTime = ClientService.getThresholdTime() / 1000; // mil to sec
                    scope.thresholdSLA = ClientService.getThresholdSLA();
                    scope.threshSaved = true;
                    scope.slaSaved = true;
                    var originalThreshold = scope.thresholdTime; // mil to sec
                    var originalSLA = scope.thresholdSLA;
                   
                    // Other defaults                    
                    var intervalProm;           


                    /*** PUBLIC METHODS ***/                                                                    
                                                        
                    // Reload SLA graphs
                    scope.goToGraphs = function () {
                        navigateToGraphs();
                    };                    
                    
                    /*** Settings ***/                                                                            
                    
                    // Set SLA via horizontal sliders
                    scope.sliderSLA = (function () {                        
                        var typeClass = 'sla-slider';
                        var xOffset;
                        var interval = 100;
                        var increment;

                        return function (dir) {
                            function processing () {
                                increment = dir === 'up' ? 1 : -1;
                                xOffset = scope.thresholdSLA - 50 + increment;                                                                    
                                scope.thresholdSLA += increment;                                

                                // Respect boundaries
                                if (scope.thresholdSLA < 50) {
                                    xOffset += increment + 2;
                                    scope.thresholdSLA = 50;
                                } else if (scope.thresholdSLA > 100) {
                                    xOffset +=  increment - 2;
                                    scope.thresholdSLA = 100;
                                }                               

                                $('.'+typeClass).css('margin-left', xOffset);                                
                            }

                            // first increase should always be allowed
                            processing();
                            // Set interval for any subsequent increase via mousedown
                            intervalProm = $interval(processing, interval);
                        };
                    })();

                    // Set Threshold via horizontal sliders
                    scope.sliderThresh = (function () {                        
                        var typeClass = 'thresh-slider';
                        var xOffset;
                        var interval = 100;
                        var increment;

                        return function (dir) {
                            function processing () {
                                increment = dir === 'up' ? 1 : -1;
                                xOffset = scope.thresholdTime + increment;                                                                    
                                scope.thresholdTime = xOffset;                                

                                // Respect boundaries
                                if (scope.thresholdTime < 0) {
                                    xOffset += increment + 2;
                                    scope.thresholdTime = 0;
                                } else if (scope.thresholdTime > 50) {
                                    xOffset +=  increment - 2;
                                    scope.thresholdTime = 50;
                                }                               

                                $('.'+typeClass).css('margin-left', xOffset);                                
                            }

                            // first increase should always be allowed
                            processing();
                            // Set interval for any subsequent increase via mousedown
                            intervalProm = $interval(processing, interval);
                        };
                    })();                                      

                    // Set Threshold Delay
                    scope.setThresholdDelay = function () {
                        stopInterval();

                        // Send threshold value to db                       
                        var data = {
                            'global_threshold': parseInt(scope.thresholdTime) * 1000
                        }

                        ClientService.postThresholdAndSLA(data).then(
                            function (response) {
                                scope.threshSaved = true;
                            },
                            function (error) {
                                scope.threshSaved = false;
                                scope.thresholdTime = originalThreshold;                                
                                $('.'+'thresh-slider').css('margin-left', scope.thresholdTime);
                            }
                        );
                    };

                    // Set SLA
                    scope.setSLA = function () {
                        stopInterval();                        

                        // Send SLA value to db                       
                        var data = {
                            'global_sla': parseInt(scope.thresholdSLA)
                        }

                        ClientService.postThresholdAndSLA(data).then(
                            function (response) {
                                scope.slaSaved = true;
                            },
                            function (error) {
                                scope.slaSaved = false;
                                scope.thresholdSLA = originalSLA;
                                $('.'+'sla-slider').css('margin-left', scope.thresholdSLA - 50);
                            }
                        );
                    };                                                                                                                                                                                   


                    /*** PRIVATE METHODS ***/                    

                    // Cancel promised interval
                    function stopInterval () {
                        $interval.cancel(intervalProm);                        
                    }

                    // Return back to graphs view
                    function navigateToGraphs () {
                        // scope.isEdit = false;
                        $('.modal').modal('hide');

                        window.location.href = window.location.origin + '/#/';
                        window.location.reload();
                    }

                    // Set starting point for sliders
                    function initializeSliders () {
                        $('.'+'sla-slider').css('margin-left', scope.thresholdSLA - 50);
                        $('.'+'thresh-slider').css('margin-left', scope.thresholdTime);
                    }                     


                    /*** INITIALIZE ***/

                    initializeSliders();                    
                }
            } 

        });
});
