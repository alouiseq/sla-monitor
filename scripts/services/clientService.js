define(['angular'], function (angular) {

    'use strict';

    /**
     * Client Service that specifies data source, thresholds, SLAs, and data requests to a SLAM REST API
     */

     angular.module('services.ClientService', [])
        .factory('ClientService', ['$http', '$q', '$timeout', 'urls', function ($http, $q, $timeout, urls) {
            
            var dataSource;
            var dataSources = [
                {
                    name: 'Neustar',
                    monitorURL: '/api/v1/neustar/monitor?filter=slam',
                    rawdataURL: '/api/v1/neustar/sample?monitorID=',
                    dataURL: '/api/v1/results?monitorID='
                },
                {
                    name: 'Graphite',
                    monitorURL: '',
                    rawdataURL: '',
                    dataURL: ''
                }
            ];
            var dsIndex;
            var thresholdTime = 15000;     
            var thresholdSLA = 90;
            var multiLocalePassed = 80;
            var brands = {
                'SFLY': false,
                'TP': false, 
                'TL': false, 
                'WPD': false, 
                'MYPUB': false, 
                'BL': false, 
                'Mobile': false, 
                'SBS': false
            };
            var appMetrics = {
                'Home': true, 
                'Login': true,
                'Signup': true,
                'C&S': true,  
                'Checkout': true, 
                'Photobooks': true, 
                'Uploads': true
            };

            var editableBrandNames = [
                {
                    brand: 'sfly',
                    name: 'Shuttefly'
                },
                {
                    brand: 'tp',
                    name: 'TinyPrints'
                },
                {
                    brand: 'tl',
                    name: 'ThisLife'
                },
                {
                    brand: 'wpd',
                    name: 'Wedding Paper Divas'
                },
                {
                    brand: 'mypub',
                    name: 'MyPublisher'
                },
                {
                    brand: 'bl',
                    name: 'BorrowLenses'
                },
                {
                    brand: 'mobile',
                    name: 'Mobile'
                },
                {
                    brand: 'sbs',
                    name: 'SBS'
                }
            ];

            var editableMetricNames = [
                {
                    metric: 'home',
                    name: 'Home Page'
                },
                {
                    metric: 'homepage',
                    name: 'Home Page'
                },
                {
                    metric: 'login',
                    name: 'Login Page'
                },
                {
                    metric: 'signup',
                    name: 'Signup Page'
                },
                {
                    metric: 'c&s',
                    name: 'C&S Page'
                },
                {
                    metric: 'checkout',
                    name: 'Checkout Page'
                },
                {
                    metric: 'photobooks',
                    name: 'Photobooks Page'
                },
                {
                    metric: 'uploads',
                    name: 'Uploads Page'
                }
            ]            


            /*** PRIVATE METHODS ***/

            // Retrieve threshold and sla values from the API and set locally
            function setThresholdAndSLA () {
                return $http({
                    url: urls.baseUrl + '/api/v1/admin/application/settings',
                    method: 'GET'
                }).then(
                    function (response) {
                        thresholdTime = response.data.global_threshold;
                        thresholdSLA = response.data.global_sla;
                        return response;
                    }
                )
            }

            // Get index of dataSource in dataSources
            function _getIndex(name) { 
                var index;
                var foundDS = dataSources.find(function(elem) {
                    return elem.name === name;
                });
                if (foundDS) {
                    index = dataSources.indexOf(foundDS);
                } 
                return index;
            }  


            /*** INITIALIZE ***/

            setThresholdAndSLA();
            dsIndex = _getIndex(localStorage.getItem('dataSource') || 'Neustar');
            dataSource = dataSources[dsIndex];


            /*** PUBLIC METHODS ***/

            return {
                postThresholdAndSLA: function (data) {
                    // send to db
                    return $http({
                        url: urls.baseUrl + '/api/v1/admin/application/settings',
                        method: 'POST',
                        data: data
                    }).then(
                        function (response) {
                            setThresholdAndSLA().then(
                                function (data) {
                                    return data;
                                }
                            )                                                        
                        }
                    );
                },
                getBrandName: function (key) {
                    var foundBrand = null,
                        allBrands = JSON.parse(localStorage.getItem('brandNames'));

                    if (Array.isArray(allBrands)) {
                        foundBrand = allBrands.find(function (brand) {
                            return brand.brand === key;
                        });
                    }
                    if (foundBrand) {
                        return foundBrand.name;
                    } else {    // return default brand names if not locally stored
                        return (editableBrandNames.find(function (brand) {
                            if (brand.brand === key) {
                                return brand;
                            }
                        })).name;
                    }
                },
                // setBrandName: function (key, brandName) {
                //     // editableBrandNames[key] = brandName;
                //     localStorage.setItem(key, brandName);
                // },
                getMetricName: function (key) {
                    var foundMetric = null,
                        allMetrics = JSON.parse(localStorage.getItem('metricNames'));

                    if (Array.isArray(allMetrics)) {
                        foundMetric = allMetrics.find(function (metric) {
                            return metric.metric === key;
                        });
                    }
                    if (foundMetric) {
                        return foundMetric.name;
                    } else {    // return default brand names if not locally stored
                        return (editableMetricNames.find(function (metric) {
                            if (metric.metric === key) {
                                return metric.name;
                            }
                        })).name;
                    }
                },
                // setMetricName: function (key, metricName) {
                //     // editableMetricNames[key] = metricName;
                //     localStorage.setItem(key, metricName);
                // }, 
                getAllBrandNames: function () {
                    return JSON.parse(localStorage.getItem('brandNames')) || editableBrandNames;
                },
                setAllBrandNames: function (brandsData) {
                    // editableBrandNames = brandsData;
                    localStorage.setItem('brandNames', JSON.stringify(brandsData));                    
                },
                getAllMetricNames: function () {
                    return JSON.parse(localStorage.getItem('metricNames')) || editableMetricNames;
                },
                setAllMetricNames: function (metricsData) {
                    // editableMetricNames = metricsData;
                    localStorage.setItem('metricNames', JSON.stringify(metricsData));                    
                },        
                getThresholdTime: function () {
                    return thresholdTime;
                },
                // setThresholdTime: function (limit) {
                //     thresholdTime = parseInt(limit);
                //     localStorage.setItem('threshold', thresholdTime);
                // },
                getThresholdSLA: function () {
                    return thresholdSLA;
                },
                // setThresholdSLA: function (sla) {
                //     thresholdSLA = parseFloat(sla);
                //     localStorage.setItem('sla', thresholdSLA);
                // },                
                getDataSource: function () {
                    return dataSources[dsIndex] || dataSource;

                },
                setDataSource: function (ds) {
                    localStorage.setItem('dataSource', ds);
                    dsIndex = _getIndex(ds);
                    dataSource = dataSources[dsIndex];                
                },
                getDataSources: function () {
                    return dataSources;
                },                
                getBrands: function () {
                    return angular.copy(brands);
                },
                getAppMetrics: function () {
                    return angular.copy(appMetrics);
                },
                getMonitors: function (mock) {
                    if (!mock) {
                        return $http({
                            url: urls.baseUrl + dataSources[dsIndex].monitorURL,
                            // url: urls.baseUrl + '/api/v1/neustar/monitor?filter=slam',
                            // url: urls.baseUrl + '/api/v1/neustar/monitor',
                            method: 'GET'
                        }).then(
                            function (data) {
                                return data;
                            }
                        );
                    } else {
                        var deferred = $q.defer();
                        var response = {
                            data: {"monitors":[
                                {"id":1,"active":false,"AlertPolicyID":"","AlertPolicyName":"","Browser":"FF","Description":"","DNSLookupType":"","DNSAuthoritative":false,"DNSHostname":"","DNSServer":"","DNSExpectedIPs":"","monitor_id":"0a6f9a4e6be611e5bf6b002655ec6e4f","InMaintenanceWindow":false,"Interval":1,"LastSampleAt":"0001-01-01T00:00:00Z","Locations":"miami","name":"SLAM_test_2","PingTimeout":0,"PingHost":"","PopTimeout":0,"PopServer":"","PopUsername":"","PopPassword":"","PortTimeout":0,"PortServer":"","PortPort":0,"PortProtocol":"","PortCommand":"","PortExpectedResponse":"","ScriptID":"ab46641511e44bd697a9abac70b9e303","ScriptName":"Check images.weddingpaperdivas.com","ScriptVersion":"pdBKx2QBllTvx63iIoM.0D8kD42fiUAy","SLASettingsLoadTime":30,"SLASettingsRunningAvgDuration":0,"SLASettingsUptime":100,"SMTPTimeout":0,"SMTPServer":"","SMTPEmail":"","Type":"RealBrowserUser"},
                                {"id":2,"Active":true,"AlertPolicyID":"","AlertPolicyName":"","Browser":"FF","Description":"Shutterfly Login","DNSLookupType":"","DNSAuthoritative":false,"DNSHostname":"","DNSServer":"","DNSExpectedIPs":"","monitor_id":"21e85880588d11e5b2309848e1660ab3","InMaintenanceWindow":false,"Interval":1,"LastSampleAt":"2015-10-06T06:06:52Z","Locations":"losangeles,washingtondc,chicago,sanfrancisco,akron","name":"SLAM_SFLY_Login","PingTimeout":0,"PingHost":"","PopTimeout":0,"PopServer":"","PopUsername":"","PopPassword":"","PortTimeout":0,"PortServer":"","PortPort":0,"PortProtocol":"","PortCommand":"","PortExpectedResponse":"","ScriptID":"7a1119e738f649bebe7bc85ec9fc652e","ScriptName":"sfly-login","ScriptVersion":"Mjm_lKk720EUbidddTMmkx.cfT7RiGw.","SLASettingsLoadTime":0,"SLASettingsRunningAvgDuration":0,"SLASettingsUptime":0,"SMTPTimeout":0,"SMTPServer":"","SMTPEmail":"","Type":"RealBrowserUser"},
                                {"id":3,"Active":true,"AlertPolicyID":"","AlertPolicyName":"","Browser":"FF","Description":"SLAM Check for WPD Home","DNSLookupType":"","DNSAuthoritative":false,"DNSHostname":"","DNSServer":"","DNSExpectedIPs":"","monitor_id":"23f5556e6bb711e585b3002655ec6e4f","InMaintenanceWindow":false,"Interval":1,"LastSampleAt":"2015-10-06T06:06:49Z","Locations":"newyork,sanfrancisco","name":"SLAM_WPD_Home","PingTimeout":0,"PingHost":"","PopTimeout":0,"PopServer":"","PopUsername":"","PopPassword":"","PortTimeout":0,"PortServer":"","PortPort":0,"PortProtocol":"","PortCommand":"","PortExpectedResponse":"","ScriptID":"a962d20abd0442aeb32409e8d8bc5db0","ScriptName":"SLAM_WPD_Home","ScriptVersion":"URp0MCxQ1FxBN.G799RV2cdJ3gQa8r9h","SLASettingsLoadTime":30,"SLASettingsRunningAvgDuration":0,"SLASettingsUptime":100,"SMTPTimeout":0,"SMTPServer":"","SMTPEmail":"","Type":"RealBrowserUser"},
                                {"id":4,"Active":true,"AlertPolicyID":"","AlertPolicyName":"","Browser":"FF","Description":"SLAM Check for BL Home","DNSLookupType":"","DNSAuthoritative":false,"DNSHostname":"","DNSServer":"","DNSExpectedIPs":"","monitor_id":"30d502d86bb811e59c64002655ec6e4f","InMaintenanceWindow":false,"Interval":1,"LastSampleAt":"2015-10-06T06:06:49Z","Locations":"newyork,sanfrancisco","name":"SLAM_BL_Home","PingTimeout":0,"PingHost":"","PopTimeout":0,"PopServer":"","PopUsername":"","PopPassword":"","PortTimeout":0,"PortServer":"","PortPort":0,"PortProtocol":"","PortCommand":"","PortExpectedResponse":"","ScriptID":"d98089ce5b1f42dda1595a08ea190d09","ScriptName":"SLAM_BL_Home","ScriptVersion":"nDlu7zjdPYYVAceIVfi5K2lGHvXOAKmn","SLASettingsLoadTime":30,"SLASettingsRunningAvgDuration":0,"SLASettingsUptime":100,"SMTPTimeout":0,"SMTPServer":"","SMTPEmail":"","Type":"RealBrowserUser"},
                                {"id":5,"Active":true,"AlertPolicyID":"","AlertPolicyName":"","Browser":"FF","Description":"SLAM Check for TP Home","DNSLookupType":"","DNSAuthoritative":false,"DNSHostname":"","DNSServer":"","DNSExpectedIPs":"","monitor_id":"555272e66bb611e58f4a002655ec6e4f","InMaintenanceWindow":false,"Interval":1,"LastSampleAt":"2015-10-06T06:06:49Z","Locations":"newyork,sanfrancisco","name":"SLAM_TP_Home","PingTimeout":0,"PingHost":"","PopTimeout":0,"PopServer":"","PopUsername":"","PopPassword":"","PortTimeout":0,"PortServer":"","PortPort":0,"PortProtocol":"","PortCommand":"","PortExpectedResponse":"","ScriptID":"172dd9926f7943dc85ea615c4ef83b4e","ScriptName":"SLAM_TP_Home","ScriptVersion":"aBIGDTZlf12lXXlnh1hFNFsTfNEgo0GV","SLASettingsLoadTime":30,"SLASettingsRunningAvgDuration":0,"SLASettingsUptime":100,"SMTPTimeout":0,"SMTPServer":"","SMTPEmail":"","Type":"RealBrowserUser"},
                                {"id":6,"Active":true,"AlertPolicyID":"","AlertPolicyName":"","Browser":"FF","Description":"Shutterfly Home","DNSLookupType":"","DNSAuthoritative":false,"DNSHostname":"","DNSServer":"","DNSExpectedIPs":"","monitor_id":"5a1c2ab6588c11e592489848e1660ab3","InMaintenanceWindow":false,"Interval":1,"LastSampleAt":"2015-10-06T06:06:50Z","Locations":"losangeles,washingtondc,chicago,sanfrancisco,akron","name":"SLAM_SFLY_Home","PingTimeout":0,"PingHost":"","PopTimeout":0,"PopServer":"","PopUsername":"","PopPassword":"","PortTimeout":0,"PortServer":"","PortPort":0,"PortProtocol":"","PortCommand":"","PortExpectedResponse":"","ScriptID":"1b77f1a303dd4dd18e0bfd02086e7f1c","ScriptName":"sfly-home","ScriptVersion":"c3eBAEuiRPV7sdHbgj6cg8wvJnU00.ke","SLASettingsLoadTime":0,"SLASettingsRunningAvgDuration":0,"SLASettingsUptime":0,"SMTPTimeout":0,"SMTPServer":"","SMTPEmail":"","Type":"RealBrowserUser"},
                                {"id":7,"Active":true,"AlertPolicyID":"","AlertPolicyName":"","Browser":"FF","Description":"Sign in to the SFLY Page","DNSLookupType":"","DNSAuthoritative":false,"DNSHostname":"","DNSServer":"","DNSExpectedIPs":"","monitor_id":"83bba7806bb911e5b735002655ec6e4f","InMaintenanceWindow":false,"Interval":1,"LastSampleAt":"2015-10-06T06:06:51Z","Locations":"newyork,sanfrancisco","name":"SLAM_SFLY_Signin","PingTimeout":0,"PingHost":"","PopTimeout":0,"PopServer":"","PopUsername":"","PopPassword":"","PortTimeout":0,"PortServer":"","PortPort":0,"PortProtocol":"","PortCommand":"","PortExpectedResponse":"","ScriptID":"ac087908ca8d422aa53fc21003c80a26","ScriptName":"SLAM_SFLY_SignIn_Test","ScriptVersion":"kPIgyA72fR0ukDlZbeeiLR4nruk4EXYR","SLASettingsLoadTime":30,"SLASettingsRunningAvgDuration":0,"SLASettingsUptime":100,"SMTPTimeout":0,"SMTPServer":"","SMTPEmail":"","Type":"RealBrowserUser"},
                                {"id":8,"Active":true,"AlertPolicyID":"","AlertPolicyName":"","Browser":"FF","Description":"SLAM Check for SFLY Signup","DNSLookupType":"","DNSAuthoritative":false,"DNSHostname":"","DNSServer":"","DNSExpectedIPs":"","monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","InMaintenanceWindow":false,"Interval":1,"LastSampleAt":"2015-10-06T06:06:54Z","Locations":"newyork,sanfrancisco","name":"SLAM_SFLY_Signup","PingTimeout":0,"PingHost":"","PopTimeout":0,"PopServer":"","PopUsername":"","PopPassword":"","PortTimeout":0,"PortServer":"","PortPort":0,"PortProtocol":"","PortCommand":"","PortExpectedResponse":"","ScriptID":"740986c9df6947e28e7ace7e80bf5ac1","ScriptName":"SLAM_SFLY_SignUp_Test","ScriptVersion":"RErv.5TgvlqPftCzqIZLykyCW5r1UFBw","SLASettingsLoadTime":60,"SLASettingsRunningAvgDuration":0,"SLASettingsUptime":100,"SMTPTimeout":0,"SMTPServer":"","SMTPEmail":"","Type":"RealBrowserUser"},
                                {"id":9,"Active":true,"AlertPolicyID":"","AlertPolicyName":"","Browser":"FF","Description":"SLAM Check for TP Signup","DNSLookupType":"","DNSAuthoritative":false,"DNSHostname":"","DNSServer":"","DNSExpectedIPs":"","monitor_id":"db1708186bbd11e5858e002655ec6e4f","InMaintenanceWindow":false,"Interval":1,"LastSampleAt":"2015-10-06T06:06:59Z","Locations":"newyork,sanfrancisco","name":"SLAM_TP_Signup","PingTimeout":0,"PingHost":"","PopTimeout":0,"PopServer":"","PopUsername":"","PopPassword":"","PortTimeout":0,"PortServer":"","PortPort":0,"PortProtocol":"","PortCommand":"","PortExpectedResponse":"","ScriptID":"37a2947311504f56b8c55993d3ce0526","ScriptName":"SLAM_TPSignUpTest","ScriptVersion":"Idzg.Vr3OZQZ_i.C5JfNRa3M9XR6ZyG6","SLASettingsLoadTime":60,"SLASettingsRunningAvgDuration":0,"SLASettingsUptime":100,"SMTPTimeout":0,"SMTPServer":"","SMTPEmail":"","Type":"RealBrowserUser"}
                            ]}
                        };

                        $timeout(function () {
                            deferred.resolve(response);
                        });

                        return deferred.promise;
                    }
                },
                getData: function (date, monitorId, mock, enableClientCalcs) {
                    if (!mock) {
                        var url = enableClientCalcs ? dataSources[dsIndex].rawdataURL : dataSources[dsIndex].dataURL;
                        url = urls.baseUrl + url + monitorId + '&startDate=' + date.startTime + '&endDate=' + date.endTime;

                        return $http({
                            url: url,
                            method: 'GET'                  
                        }).then(
                            function (data) {
                                return data;
                            }
                        );  
                    } else {    // Mock data
                        var deferred = $q.defer();
                        if (monitorId == '5a1c2ab6588c11e592489848e1660ab3') {
                            var response = {
                                data: {'samples': [{"id":17703498,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4399512,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":18390,"sample_id":"6bfe2d016c8811e5889078e3b5120958"},{"id":17703499,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4444158,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9525,"sample_id":"6d2f0be66c8811e5889078e3b5120958"},{"id":17703500,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4442432,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19258,"sample_id":"6accb1e46c8811e5889078e3b5120958"},{"id":17703501,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4418459,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":8973,"sample_id":"699bd3006c8811e5889078e3b5120958"},{"id":17703502,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4395301,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":27618,"sample_id":"3fe2ac036c8811e5889078e3b5120958"},{"id":17703503,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4405635,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":14673,"sample_id":"483ae7006c8811e5889078e3b5120958"},{"id":17703504,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4420631,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":8866,"sample_id":"496bc5e36c8811e5889078e3b5120958"},{"id":17703505,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4574117,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19746,"sample_id":"47096be46c8811e5889078e3b5120958"},{"id":17703506,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4449744,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":9430,"sample_id":"45d865f66c8811e5889078e3b5120958"},{"id":17703507,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410197,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":8509,"sample_id":"25a87fe46c8811e5889078e3b5120958"},{"id":17703508,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4420885,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":15501,"sample_id":"247779f46c8811e5889078e3b5120958"},{"id":17703509,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4453942,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":11335,"sample_id":"217c62656c8811e5889078e3b5120958"},{"id":17703510,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4460113,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19530,"sample_id":"22151ff16c8811e5889078e3b5120958"},{"id":17703511,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4449330,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":25499,"sample_id":"1e81c0036c8811e5889078e3b5120958"},{"id":17703512,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410284,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":15194,"sample_id":"014cf1826c8811e5889078e3b5120958"},{"id":17703513,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4402897,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9244,"sample_id":"01e539e66c8811e5889078e3b5120958"},{"id":17703514,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4538401,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19573,"sample_id":"001b76656c8811e5889078e3b5120958"},{"id":17703515,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4450774,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":9260,"sample_id":"feea49686c8711e5889078e3b5120958"},{"id":17703516,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4395211,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":21662,"sample_id":"f85bf8f56c8711e5889078e3b5120958"},{"id":17703517,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4413368,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":16382,"sample_id":"dd8984736c8711e5889078e3b5120958"},{"id":17703518,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4402614,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9062,"sample_id":"de21f3e46c8711e5889078e3b5120958"},{"id":17703519,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4452491,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":20479,"sample_id":"dc5857726c8711e5889078e3b5120958"},{"id":17703520,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4421924,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":8614,"sample_id":"da8e93f66c8711e5889078e3b5120958"},{"id":17703521,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4434826,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":21528,"sample_id":"cd7241346c8711e5889078e3b5120958"},{"id":17703522,"monitor_id":"5a1c2ab6588c11e592489848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410631,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9318,"sample_id":"b9c665806c8711e5889078e3b5120958"}]}
                            };
                        } else if (monitorId == '555272e66bb611e58f4a002655ec6e4f') {
                            var response = {
                                data: {'samples': [{"id":17703498,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4399512,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":18390,"sample_id":"6bfe2d016c8811e5889078e3b5120958"},{"id":17703499,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4444158,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9525,"sample_id":"6d2f0be66c8811e5889078e3b5120958"},{"id":17703500,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4442432,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19258,"sample_id":"6accb1e46c8811e5889078e3b5120958"},{"id":17703501,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4418459,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":8973,"sample_id":"699bd3006c8811e5889078e3b5120958"},{"id":17703502,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4395301,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":27618,"sample_id":"3fe2ac036c8811e5889078e3b5120958"},{"id":17703503,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4405635,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":14673,"sample_id":"483ae7006c8811e5889078e3b5120958"},{"id":17703504,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4420631,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":8866,"sample_id":"496bc5e36c8811e5889078e3b5120958"},{"id":17703505,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4574117,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19746,"sample_id":"47096be46c8811e5889078e3b5120958"},{"id":17703506,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4449744,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":9430,"sample_id":"45d865f66c8811e5889078e3b5120958"},{"id":17703507,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410197,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":8509,"sample_id":"25a87fe46c8811e5889078e3b5120958"},{"id":17703508,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4420885,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":15501,"sample_id":"247779f46c8811e5889078e3b5120958"},{"id":17703509,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4453942,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":11335,"sample_id":"217c62656c8811e5889078e3b5120958"},{"id":17703510,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4460113,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19530,"sample_id":"22151ff16c8811e5889078e3b5120958"},{"id":17703511,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4449330,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":25499,"sample_id":"1e81c0036c8811e5889078e3b5120958"},{"id":17703512,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410284,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":15194,"sample_id":"014cf1826c8811e5889078e3b5120958"},{"id":17703513,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4402897,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9244,"sample_id":"01e539e66c8811e5889078e3b5120958"},{"id":17703514,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4538401,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19573,"sample_id":"001b76656c8811e5889078e3b5120958"},{"id":17703515,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4450774,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":9260,"sample_id":"feea49686c8711e5889078e3b5120958"},{"id":17703516,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4395211,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":21662,"sample_id":"f85bf8f56c8711e5889078e3b5120958"},{"id":17703517,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4413368,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":16382,"sample_id":"dd8984736c8711e5889078e3b5120958"},{"id":17703518,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4402614,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9062,"sample_id":"de21f3e46c8711e5889078e3b5120958"},{"id":17703519,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4452491,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":20479,"sample_id":"dc5857726c8711e5889078e3b5120958"},{"id":17703520,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4421924,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":8614,"sample_id":"da8e93f66c8711e5889078e3b5120958"},{"id":17703521,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4434826,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":21528,"sample_id":"cd7241346c8711e5889078e3b5120958"},{"id":17703522,"monitor_id":"555272e66bb611e58f4a002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410631,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9318,"sample_id":"b9c665806c8711e5889078e3b5120958"}]}
                            };
                        } else if (monitorId == 'a14f118a6bbc11e5bbb8002655ec6e4f') {
                            var response = {
                                data: {'samples': [{"id":17703498,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4399512,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":18390,"sample_id":"6bfe2d016c8811e5889078e3b5120958"},{"id":17703499,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4444158,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9525,"sample_id":"6d2f0be66c8811e5889078e3b5120958"},{"id":17703500,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4442432,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19258,"sample_id":"6accb1e46c8811e5889078e3b5120958"},{"id":17703501,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4418459,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":8973,"sample_id":"699bd3006c8811e5889078e3b5120958"},{"id":17703502,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4395301,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":27618,"sample_id":"3fe2ac036c8811e5889078e3b5120958"},{"id":17703503,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4405635,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":14673,"sample_id":"483ae7006c8811e5889078e3b5120958"},{"id":17703504,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4420631,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":8866,"sample_id":"496bc5e36c8811e5889078e3b5120958"},{"id":17703505,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4574117,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19746,"sample_id":"47096be46c8811e5889078e3b5120958"},{"id":17703506,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4449744,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":9430,"sample_id":"45d865f66c8811e5889078e3b5120958"},{"id":17703507,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410197,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":8509,"sample_id":"25a87fe46c8811e5889078e3b5120958"},{"id":17703508,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4420885,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":15501,"sample_id":"247779f46c8811e5889078e3b5120958"},{"id":17703509,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4453942,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":11335,"sample_id":"217c62656c8811e5889078e3b5120958"},{"id":17703510,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4460113,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19530,"sample_id":"22151ff16c8811e5889078e3b5120958"},{"id":17703511,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4449330,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":25499,"sample_id":"1e81c0036c8811e5889078e3b5120958"},{"id":17703512,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410284,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":15194,"sample_id":"014cf1826c8811e5889078e3b5120958"},{"id":17703513,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4402897,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9244,"sample_id":"01e539e66c8811e5889078e3b5120958"},{"id":17703514,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4538401,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19573,"sample_id":"001b76656c8811e5889078e3b5120958"},{"id":17703515,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4450774,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":9260,"sample_id":"feea49686c8711e5889078e3b5120958"},{"id":17703516,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4395211,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":21662,"sample_id":"f85bf8f56c8711e5889078e3b5120958"},{"id":17703517,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4413368,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":16382,"sample_id":"dd8984736c8711e5889078e3b5120958"},{"id":17703518,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4402614,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9062,"sample_id":"de21f3e46c8711e5889078e3b5120958"},{"id":17703519,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4452491,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":20479,"sample_id":"dc5857726c8711e5889078e3b5120958"},{"id":17703520,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4421924,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":8614,"sample_id":"da8e93f66c8711e5889078e3b5120958"},{"id":17703521,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4434826,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":21528,"sample_id":"cd7241346c8711e5889078e3b5120958"},{"id":17703522,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410631,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9318,"sample_id":"b9c665806c8711e5889078e3b5120958"}]}
                            };
                        } else if (monitorId == '21e85880588d11e5b2309848e1660ab3') {
                            var response = {
                                data: {'samples': [{"id":17703498,"monitor_id":"21e85880588d11e5b2309848e1660ab3","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4399512,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":18390,"sample_id":"6bfe2d016c8811e5889078e3b5120958"},{"id":17703499,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4444158,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9525,"sample_id":"6d2f0be66c8811e5889078e3b5120958"},{"id":17703500,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4442432,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19258,"sample_id":"6accb1e46c8811e5889078e3b5120958"},{"id":17703501,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4418459,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":8973,"sample_id":"699bd3006c8811e5889078e3b5120958"},{"id":17703502,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4395301,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":27618,"sample_id":"3fe2ac036c8811e5889078e3b5120958"},{"id":17703503,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4405635,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":14673,"sample_id":"483ae7006c8811e5889078e3b5120958"},{"id":17703504,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4420631,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":8866,"sample_id":"496bc5e36c8811e5889078e3b5120958"},{"id":17703505,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4574117,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19746,"sample_id":"47096be46c8811e5889078e3b5120958"},{"id":17703506,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4449744,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":9430,"sample_id":"45d865f66c8811e5889078e3b5120958"},{"id":17703507,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410197,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":8509,"sample_id":"25a87fe46c8811e5889078e3b5120958"},{"id":17703508,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4420885,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":15501,"sample_id":"247779f46c8811e5889078e3b5120958"},{"id":17703509,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4453942,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":11335,"sample_id":"217c62656c8811e5889078e3b5120958"},{"id":17703510,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4460113,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19530,"sample_id":"22151ff16c8811e5889078e3b5120958"},{"id":17703511,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4449330,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":25499,"sample_id":"1e81c0036c8811e5889078e3b5120958"},{"id":17703512,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410284,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":15194,"sample_id":"014cf1826c8811e5889078e3b5120958"},{"id":17703513,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4402897,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9244,"sample_id":"01e539e66c8811e5889078e3b5120958"},{"id":17703514,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4538401,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19573,"sample_id":"001b76656c8811e5889078e3b5120958"},{"id":17703515,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4450774,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":9260,"sample_id":"feea49686c8711e5889078e3b5120958"},{"id":17703516,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4395211,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":21662,"sample_id":"f85bf8f56c8711e5889078e3b5120958"},{"id":17703517,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4413368,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":16382,"sample_id":"dd8984736c8711e5889078e3b5120958"},{"id":17703518,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4402614,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9062,"sample_id":"de21f3e46c8711e5889078e3b5120958"},{"id":17703519,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4452491,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":20479,"sample_id":"dc5857726c8711e5889078e3b5120958"},{"id":17703520,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4421924,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":8614,"sample_id":"da8e93f66c8711e5889078e3b5120958"},{"id":17703521,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4434826,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":21528,"sample_id":"cd7241346c8711e5889078e3b5120958"},{"id":17703522,"monitor_id":"a14f118a6bbc11e5bbb8002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410631,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9318,"sample_id":"b9c665806c8711e5889078e3b5120958"}]}
                            };
                        } else if (monitorId == '23f5556e6bb711e585b3002655ec6e4f') {
                            var response = {
                                data: {'samples': [{"id":17703498,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4399512,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":18390,"sample_id":"6bfe2d016c8811e5889078e3b5120958"},{"id":17703499,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4444158,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9525,"sample_id":"6d2f0be66c8811e5889078e3b5120958"},{"id":17703500,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4442432,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19258,"sample_id":"6accb1e46c8811e5889078e3b5120958"},{"id":17703501,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4418459,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":8973,"sample_id":"699bd3006c8811e5889078e3b5120958"},{"id":17703502,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4395301,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":27618,"sample_id":"3fe2ac036c8811e5889078e3b5120958"},{"id":17703503,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4405635,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":14673,"sample_id":"483ae7006c8811e5889078e3b5120958"},{"id":17703504,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4420631,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":8866,"sample_id":"496bc5e36c8811e5889078e3b5120958"},{"id":17703505,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4574117,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19746,"sample_id":"47096be46c8811e5889078e3b5120958"},{"id":17703506,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4449744,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":9430,"sample_id":"45d865f66c8811e5889078e3b5120958"},{"id":17703507,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410197,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":8509,"sample_id":"25a87fe46c8811e5889078e3b5120958"},{"id":17703508,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4420885,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":15501,"sample_id":"247779f46c8811e5889078e3b5120958"},{"id":17703509,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4453942,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":11335,"sample_id":"217c62656c8811e5889078e3b5120958"},{"id":17703510,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4460113,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19530,"sample_id":"22151ff16c8811e5889078e3b5120958"},{"id":17703511,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4449330,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":25499,"sample_id":"1e81c0036c8811e5889078e3b5120958"},{"id":17703512,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410284,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":15194,"sample_id":"014cf1826c8811e5889078e3b5120958"},{"id":17703513,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4402897,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9244,"sample_id":"01e539e66c8811e5889078e3b5120958"},{"id":17703514,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4538401,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":19573,"sample_id":"001b76656c8811e5889078e3b5120958"},{"id":17703515,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4450774,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":9260,"sample_id":"feea49686c8711e5889078e3b5120958"},{"id":17703516,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4395211,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":21662,"sample_id":"f85bf8f56c8711e5889078e3b5120958"},{"id":17703517,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4413368,"ErrorLineNumber":0,"location":"chicago","start_time":"2015-10-07T00:15:27Z","duration":16382,"sample_id":"dd8984736c8711e5889078e3b5120958"},{"id":17703518,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4402614,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9062,"sample_id":"de21f3e46c8711e5889078e3b5120958"},{"id":17703519,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4452491,"ErrorLineNumber":0,"location":"losangeles","start_time":"2015-10-07T00:15:27Z","duration":20479,"sample_id":"dc5857726c8711e5889078e3b5120958"},{"id":17703520,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4421924,"ErrorLineNumber":0,"location":"sanfrancisco","start_time":"2015-10-07T00:15:27Z","duration":8614,"sample_id":"da8e93f66c8711e5889078e3b5120958"},{"id":17703521,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4434826,"ErrorLineNumber":0,"location":"akron","start_time":"2015-10-07T00:15:27Z","duration":21528,"sample_id":"cd7241346c8711e5889078e3b5120958"},{"id":17703522,"monitor_id":"23f5556e6bb711e585b3002655ec6e4f","start_date":"2015-10-07T00:14:27Z","end_date":"2015-10-07T00:15:27Z","status":"SUCCESS","BytesReceived":4410631,"ErrorLineNumber":0,"location":"washingtondc","start_time":"2015-10-07T00:15:27Z","duration":9318,"sample_id":"b9c665806c8711e5889078e3b5120958"}]}
                            };
                        }
                       

                        $timeout(function () {
                            deferred.resolve(response);
                        });

                        return deferred.promise;
                    }
                }                      
            };
        }]);
});