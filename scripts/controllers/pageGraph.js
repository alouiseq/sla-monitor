define(['angular'], function (angular) {
    'use strict';

    /**
     * @ngdoc function
     * @name slamApp.controller:PageGraphCtrl
     * @description Groups all monitors and controls the number of graphs displayed on a view
     * # PageGraphCtrl
     * Controller of the slamApp
     */
    angular.module('controllers.PageGraphCtrl', [])
        .controller('PageGraphCtrl', function ($scope, $routeParams, $timeout, ClientService, ConfigService, response) {

            /*** DEFAULTS ***/
            
            $scope.rowContainers = [];      // holds each row's graph set
            $scope.rowBrandCount = [];      // holds each row's graph set
            $scope.rowsReadyState = 0;      // holds number of rows with at least one data


            /*** PRIVATE METHODS ***/

            // Prepare monitors to be grouped and displayed on the page
            function getMonitors () {
                var monitorRegEx = /SLAM_(\w+)_(\w+)/;
                var brand = $routeParams.brand;
                var monitors;

                // Get all active SLAM monitors or specific monitors based on brand                     
                if (!ConfigService.getMock()) {                                    
                    if (brand) {
                        $scope.viewOneBrand = true;          // check if only a single brand is monitored
                        brand = brand.toLowerCase();

                        // Specify view based on brands
                        monitors = response.data.monitors.filter(function (mon) {
                            if (brand === monitorRegEx.exec(mon.name)[1].toLowerCase()) {
                                return mon;
                            }
                        });

                        // Add easy to read monitor name that can be configured by the user
                        // monitors = monitors.map(function (mon, index) {
                        //     mon.editableName = mon.name;
                        // });

                        if (monitors.length <= 0) {
                            monitors = response.data.monitors;
                            $scope.viewOneBrand = false;
                        }   
                    } else {
                        $scope.viewOneBrand = false;

                        // // Check for user customization on graph placement
                        // if ($scope.graphRows >= 1) {
                        //     var count = 0;

                        // } else {
                            monitors = response.data.monitors;
                        // }
                    }                                                           
                } else {    // mock data
                    monitors = _.filter(response.data.monitors, function (mon, index) {
                        if (mon.monitor_id === '5a1c2ab6588c11e592489848e1660ab3' || mon.monitor_id === '555272e66bb611e58f4a002655ec6e4f' || mon.monitor_id === 'a14f118a6bbc11e5bbb8002655ec6e4f' || mon.monitor_id === '21e85880588d11e5b2309848e1660ab3' || mon.monitor_id === '23f5556e6bb711e585b3002655ec6e4f') {
                            return mon;
                        }
                    });
                }

                // Initial data: SFLY should be the first array element if it exists
                var sflyIndex = _.indexOf(monitors, _.findWhere(monitors, {monitor_id: '5a1c2ab6588c11e592489848e1660ab3'}));
                if (sflyIndex > -1) {
                    monitors.unshift((monitors.splice(sflyIndex, 1))[0]);
                }

                // Store based on user preference
                if ($scope.graphRows > 1) {
                    groupMonitors(monitors);
                } else {
                    $scope.rowContainers.push(monitors);
                }

                // $scope.$broadcast('get-monitors', monitors, viewOne);                            
            }

            // Group monitors to be displayed on each page transition based on user preferences
            function groupMonitors (monitors) {
                var hash = {
                    'brandKeys': {}
                };
                var updatedMons = [];
                var monitorRegEx = /SLAM_(\w+)_(\w+)/;
                var count = 0;
                var row;
                var prevBrand = null;
                var emptyIter = 0;

                // Prepare containers
                while (count++ < $scope.graphRows) {
                    $scope.rowContainers.push([]);
                    $scope.rowBrandCount.push(0);
                }

                // Store monitors and their metadata in hash table to group metrics based on brand
                monitors.forEach(function (mon) {
                    var monitorName = mon.name;
                    var brand = (monitorRegEx.exec(monitorName)[1]).toUpperCase();
                                        
                    if (monitorRegEx.exec(monitorName)) {
                        var brand = (monitorRegEx.exec(monitorName)[1]).toUpperCase();
                        mon.brand = brand;

                        // Insert into hash table
                        if (hash[brand]) {
                            hash[brand].push(mon);
                            hash['brandKeys'][brand]++;
                        } else {
                            hash[brand] = [mon];
                            hash['brandKeys'][brand] = 0;
                        }
                    }                                       
                }); 

                // Store grouped monitors into an array
                for (var mon in hash) {
                    if (mon !== 'brandKeys') {
                        updatedMons = updatedMons.concat(hash[mon]);
                    }

                }

                // Use user selected rows and number of monitors to calculate the amount necessary to ensure proper display of graphs
                var brandInHash;
                for (var brand in hash['brandKeys']) {
                    brandInHash = hash['brandKeys'][brand];
                    if (brandInHash <= $scope.graphRows) {
                        hash['brandKeys'][brand] = $scope.graphRows;
                    } else {    // brandInHash > user rows
                        if (brandInHash > (hash['brandKeys'][brand] = $scope.graphRows * 2)) {
                            hash['brandKeys'][brand] = $scope.graphRows * 3;
                        }
                    }
                }                
                
                count = 0;
                row = 0;
                emptyIter = 0;
                prevBrand = updatedMons[count].brand;

                // This will generate the list of monitors to be displayed on the page along with the specified rows

                // BRAND group logic not yet implemented!
                if ($scope.graphGroupBy === 'brand') {
                    for (var monKey in hash) {
                        $scope.rowContainers[brandCount] = $scope.rowContainers[brandCount].concat(hash[monKey]);
                        brandCount++;

                        if (brandCount >= $scope.graphRows) {
                            brandCount = 0;
                        }    
                    }     
                } else {        // groupBy: metric
                    while (count < updatedMons.length) {                        
                        if (row >= $scope.graphRows) {
                            row = 0;
                            prevBrand = updatedMons[count].brand;
                        } 

                        if (prevBrand === updatedMons[count].brand) {
                            $scope.rowContainers[row].push(updatedMons[count++]);
                            $scope.rowBrandCount[row] = $scope.rowBrandCount[row] + 1;
                        
                            // controls load time graph view - iterates over each data
                            if (row === 1) {
                                emptyIter++;
                            } 
                        } else {
                            $scope.rowContainers[row].push({});

                            // controls load time graph view -
                            // allow in row0 view if rows > 0 have empty missing monitor transition                          
                            if (row === 1) {
                                $scope.rowContainers[0][emptyIter++].allowLoadTimeGraph = true;
                            }                         
                        }

                        row++;
                    }

                    // Fill in remaining unused rows with {}
                    while (row < $scope.graphRows) {
                        if (row === 1) {
                            $scope.rowContainers[0][emptyIter++].allowLoadTimeGraph = true;
                        } 
                        $scope.rowContainers[row++].push({});                        
                    }

                    rowDataAccumulator();                    
                }     
            }

            // Transition logic only applicable to rows with data
            function rowDataAccumulator () {
                $scope.rowBrandCount.forEach(function (elem) {
                    if (elem > 0) {
                        $scope.rowsReadyState++;
                    }
                });
            }


            /*** LISTENERS ***/

            // Check if all rows are ready for the next transition
            $scope.$on('isReady', function (e, index) {
                if (--$scope.rowsReadyState <= 0) {
                    rowDataAccumulator();
                    // Apply delay to ensure functions have returned
                    $timeout(function () {
                        $scope.$broadcast('nowReady');
                    });                    
                }
            });


            /*** INITIALIZE ***/
            
            // Get graph display and placement options
            $scope.graphRows = ConfigService.getGraphRows();            
            $scope.graphGroupBy = ConfigService.getGroupBy(); 

            // Get monitors from service
            getMonitors();           

            // Get all views and their helper data
            $scope.viewHelpers = ConfigService.getViewHelpers();

            // Get all brands data
            $scope.brandsData = ClientService.getBrands();
            
        });
});
