define(['angular'], function (angular) {
    'use strict';

    /**
     * @ngdoc function
     * @name slamApp.directive:selfService
     * @description Contains configurable user settings cached in local browser - Clear browser cache to reset
     * # selfService
     * Directive of the slamApp
     */
    angular.module('directives.selfService', [])
        .directive('selfService', function (ClientService, ConfigService, urls, $interval, $timeout) {
         
            return {
                restrict: 'EA',
                templateUrl: 'views/selfService.html',
                scope: {

                },
                link: function (scope, element) {

                    /*** DEFAULTS ***/

                    // Configuration options
                    scope.activateAnime = ConfigService.getAnimation();
                    scope.animationControls = ConfigService.getAnimateControls();
                    scope.themeColor = ConfigService.getTheme();
                    scope.themeOptions = ConfigService.getThemes();
                    scope.isMock = ConfigService.getMock();
                    scope.socketReady = ConfigService.getSocketReady();
                    scope.timer = ConfigService.getTransitionDelay() / 1000;   // mil to sec
                    scope.timerOptions = ConfigService.getTimers();
                    scope.graphRows = ConfigService.getGraphRows();
                    scope.graphRowsOps = ConfigService.getGraphRowsOptions();
                    scope.groupBy = ConfigService.getGroupBy(); 
                    scope.groups = ConfigService.getGroups();
                    scope.calcsLoc = ConfigService.getCalcsLoc();  
                    scope.calcsLocOptions = ConfigService.getCalcsLocOptions();
                    
                    // Client options                    
                    scope.thresholdTime = ClientService.getThresholdTime() / 1000; // mil to sec
                    scope.thresholdSLA = ClientService.getThresholdSLA();
                    scope.threshSaved = true;
                    scope.slaSaved = true;
                    var originalThreshold = scope.thresholdTime; // mil to sec
                    var originalSLA = scope.thresholdSLA;

                    // Data Sources
                    scope.dataSources = ClientService.getDataSources();
                    scope.dataSource = ClientService.getDataSource();                    

                    // Get current brand and metric names
                    scope.brandNames = ClientService.getAllBrandNames();
                    scope.metricNames = ClientService.getAllMetricNames();
                    scope.showBrands = true;
                    scope.showMetrics = true;

                    // Other defaults
                    scope.wip = true;
                    scope.btnIndex = 0;     // side panel selection default 
                    var intervalProm;           


                    /*** PUBLIC METHODS ***/                                                                       
                                                        
                    // Reload SLA graphs
                    scope.goToGraphs = function () {
                        navigateToGraphs();
                    };                    

                    // Toggle between selected button on the side config panel
                    scope.switchActive = function (index) {
                        scope.btnIndex = index;
                    }

                    /*** Settings ***/

                    // Set the Data Source
                    scope.setDataSource = function () {
                        ClientService.setDataSource(scope.dataSource.name);
                        scope.$broadcast('dataSourceChanged', scope.dataSource);
                    };

                    // Set starting point for sliders
                    function initializeSliders () {
                        $('.'+'timer-slider').css('margin-left', scope.timer);
                        $('.'+'sla-slider').css('margin-left', scope.thresholdSLA - 50);
                        $('.'+'thresh-slider').css('margin-left', scope.thresholdTime);
                    }
                    
                    // Select theme color
                    scope.toggleThemeColor = function () {
                        scope.themeColor = scope.themeColor === 'light' ? 'dark' : 'light';
                        ConfigService.setTheme(scope.themeColor);
                    }; 

                    // Toggle between client and server calculation algorithm source
                    scope.toggleCalcsSource = function () {
                        scope.calcsLoc = scope.calcsLoc === 'client' ? 'server' : 'client';
                        ConfigService.setCalcsLocation(scope.calcsLoc);
                    };          

                    // Toggle animation transition between on and off 
                    scope.toggleTransition = function () {
                        scope.activateAnime = !scope.activateAnime;
                        ConfigService.setAnimation(scope.activateAnime);
                    }         
                   
                    // Set transition timer via horizontal sliders
                    scope.sliderTimer = (function () {                        
                        var typeClass = 'timer-slider';
                        var xOffset;
                        var interval = 100;
                        var increment;

                        return function (dir) {
                            function processing () {
                                increment = dir === 'up' ? 5 : -5;
                                xOffset = scope.timer + increment;                                                                    
                                scope.timer = xOffset;

                                // Respect lower and upper boundaries
                                if (scope.timer < 0) {
                                    xOffset += increment + 10;
                                    scope.timer = 0;
                                } else if (scope.timer > scope.timerOptions[0]) {
                                    xOffset +=  increment - 10;
                                    scope.timer = scope.timerOptions[0];
                                }                               

                                $('.'+typeClass).css('margin-left', xOffset);                                
                            }

                            // first increase should always be allowed
                            processing();
                            // ConfigService.setTransitionDelay(scope.timer * 1000);

                            // Set interval for any subsequent increase via mousedown
                            intervalProm = $interval(processing, interval);
                        };
                    })();

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

                    // Set selected animation timer
                    scope.setTimer = function () {
                        stopInterval();
                        ConfigService.setTransitionDelay(scope.timer * 1000);
                    }

                    // Set Threshold Delay
                    scope.setThresholdDelay = function () {
                        stopInterval();
                        // ClientService.setThresholdTime(scope.thresholdTime * 1000);

                        // Send threshold value to db                       
                        var data = {
                            'global_threshold': parseInt(scope.thresholdTime) * 1000
                        }

                        ClientService.postThresholdAndSLA(data).then(
                            function (response) {
                                scope.threshSaved = true;
                            },
                            function (error) {
                                console.log('Failed to save threshold, try again later!');
                                scope.threshSaved = false;
                                scope.thresholdTime = originalThreshold;                                
                                $('.'+'thresh-slider').css('margin-left', scope.thresholdTime);
                            }
                        );
                    };

                    // Set SLA
                    scope.setSLA = function () {
                        stopInterval();
                        // ClientService.setThresholdSLA(scope.thresholdSLA);

                        // Send SLA value to db                       
                        var data = {
                            'global_sla': parseInt(scope.thresholdSLA)
                        }

                        ClientService.postThresholdAndSLA(data).then(
                            function (response) {
                                scope.slaSaved = true;
                            },
                            function (error) {
                                console.log('Failed to save SLA, try again later!');
                                scope.slaSaved = false;
                                scope.thresholdSLA = originalSLA;
                                $('.'+'sla-slider').css('margin-left', scope.thresholdSLA - 50);
                            }
                        );
                    };  

                    /*** Editable Names ***/                    

                    // Watch for any changes in brand names
                    var brandsPromise;
                    scope.$watch('brandNames', function (newBrands, oldBrands) {
                        if (newBrands !== oldBrands) {
                            $timeout.cancel(brandsPromise);
                            brandsPromise = $timeout(function () {
                                ClientService.setAllBrandNames(newBrands);
                            }, 1000);
                        }
                    }, true);   

                    // Watch for any changes in brand names
                    var metricsPromise;
                    scope.$watch('metricNames', function (newMetrics, oldMetrics) {
                        if (newMetrics !== oldMetrics) {
                            $timeout.cancel(metricsPromise);
                            metricsPromise = $timeout(function () {
                                ClientService.setAllMetricNames(newMetrics);
                            }, 1000);
                        }
                    }, true);                  

                    /*** Graph Rows ***/

                    // Set number of SLA graph rows
                    scope.setGraphRows = function (index) {
                        var actualRow = index + 1;
                        $('.graph-row').removeClass('checked');
                        $('.graph-row#' + index).addClass('checked');
                        ConfigService.setGraphRows(actualRow);
                    };

                    // // Set SLA graph group by
                    // scope.setGroupBy = function () {                                                
                    //     ConfigService.setGroupBy(scope.groupBy);
                    // }                                                                                  
                    
                    
                    /*** PRIVATE METHODS ***/                    

                    // Cancel promised interval
                    var stopInterval = function () {
                        $interval.cancel(intervalProm);                        
                    }

                    // Return back to graphs view
                    function navigateToGraphs () {
                        // scope.isEdit = false;
                        $('.modal').modal('hide');

                        window.location.href = window.location.origin + '/#/';
                        window.location.reload();
                    }

                    // timeout needed to run code after view renders
                    function initGraphRowSelection() {
                        $timeout(function () {
                            var domIndex = scope.graphRows-1;
                            $('.graph-row#' + domIndex).addClass('checked');
                            $('.graph-row#' + domIndex).find('input').attr('checked', true);
                        });
                    }


                    /*** INITIALIZE ***/

                    initializeSliders();                    
                    initGraphRowSelection();                    
                }
            } 

        });
});
