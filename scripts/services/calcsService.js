define(['angular'], function (angular) {

    'use strict';

    /**
     * Service to execute client side SLAM calculations and some functions to process back end calculated data
     */

     angular.module('services.CalculationsService', [])
        .factory('CalculationsService', function () {
            
            /*** DEFAULTS ***/

            var isDataMins = true;    // flag to check for null data on the last hour
            var isDataHours = true;    // flag to check for null data on the last day   
            
            // Default values
            var defaultPercent = 100;
            var defaultDelay = 5;
            var defaultStatus = 0;

            // Date and Conversions
            var now = new Date();
            var daysToMS = 24 * 60 * 60 * 1000;     // hours * min * s * ms
            var hoursToMS = 60 * 60 * 1000;     // min * s * ms
            var minsToMS = 60 * 1000;     // s * ms    
            var earliest;  


            /*** METHODS ***/

            // Provide SLA percentage and single pass/fail status
            function calculateSLA (hits, total, thresholdPercent) {
                var percent;
                if (hits === 0 && total === 0) {
                    percent = defaultPercent;
                } else {                        
                    percent = (hits / total) * 100;
                }
                var status = (percent >= thresholdPercent) ? 0 : 1; 

                return {
                    percent: percent,
                    status: status
                }
            }    

            // Get average of a list of SLAs within a given view
            function avgSLA (slas, limit) {
                // Add graceful defaults to missing data
                while (slas.length < limit) {
                    slas.push(100);
                }
                // Average all SLAs
                var total = 0;
                for (var i=0; i<limit; i++) {
                    total += slas[i];
                }
                return (Math.round((total / limit) * 10)) / 10;
            }

            // Convert time to string in the format HH:mm [ap]m
            function timeStringConverter (hours, minutes) {
                var converted;

                minutes = minutes < 10 ? '0' + minutes : minutes;
                if (hours < 12) {
                    if (hours > 0) {
                        converted = hours + ':' + minutes + 'am'; 
                    } else {    // hours === 0
                        converted = '12' + ':' + minutes + 'am';
                    }
                } else if (hours === 12) {
                    converted = hours + ':' + minutes + 'pm'; 
                } else {
                    converted = (hours - 12) + ':' + minutes + 'pm'; 
                }
                return converted;
            };

            // Fill the current view range buckets with default data
            function timeGapFiller (viewType) {
                var fillerHash = {};
                var hours24 = 24;
                var min60 = 60;
                var days7 = 7;                
                var hourInterval = 60 * 60 * 1000;
                var dayInterval = 24 * 60 * 60 * 1000;
                var limit = viewType == 'view24' ? 24 : (viewType == 'view60' ? 60 : 7);
                var unaccountedDefault = {                            
                    readableTime: 0,
                    status: defaultStatus,
                    percentagePassed: defaultPercent,
                    hits: 0,
                    total: 0,
                    loadDelay: defaultDelay,
                    realData: false
                };
                
                
                if (viewType === 'view60') {
                    var nowView60 = new Date(now.getTime() - minsToMS);
                    var nowMin = nowView60.getMinutes();
                    var nowHour = now.getHours();
                } else if (viewType === 'view24') {
                    var nowView24 = new Date(now.getTime() - hoursToMS);
                    var nowHour = nowView24.getHours();
                } else {    // view7
                    var nowView7 = new Date(now.getTime() - daysToMS);
                    var nowDay = nowView7.getDate();
                }

                for (var i=0; i<limit; i++) {
                    if (viewType === 'view60') {                                
                        fillerHash[nowMin] = angular.copy(unaccountedDefault);
                        fillerHash[nowMin].readableTime = timeStringConverter(nowHour, nowMin);
                        fillerHash[nowMin].date = new Date(nowView60);
                        fillerHash[nowMin].counter =  min60--;
                        // Identify start time
                        if (i === limit-1) {
                            earliest = nowMin;
                        }
                        if (nowView60.getMinutes() === 0) {
                            nowHour = (new Date(nowView60 - hoursToMS)).getHours();
                        }
                        nowView60 = new Date(nowView60 - minsToMS);
                        nowMin = nowView60.getMinutes();
                    } else if (viewType === 'view24') {                                
                        fillerHash[nowHour] = angular.copy(unaccountedDefault);
                        fillerHash[nowHour].readableTime =  timeStringConverter(nowHour, 0);
                        fillerHash[nowHour].date = new Date(nowView24);
                        fillerHash[nowHour].counter =  hours24--;
                        // Persist default data to account for missing 60 min samples data
                        if (i === 0 && !isDataMins) {
                            fillerHash[nowHour].persistDefault = true;
                        }
                        // Identify start time
                        if (i === limit-1) {
                            earliest = nowHour;
                        }
                        nowView24 = new Date(nowView24 - hoursToMS);
                        nowHour = nowView24.getHours();

                    } else {    // view7
                        fillerHash[nowDay] = angular.copy(unaccountedDefault);
                        fillerHash[nowDay].readableTime = nowView7.toLocaleDateString();
                        fillerHash[nowDay].date = new Date(nowView7);
                        fillerHash[nowDay].counter =  days7--;
                        // Persist default data to account for missing 24 hour samples data
                        if (i === 0 && !isDataHours) {
                            fillerHash[nowDay].persistDefault = true;
                        }
                        // Identify start date
                        if (i === limit-1) {
                            earliest = nowDay;
                        }
                        nowView7 = new Date(nowView7 - daysToMS);
                        nowDay = nowView7.getDate();
                    }
                }                        

                fillerHash.length = limit;                       
                return fillerHash;
            }  

            // Returns various time representation of some time
            var timeIndex = function (data, baseTime, viewType, isIndex) {
                var timeRep = {};
                var readableTime;
                var currentTime = (new Date(data[baseTime]));
                var currentHour = currentTime.getHours();;

                // Return various time representation
                timeRep.min = (new Date(data[baseTime])).getMinutes();
                if (viewType === 'view60') {
                    timeRep.readableTime = timeStringConverter(currentHour, timeRep.min);
                } else {
                    if (viewType === 'view24') {
                        timeRep.hour = currentHour;
                        timeRep.readableTime = timeStringConverter(currentHour, 0);
                    } else {    // view7
                        timeRep.hour = currentHour;
                        timeRep.day = currentTime.getDate();
                        timeRep.readableTime = currentTime.toLocaleDateString();
                    }                                                             
                }

                // Only interested in the view type's time index if control variable set to true
                if (isIndex) {
                    data.timeIndex = viewType === 'view24'? timeRep.hour : viewType === 'view7' ? timeRep.day : timeRep.min;                    
                }

                return timeRep;
            };

            // Processing for client metric graphs
            function processData (bundledData, viewType, threshSLA, threshDelay) {
                // 1 hour = 60 checks    
                var passed = 0;     // false
                var currTime;
                var currMin;
                var currHour;
                var timeName;
                var percentagePassed;
                var status;
                var avgLoadTime;
                var hits;
                var total;
                var currCounter = 0;
                var readableTime;
                var timeBuckets = [];
                var slaData = { maxLoadTime: 0, minSLAs: [], currSLA: 0, timeEpoch: 0, timeLocal: 0 }; 
                var minData= { subHits: 0, subTotal: 0, subSLA: 0, subMaxLoadTime: 0, parentTime: null, currTime: null };                   
                var minuteGranular = {};                    
                

                // Resolve time gaps by filling in the entire timeSeries container
                var gapBuckets = timeGapFiller(viewType);

                // Check if sample data for the last hour is null
                if (viewType === 'view60') {
                    isDataMins = bundledData.data.length > 0 ? true : false;
                } else if (viewType === 'view24') {
                    isDataHours = bundledData.data.length > 0 ? true : false;
                }

                // Parse and track passed checks and total checks
                _.forEach(bundledData.data, function (data) {
                    currTime = timeIndex(data, 'timeEpoch', viewType);                                

                    if (viewType === 'view24') {
                        currMin = currTime.min;
                        currTime = currTime.hour;
                        timeName = currTime.toString() + ':' + currMin.toString();
                    } else if (viewType === 'view7') {    
                        currHour = currTime.hour;
                        currMin = currTime.min;
                        currTime = currTime.day;
                        timeName = currTime.toString() + ':' + currHour.toString() + ':' + currMin.toString();
                    } else {    // view60
                        timeName = currTime.min;
                        currTime = currTime.min;
                    }       

                    if (!timeBuckets[currTime]) {
                        timeBuckets[currTime] = angular.copy(slaData);
                    }

                    // Track checks on a per minute basis (consolidate multiple locations)                                
                    if (!minuteGranular[timeName]) {
                        minuteGranular[timeName] = angular.copy(minData);
                        if (viewType === 'view24' || viewType === 'view7') {
                            minuteGranular[timeName].parentTime = currTime;
                        } else {    // view60 
                            minuteGranular[timeName].currTime = currTime;
                        }
                    }
                    if (data.loadDelay <= threshDelay / 1000 ? true : false) {
                        minuteGranular[timeName].subHits++;
                    }
                    minuteGranular[timeName].subTotal++;

                    if (minuteGranular[timeName].subMaxLoadTime < data.loadDelay) {
                        minuteGranular[timeName].subMaxLoadTime = data.loadDelay;
                    } 

                    // Maintain actual dates
                    minuteGranular[timeName].timeEpoch = data.timeEpoch;                                                                                                                          
                    minuteGranular[timeName].timeLocal = data.timeLocal;                               
                                                                                                                                         
                });                                

                // Assign minute SLAs and incorporate minutes data into 24 hour and 7 day aggregates                            
                _.forEach(minuteGranular, function (minData) {
                    minData.subSLA = calculateSLA(minData.subHits, minData.subTotal, threshSLA).percent;                                   

                    if (viewType === 'view24' || viewType === 'view7') {
                        timeBuckets[minData.parentTime].minSLAs.push(minData.subSLA);

                        if (timeBuckets[minData.parentTime].maxLoadTime < minData.subMaxLoadTime) {
                            timeBuckets[minData.parentTime].maxLoadTime = minData.subMaxLoadTime;
                        }

                        // Maintain actual dates
                        timeBuckets[minData.parentTime].timeEpoch = minData.timeEpoch;                                                                                                                          
                        timeBuckets[minData.parentTime].timeLocal = minData.timeLocal;

                    } else  {   // view60
                        timeBuckets[minData.currTime].currSLA = minData.subSLA;                                    
                        timeBuckets[minData.currTime].maxLoadTime = minData.subMaxLoadTime;
                        // Maintain actual dates
                        timeBuckets[minData.currTime].timeEpoch = minData.timeEpoch;                                                                                                                          
                        timeBuckets[minData.currTime].timeLocal = minData.timeLocal;

                    }                                     
                });

                // Process SLAs for each time period and output a single pass/fail value
                _.forEach(timeBuckets, function (bucket) {
                    if (bucket) {                                    
                        currTime = timeIndex(bucket, 'timeEpoch', viewType, true); 
                        readableTime = currTime.readableTime;

                        if (viewType === 'view24') {
                            currTime = currTime.hour;
                        } else if (viewType === 'view7') {    
                            currTime = currTime.day;
                        } else {    // view60
                            currTime = currTime.min;
                        }                                                          
                                           
                         // Actual total with missing data interpolated as passing data (hits)
                        if (viewType === 'view24') {                                        
                            percentagePassed = avgSLA(bucket.minSLAs, 60);
                        } else if (viewType === 'view7') {
                            percentagePassed = avgSLA(bucket.minSLAs, 1440);                                 
                        } else {    // view60
                            percentagePassed = bucket.currSLA;                                   
                        }                             
                        
                        status = percentagePassed >= threshSLA ? 0 : 1;

                        // insert real data into filler buckets
                        if (gapBuckets[currTime] && !gapBuckets[currTime].persistDefault) {                                        
                            currCounter = gapBuckets[currTime].counter;
                            gapBuckets[currTime] = {
                                realData: true,
                                date: bucket.timeLocal,
                                readableTime: readableTime, 
                                status: status, 
                                percentagePassed: percentagePassed,                                       
                                counter: currCounter,
                                loadDelay: bucket.maxLoadTime                                  
                            };                                       
                             
                            currCounter = 0;      
                        }
                    }                                
                });
                
                var orderedData = dateTimeSorter(gapBuckets);

                // Add sorted and calculated application metric data to final data structure
                _.forEach(orderedData, function (bucketIndex) {                    
                    bundledData.timeSeries.push(gapBuckets[bucketIndex]);
                });                                     
            }; 

            // Sort keys represented by date and time
            function dateTimeSorter (data) {
                // Transfer data to actual container to be used for graphing
                var bucketKeys = _.map(Object.keys(data), function (key) {
                    return parseInt(key);
                })

                // Sort
                bucketKeys = bucketKeys.slice(0, bucketKeys.length-1);                            
                var orderedData = bucketKeys.splice(_.indexOf(bucketKeys, earliest));
                orderedData = orderedData.concat(bucketKeys);  

                return orderedData;                  
            }

            // Interpolate missing data on load/time graph by using previous data
            function prevInterpolation (orderedData, viewType, fillerData, bundledData) {
                var prevData;
                _.forEach(orderedData, function (bucketIndex, orderedIndex) {
                    if (viewType === 'view60' && orderedIndex > 0 && !fillerData[bucketIndex].realData) {
                        prevData = orderedData[orderedIndex - 1];
                        fillerData[bucketIndex].loadDelay = fillerData[prevData].loadDelay;
                        fillerData[bucketIndex].percentagePassed = fillerData[prevData].percentagePassed;
                        fillerData[bucketIndex].status = fillerData[prevData].status;
                        bundledData.timeSeries.push(fillerData[bucketIndex]);
                    }
                });  
            }     


            // Return public methods
            return {
                processData: processData,
                calculateSLA: calculateSLA,
                timeGapFiller: timeGapFiller,
                timeIndex: timeIndex,
                dateTimeSorter: dateTimeSorter,
                prevInterpolation: prevInterpolation,
                getDefaultSLA: function () {
                    return defaultPercent;
                },
                getDefaultThreshold: function () {
                    return defaultDelay;
                },
                getDateNow: function () {
                    return now;
                },
                setDateNow: function (dateNow) {
                    now = dateNow;
                }
            };

        });
});