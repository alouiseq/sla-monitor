define(['angular'], function (angular) {

    'use strict';

    /**
     * Graphite Service contains settings specific to this data source
     */

    angular.module('services.GraphiteService', [])
        .factory('GraphiteService', [ '$http', 'urls', '$q', function ($http, urls, $q) {

            /*** DEFAULTS ***/

            var dataSource = 'Graphite',
                isMock = false,
                activeMonitors = {
                    data: {
                        external_monitors: [
                            {
                                id: 1,
                                monitor_id: 'blahblahblah',
                                name: 'sfly.prod.pool.slam.poller_worker.sample1',
                                active: true,
                                interval: 60000,
                                location: 'graphite',
                                threshold: 10000,
                                sla: 98,
                                description: 'This is just mock data'
                            },
                            {
                                id: 2,
                                monitor_id: 'blahblahblah2',
                                name: 'sfly.prod.pool.slam.poller_worker.sample2',
                                active: true,
                                interval: 60000,
                                location: 'graphite',
                                threshold: 10000,
                                sla: 98,
                                description: 'This is just mock data2'
                            }
                        ]
                    }
                };


            /*** PRIVATE METHODS ***/            


            // Public Methods

            return {                             
                getAllMonitors: function () {
                    return $http({
                        url: urls.baseUrl + '/api/v1/external/monitor',
                        method: 'GET'
                    }).then(
                        function (response) {                        
                            return response;
                        }
                    )
                },
                getActiveMonitors: function () {
                    if (isMock) {
                        var deferred = $q.defer();
                        deferred.resolve(activeMonitors);
                        return deferred.promise;

                    } else {
                        return $http({
                            // url: 'http://10.86.67.8:8080' + '/api/v1/external/monitor?filter=active',
                            url: urls.baseUrl + '/api/v1/external/monitor?filter=active',
                            method: 'GET'
                        }).then(
                            function (response) {                        
                                return response;
                            }
                        )
                    }
                },
                saveView: function (monitors) {
                    localStorage.setItem('userGraphiteMonitors', JSON.stringify(monitors));
                    if (localStorage.getItem('userGraphiteMonitors')) {
                        return 'saved';
                    } else {
                        return 'failed';
                    }
                },
                addMonitor: function (monitor) {
                    return $http({
                        url: urls.baseUrl + '/api/v1/self-service',
                        data: monitor,
                        method: 'POST'
                    }).then(
                        function (response) {                        
                            return response;
                        }
                    )
                }
            };
        }]);
});