define(['angular'], function (angular) {
    'use strict';

    /**
     * @ngdoc function
     * @name slamApp.directive:graphiteModule
     * @description Graphite module that controls which monitors to view and also add additional ones
     * # graphiteModule
     * Directive of the slamApp
     */
    angular.module('directives.graphiteModule', [])
        .directive('graphiteModule', function (ClientService, GraphiteService, $interval, $timeout) {
         
            return {
                restrict: 'EA',
                templateUrl: 'views/graphiteModule.html',
                scope: {},
                link: function (scope, element) {

                    /*** DEFAULTS ***/                    

                    var defaultSelected = true;
                    scope.dataSource = ClientService.getDataSource();
                    scope.activeMonitors = []; 
                    scope.noActiveMons = false;
                    scope.showAddMonForm = false;
                    scope.monitorAdded = false;
                    scope.triedToAddMon = false;
                    scope.savedView = '';
                    scope.newMonitor = {
                        active: true,
                        name: '',
                        description: '',
                        threshold: 0,
                        sla: 100
                    };

                    // Client options                    
                    scope.threshSaved = true;
                    scope.slaSaved = true;
                    var originalThreshold = scope.newMonitor.threshold; // mil to sec
                    var originalSLA = scope.newMonitor.sla; 
                    var intervalProm;                  
                    

                    /*** PUBLIC METHODS ***/                                                                       
                    
                    // Set SLA via horizontal sliders
                    scope.sliderSLA = (function () {                        
                        var typeClass = 'sla-slider';
                        var xOffset;
                        var interval = 100;
                        var increment;

                        return function (dir) {
                            function processing () {
                                increment = dir === 'up' ? 1 : -1;
                                xOffset = scope.newMonitor.sla - 50 + increment;                                                                    
                                scope.newMonitor.sla += increment;                                

                                // Respect boundaries
                                if (scope.newMonitor.sla < 50) {
                                    xOffset += increment + 2;
                                    scope.newMonitor.sla = 50;
                                } else if (scope.newMonitor.sla > 100) {
                                    xOffset +=  increment - 2;
                                    scope.newMonitor.sla = 100;
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
                                xOffset = scope.newMonitor.threshold + increment;                                                                    
                                scope.newMonitor.threshold = xOffset;                                

                                // Respect boundaries
                                if (scope.newMonitor.threshold < 0) {
                                    xOffset += increment + 2;
                                    scope.newMonitor.threshold = 0;
                                } else if (scope.newMonitor.threshold > 50) {
                                    xOffset +=  increment - 2;
                                    scope.newMonitor.threshold = 50;
                                }                               

                                $('.'+typeClass).css('margin-left', xOffset);                                
                            }

                            // first increase should always be allowed
                            processing();
                            // Set interval for any subsequent increase via mousedown
                            intervalProm = $interval(processing, interval);
                        };
                    })();                                                                             

                    // Toggle the add monitor form
                    scope.addMonitorView = function () {
                        // resetView();
                        scope.triedToAddMon = false;
                        scope.toggleAddView();
                        // initializeSliders();
                    };

                    // Toggle the add monitor form
                    scope.toggleAddView = function () {
                        scope.showAddMonForm = !scope.showAddMonForm;
                    };                     

                    // Save viewable monitors locally
                    scope.saveMonitorsView = function () {
                        var selectedMonitors = [],
                            i = scope.activeMonitors.length;

                        // Filter only user selected monitors
                        while(i--) {
                            if (scope.activeMonitors[i].selected) {
                                selectedMonitors.push(scope.activeMonitors[i]);
                            }
                        }

                        // Only save view with at leat one monitor
                        if (selectedMonitors.length > 0) {
                            scope.savedView = GraphiteService.saveView(selectedMonitors);
                        }
                    };    

                    // Add monitor to the db
                    scope.addMonitor = function () {
                        scope.triedToAddMon = true;                        
                        GraphiteService.addMonitor(scope.newMonitor).then(
                            function (response) {
                                // adds to active monitors array to be added to view
                                // var newMon = angular.copy(scope.newMonitor);
                                // addSelectedField([newMon]); 
                                // scope.activeMonitors.push(newMon);
                                getMonitors();                            
                                scope.toggleAddView();
                                resetView();
                                scope.monitorAdded = true;
                            },
                            function (erorr) {
                                scope.monitorAdded = false;
                            }
                        )
                    };

                    // Cancel promised interval
                    scope.stopInterval = function () {
                        $interval.cancel(intervalProm);                        
                    }                                                                                                                                                            
                    
                    
                    /*** PRIVATE METHODS ***/

                    // Get list of monitors available
                    function getMonitors () {
                        GraphiteService.getActiveMonitors().then(
                            function (response) {                               
                                scope.activeMonitors = response.data.external_monitors;
                                addSelectedField(scope.activeMonitors);
                            },
                            function () {
                                scope.noActiveMons = true;
                            }
                        );
                    } 

                    // Add selected field to each monitor for easier processing
                    function addSelectedField (monitors) {
                        var max = monitors.length;
                        for (var i=0; i<max; i++) {
                            monitors[i].selected = defaultSelected;
                        }
                    }                    

                    // Set starting point for sliders
                    function initializeSliders () {
                        // Ensures the view is rendered before executing the code
                        $timeout(function () {
                            $('.'+'sla-slider').css('margin-left', scope.newMonitor.sla - 50);
                            $('.'+'thresh-slider').css('margin-left', scope.newMonitor.threshold);
                        });
                    }                     

                    // Resets all fields in the Add Monitor view
                    function resetView () {
                        scope.monitorAdded = false;
                        scope.triedToAddMon = false;
                        scope.newMonitor = {
                            active: true,
                            name: '',
                            description: '',
                            threshold: 0,
                            sla: 100
                        };
                        initializeSliders();
                    };                                    
                   

                    /*** LISTENERS ***/
                    scope.$on('dataSourceChanged', function (e, ds) {
                        scope.dataSource = ds;
                    });


                    /*** INITIALIZE ***/

                    // Convert strings to lowercase
                    if (typeof(scope.dataSource) === 'string') {
                        scope.dataSource = scope.dataSource.toLowerCase();
                    }

                    getMonitors();
                    initializeSliders();                    
                }
            } 

        });
});
