define(['angular'], function (angular) {
    'use strict';

    /**
     * @ngdoc function
     * @name slamApp.directive:appMetricGraph
     * @description Consumes either raw data or server side calculated data and renders SLA and load time graphs based on specific time ranges
     * # appMetricGraph
     * Directive of the slamApp
     */
    angular.module('directives.appMetricGraph', [])
        .directive('appMetricGraph', function ($q, ClientService, $timeout, $interval, ConfigService, $routeParams, CalculationsService) {
        // .directive('appMetricGraph', function ($q, ClientService, $timeout, $interval, ConfigService, $stateParams) {
         
            return {
                restrict: 'EA',
                templateUrl: 'views/appMetricGraph.html',
                scope: {
                    index: '@',
                    graphRows: '=',
                    viewOne: '=',
                    viewTwo: '=',
                    viewThree: '=',                   
                    monitors: '=',
                    viewOneBrandInRow: '@',
                    viewOneBrand: '@',
                    primary: '@'
                },
                link: function (scope, element) {

                    /*** DEFAULTS ***/

                    // Date and conversions
                    var now;                    
                    var sec1 = 1000;                              

                    // Sizes and offsets
                    var wTime = 900;
                    var widthEndSLA;
                    var widthMetricSLA;
                    var widthTimeGraph;
                    var fontSize = 10;
                    var xLabelSize = 17;
                    var padding = 5;
                    var yOffset = 3;
                    var zoomYOffset = 4;
                    var yDivisor = 4;
                    var labelOffset = 20 + xLabelSize;
                    var xThresholdOffset = 37;
                    var extraOffset = 20;
                    var labelInitOffset = 30 + fontSize;                    
                    var thresholdTime;
                    var thresholdSLA;
                    var decimalPt = 2;
                    var hSLA;
                    var yScaleSLA;
                    var disableBrandOffset = -1;
                    var disableMetricOffset = -1;                    

                    // Data structures
                    scope.brandsData = {};
                    scope.brands = [];
                    scope.cached = {};
                    // scope.monitors = [];
                    scope.currData;                 // Data that is visualized
                    scope.endToEndSLA = [];
                    scope.animateData = [];
                    var filteredMonitors = [];                    
                    var percentLabels = []; 
                    var percentSorted = [];
                    var percentVals = [];                  
                    var clientMetrics = {};

                    // Defaults
                    scope.viewIsOne = JSON.parse(scope.viewOneBrand);
                    scope.viewOneInRow = JSON.parse(scope.viewOneBrandInRow);
                    var brandsChecked = false;
                    scope.loaded = false;
                    scope.isData = true;
                    scope.cacheAvail = false;
                    var isMock;                    
                    scope.zoom;
                    var socketReady;
                    scope.activateAnime;
                    var multiLocalePassed;
                    var dataSource;
                    var pctLabelDiff;                                        
                    var percentDiff;
                    var maxPercentVal;
                    var basePercent;                    
                    var brandIter = 0;
                    var metricIter = 0;                    
                    var timer;
                    var restartAll;
                    var allIter = 0;
                    var transitionPromise;                
                    var minPercentVal;      // need to be accessible by all graph views     
                    // var disabledBrandsOffset;
                    var enableClientCalcs;
                    var nextBrand = false;
                    var manualRenderData;
                    var timeoutProm;                    
                    scope.useCache = false;
                    var defaultSLA;
                    var defaultThreshold;            
                    
                    // Colors
                    var themeColor;
                    var statusColors = { up: null, down: null };
                    var lightShade;
                    var darkShade;
                    var areaColor;                   


                    /*** PUBLIC METHODS ***/

                    // Cache data 
                    scope.cacheData = function (brand) {
                        if (typeof (scope.brandsData[brand]) === 'object') {
                            scope.cached[brand] = angular.copy(scope.brandsData[brand]);
                        }
                    }

                    scope.update = function (brand) {
                        scope.brandsData[brand] = true;
                        // scope.animateData = [];                        
                    };

                    scope.updateAll = function () {
                        for (var brand in scope.brandsData) {
                            scope.brandsData[brand] = true;
                            brandIter = 0;
                            metricIter = 0;
                        }
                    };  
                    
                    scope.percentSorter = function (data1, data2) {
                        if (data1.percentagePassed < data2.percentagePassed) {
                            return -1;
                        } else if (data1.percentagePassed > data2.percentagePassed) {
                            return 1;
                        } else {    // data1.percentagePassed === data2.percentagePassed
                            return 0;
                        }
                    };

                    scope.createTooltip = function () {                         
                        scope.tipDiv = d3.select('body').append('div')
                            .attr('class', 'tooltip')
                            .style('opacity', 0);
                    }

                    // NOT YET IMPLEMENTED
                    scope.drawEtoEGraph = function (selectedElem, graphViewType, brand) {

                        percentVals = [];

                        // End-to-end SLA                        
                        var ts = scope.brandsData[brand].data[graphViewType];                        

                        // Sort data percentages  
                        percentSorted = angular.copy(ts);   
                        percentSorted.sort(scope.percentSorter);                        

                        // Place percent occurrence in hash and pluck percentage data from rest of data
                        percentSorted = _.map(percentSorted, function (item, index) {
                            return parseFloat(item.percentagePassed);                        
                        });    
                        
                        // Get minimum percent data, round, and interpolate the rest of the array
                        for (var i=0; i<yDivisor; i++) {
                            if (i === 0) {
                                percentVals[i] = Math.floor(Math.min.apply(percentSorted, percentSorted));
                                maxPercentVal = 100 - percentVals[i];                        
                                percentDiff = (100 - percentVals[i]) / yDivisor                            
                            } else {
                                percentVals.push(percentVals[i-1] + percentDiff);
                            }
                        }
                        // Handle last percent data
                        percentVals[yDivisor] = 100;                                                                

                        var svg = d3.select(element.find('.' + selectedElem)[0])
                            .append('svg')
                                .attr('width', widthEndSLA + labelOffset)
                                .attr('height', hSLA);

                        // Add bars
                        svg.selectAll('rect')
                            .data(ts)
                            .enter()
                            .append('rect')
                                .attr('x', function (d, i) {    // d == data; i == index
                                    return i * (widthEndSLA / ts.length) + labelOffset;
                                })
                                .attr('y', function (d, i) {
                                    if (scope.zoom) {
                                        // if (i === 0) {
                                        //     return hSLA - yOffset;
                                        // } else {
                                            // Formula to adjust bar levels
                                            // 1- ((100 - actualPercent) / maxPercentVal)
                                            return hSLA - ((1 - ((100 - d.percentagePassed) / maxPercentVal)) * 100 * yScaleSLA) - (fontSize / 2);                                           
                                            // return hSLA - ((1 - ((100 - d.percentagePassed) / maxPercentVal)) * 100 * yScaleSLA) - fontSize - zoomYOffset;                                           
                                        // }
                                    } else {
                                        return hSLA - (d.percentagePassed * yScaleSLA) - fontSize - yOffset;
                                    }
                                })
                                .attr('width', widthEndSLA / ts.length - padding)
                                .attr('height', function (d, i) {
                                    if (scope.zoom) {
                                        return ((1 - ((100 - d.percentagePassed) / maxPercentVal)) * 100 * yScaleSLA) + 2;
                                    } else {
                                        return d.percentagePassed * yScaleSLA;
                                    }
                                })
                                .attr('fill', function (d) {
                                    if (d.realData) {
                                        if (d.status === 0) {
                                            return statusColors.up;
                                        } else {    // above threshold
                                            return statusColors.down;
                                        }
                                    } else {    // pseudo filled data
                                        // return 'gray';
                                        return statusColors.up;
                                    }
                                });  

                        //  Threshold line func
                        var thresholdLine = d3.svg.line()                          
                            .x(function (d, i) {                                
                                return i * (widthTimeGraph / ts.length) + xThresholdOffset;
                            })
                            .y(function (d) {   
                                return hSLA - ((1 - ((100 - thresholdSLA) / maxPercentVal)) * 100 * yScaleSLA) - (fontSize / 2);
                                // return hSLA - ((1 - ((100 - thresholdSLA) / maxPercentVal)) * 100 * yScaleSLA) - fontSize - zoomYOffset;
                            })
                            .interpolate('linear');                                                                     

                        // Add threshold line
                        svg.append('path')
                            .attr({
                                d: thresholdLine(ts),
                                'stroke': 'orange',
                                'stroke-width': 1,
                                'stroke-dasharray': ('3,3'),
                                'fill': 'none'
                            });                                  

                        if (scope.zoom) {
                            var percentType = percentVals;
                        } else {
                            var percentType = percentLabels;
                        }

                        // Add y labels
                        svg.selectAll('text.y')                           
                            .data(percentType)
                            .enter()
                            .append('text')
                            .text(function (d) { return d + '%'; })
                            .attr({
                                'text-anchor': 'middle',
                                x: xLabelSize,
                                y: function (d, i) { 
                                    if (scope.zoom) {
                                        if (i === 0) {                           
                                            return hSLA; 
                                        } else {
                                            return hSLA - (percentLabels[i] / 100) * (hSLA - fontSize); 
                                        }
                                    } else {
                                        return hSLA - (d * yScaleSLA) - fontSize; 
                                    }
                                },
                                'font-family': "sans-serif",
                                'font-size': fontSize,
                                'font-weight': 'bold'
                            });                                                                     
                    }

                    scope.tester = function () {
                        dump('here: ' + scope.test);
                    }

                    // Application metric SLA
                    scope.drawMetricGraph = function (selectedElem, graphViewType, brand, metric) {

                        percentVals = [];
                        if (scope.useCache) {
                            scope.getSizes();
                            var ts = scope.cached[brand].appMetrics[metric][graphViewType].timeSeries;
                            var threshSLA = scope.cached[brand].appMetrics[metric].thresholdSLA;  
                        } else {
                            var ts = scope.brandsData[brand].appMetrics[metric][graphViewType].timeSeries;
                            var threshSLA = scope.brandsData[brand].appMetrics[metric].thresholdSLA;  
                        }   

                        var barWidth = widthMetricSLA / ts.length;  // width of a bar                                                               

                        // Configuration for dynamic bar sizing based on SLA percent data range
                        if (minPercentVal === 80) {
                            percentDiff = 5;
                            yDivisor = 4;
                            pctLabelDiff = 100 / yDivisor;
                        } else if (minPercentVal === 90) {
                            percentDiff = 2;
                            yDivisor = 5;
                            pctLabelDiff = 100 / yDivisor;
                        } else {    // minPercentVal <= 70
                            percentDiff = 10;
                            yDivisor = (100 - minPercentVal) / 10;
                            pctLabelDiff = 100 / yDivisor;
                        }

                        for (var i=0; i<yDivisor; i++) {
                            if (i === 0) {
                                percentVals[0] = minPercentVal;
                                basePercent = 100 - percentVals[0];
                                percentLabels[0] = 0;                        
                            } else {
                                percentVals.push(percentVals[i-1] + percentDiff);
                                percentLabels[i] = pctLabelDiff * i;
                            }
                        }

                        // Handle last percent data
                        percentVals[yDivisor] = 100;
                        percentLabels[yDivisor] = 100; 

                        // Create SVG
                        var svg = d3.select(element.find('.' + selectedElem)[0])
                            .append('svg')
                                .attr('class', 'sla-graph-' + scope.index)
                                .attr('width', widthMetricSLA + labelOffset)
                                .attr('height', hSLA);            

                        // Add bars
                        svg.selectAll('rect')
                            .data(ts)
                            .enter()
                            .append('rect')
                                .attr('x', function (d, i) {    // d == data; i == index
                                    return i * (barWidth) + labelOffset;
                                })
                                .attr('y', function (d) {
                                    if (scope.zoom) {                                        
                                        return hSLA - ((1 - ((100 - d.percentagePassed) / basePercent)) * 100 * yScaleSLA) - (fontSize / 2);                                           
                                    } else {
                                        return hSLA - (d.percentagePassed * yScaleSLA) - fontSize - yOffset;
                                    }
                                })
                                .attr('width', barWidth - padding)
                                .attr('height', function (d) {
                                    if (scope.zoom) {
                                        return ((1 - ((100 - d.percentagePassed) / basePercent)) * 100 * yScaleSLA) + 2;
                                    } else {
                                        return d.percentagePassed * yScaleSLA;
                                    }
                                })
                                .attr('fill', function (d) {
                                    if (d.realData) {
                                        if (d.status === 0) {
                                            return statusColors.up;
                                        } else {    // above threshold
                                            return statusColors.down;
                                        }
                                    } else {    // pseudo filled data
                                        // return 'gray';
                                        return statusColors.up;
                                    }
                                })
                                .on('mouseover', function (d) {
                                    // show tooltip
                                    scope.tipDiv
                                        .style('width', function (d) {
                                            if (graphViewType === 'view7') {
                                                return '104px';
                                            }
                                        });
                                    scope.tipDiv.transition()
                                        .duration(200)
                                        .style('opacity', .9);
                                    scope.tipDiv.html('Time: ' + d.readableTime + '<br/>SLA: ' + (Math.round(d.percentagePassed*10)/10) + '%')
                                        .style('left', (d3.event.pageX < window.innerWidth-80 ? d3.event.pageX-10 : d3.event.pageX-90) + 'px')
                                        .style('top', (d3.event.pageY - 50) + 'px');

                                    // highlight specific bar
                                    svg.selectAll('rect')
                                        .style('opacity', function (innerD) {
                                            if (d.counter === innerD.counter) {
                                                return '0.5';    
                                            } else {
                                                return '1';
                                            }                              
                                        });
                                })
                                .on('mouseout', function (d) {
                                    // hide tooltip
                                    scope.tipDiv.transition()
                                        .duration(500)
                                        .style('opacity', 0);

                                    // de-highlight bars
                                    svg.selectAll('rect')
                                        .style('opacity', function (innerD) {
                                            return '1';
                                        });
                                });

                        //  Threshold line func
                        var thresholdLine = d3.svg.line()                                                      
                            .x(function (d, i) {
                                if (i < ts.length - 1) {                                
                                    return i * barWidth + labelOffset;
                                } else {    // add bar width to draw the line to the end of the graph to account for the last index
                                    return i * barWidth + barWidth + labelOffset - padding;
                                }
                            })
                            .y(function (d, i) { 
                                return hSLA - ((1 - ((100 - (d.sla || threshSLA)) / basePercent)) * 100 * yScaleSLA) - (fontSize / 2);
                            })
                            .interpolate('step');                                                                     

                        // Add threshold line
                        svg.append('path')
                            .attr({
                                d: thresholdLine(ts),
                                'stroke': 'orange',
                                'stroke-width': 1,
                                'stroke-dasharray': ('3,3'),
                                'fill': 'none'
                            });                         

                        if (scope.zoom) {
                            var percentType = percentVals;
                        } else {
                            var percentType = percentLabels;
                        }

                        // Add y labels
                        svg.selectAll('text.y')
                            .data(percentType)
                            .enter()
                            .append('text')
                            .text(function (d) { return d + '%'; })
                            .attr({
                                'text-anchor': 'middle',
                                x: xLabelSize,
                                y: function (d, i) {
                                    if (scope.zoom) {
                                        if (i === 0) {                           
                                            return hSLA; 
                                        } else {
                                            return hSLA - (percentLabels[i] / 100) * (hSLA - fontSize); 
                                        }
                                    } else {
                                        return hSLA - (d * yScaleSLA) - fontSize; 
                                    }
                                },
                                'font-family': "sans-serif",
                                'font-size': fontSize,
                                // 'font-weight': 'bold',
                                // 'stroke': '#D6D2D2'
                            });                       
                    };

                    // Load Time vs. 24 Hour Period
                    scope.drawLoadTimeGraph = function (selectedItem, graphViewType, brand, metric) {
                        
                        if (scope.useCache) {
                            var ts = scope.cached[brand].appMetrics[metric][graphViewType].timeSeries; 
                            var threshTime = scope.cached[brand].appMetrics[metric].thresholdTime;
                        } else {
                            var ts = scope.brandsData[brand].appMetrics[metric][graphViewType].timeSeries; 
                            var threshTime = scope.brandsData[brand].appMetrics[metric].thresholdTime;
                        }

                        var timeLabels = scope.createTimeLabels(threshTime);
                        var lastIndexTL = timeLabels.length - 1;          

                        // Calculate line gradient offset based on threshold value
                        var offsetMark = Math.floor((threshTime /  1000) / timeLabels[lastIndexTL] * 100);  
                        var yMin = hSLA - fontSize - 1;                        
                        var yMax = hSLA - (Math.floor(timeLabels[lastIndexTL] / timeLabels[lastIndexTL]*100) * yScaleSLA) - fontSize - 1;                        
                        
                        // Create SVG canvas
                        var svg = d3.select('.' + selectedItem)
                            .append('svg')
                                .attr('class', 'loadtime-graph-' + scope.index)
                                .attr('width', widthTimeGraph + labelOffset)
                                .attr('height', hSLA);
                        
                        // X location of data 
                        function xLocator (i) {
                            if (i === 0) {
                                return i * (widthTimeGraph / ts.length) + labelInitOffset;
                            } else {
                                return i * (widthTimeGraph / ts.length) + labelOffset;
                            }
                        }                    

                        // Y location of data                                               
                        function yLocator (d) {
                            if (d.loadDelay > timeLabels[lastIndexTL]) {
                                d.loadDelay = timeLabels[lastIndexTL];
                            }
                            var timeToPctOffset = d.loadDelay / timeLabels[lastIndexTL];
                            timeToPctOffset = Math.floor(timeToPctOffset * 100);                              
                            return hSLA - (timeToPctOffset * yScaleSLA) - fontSize + 2;
                        }

                        // Specify color of dots
                        function colorSetter (d) {
                            if (d.loadDelay <= (d.threshold || threshTime) / 1000) {
                                return statusColors.up;
                            } else {    // above threshold
                                return statusColors.down;
                            } 
                        }

                        // Define the line
                        // var area = d3.svg.line()                            
                        var lineFnc = d3.svg.line()                            
                            .x(function (d, i) {
                                return xLocator(i);
                            })
                            .y(function (d) {
                                return yLocator(d);
                                
                            })
                            .interpolate('linear');

                        // Add line graph
                        svg.append('path')
                            .data(ts)
                            .attr({
                                class: 'area',
                                // class: 'line',
                                // d: area(ts)                              
                                d: lineFnc(ts)                              
                            });                          

                        // Add circle
                        svg.selectAll('dot')
                            .data(ts)
                        .enter().append('circle')
                            .attr('r', 4)                            
                            .attr('cx', function (d, i) { 
                                return xLocator(i);
                            })
                            .attr('cy', function (d) { 
                                return yLocator(d);
                            })                             
                            .style('stroke', function (d) {
                                return colorSetter(d);
                            })
                            .style('fill', function (d) {
                                return colorSetter(d);
                            })
                            .style('opacity', 0)
                            .on('mouseover', function (d) {
                                // show tooltip
                                scope.tipDiv.transition()
                                    .duration(300)
                                    .style('opacity', .9);
                                scope.tipDiv.html('Time: ' + d.readableTime + '<br/>Load: ' + (Math.round(d.loadDelay*10) / 10) + 's')
                                    .style('left', (d3.event.pageX < window.innerWidth-80 ? d3.event.pageX-10: d3.event.pageX-90) + 'px')
                                    .style('top', (d3.event.pageY - 50) + 'px');

                                // show circle
                                svg.selectAll('circle')
                                    .data(ts)
                                    .style('opacity', function (innerD) {
                                        if (d.counter === innerD.counter) {
                                            return '.9';
                                        } else {
                                            return '0';
                                        }
                                    });
                            })
                            .on('mouseout', function (d) {
                                scope.tipDiv.transition()
                                    .duration(600)
                                    .style('opacity', 0);

                                svg.selectAll('circle')
                                    .style('opacity', 0);                                        
                            });                                                                                                             
                        
                        // Add line gradient
                        svg.append('linearGradient')
                            .attr({
                                id: 'line-gradient',
                                gradientUnits: 'userSpaceOnUse',
                                x1: 0,
                                x2: 0,
                                y1: yMin,
                                y2: yMax
                            })
                            .selectAll('stop')
                                .data([
                                      { offset: '0%', color: statusColors.up },
                                      { offset: offsetMark + '%', color: statusColors.up },
                                      { offset: offsetMark + '%', color: statusColors.down },
                                      { offset: '100%', color: statusColors.down },
                                ])
                            .enter()
                            .append('stop')
                                .attr({
                                    offset: function (d) { 
                                        return d.offset; 
                                    },
                                    'stop-color': function (d) {
                                        return d.color;
                                    }
                                });         

                        // Add area gradient
                        // areaColor = ConfigService.getTheme() === 'light' ? lightShade : darkShade;
                        // svg.append('linearGradient')
                        //     .attr({
                        //         id: 'area-gradient',
                        //         // id: 'line-gradient',
                        //         gradientUnits: 'userSpaceOnUse',
                        //         x1: 0,
                        //         x2: 0,
                        //         y1: yMin,
                        //         y2: yMax
                        //     })
                        //     .selectAll('stop')
                        //         .data([
                        //               { offset: '0%', color: areaColor },
                        //               { offset: offsetMark + '%', color: areaColor },
                        //               { offset: offsetMark + '%', color: 'red' },
                        //               { offset: '100%', color: 'red' },
                        //         ])
                        //     .enter()
                        //     .append('stop')
                        //         .attr({
                        //             offset: function (d) { 
                        //                 return d.offset; 
                        //             },
                        //             'stop-color': function (d) {
                        //                 return d.color;
                        //             }
                        //         });                                

                        // Threshold line function
                        var thresholdLine = d3.svg.line()                          
                            .x(function (d, i) {
                                if (i === 0) {
                                    return i * (widthTimeGraph / ts.length) + labelInitOffset;
                                } else {
                                    return i * (widthTimeGraph / ts.length) + labelOffset;
                                }
                            })
                            .y(function (d) {   
                                var timeToPctOffset = ((d.threshold || threshTime) /  1000) / timeLabels[lastIndexTL] * 100;                          
                                return hSLA - (timeToPctOffset * yScaleSLA) - (fontSize / 2) - yOffset;
                            })
                            .interpolate('step');                                              

                        // Add threshold line
                        svg.append('path')
                            .attr({
                                d: thresholdLine(ts),
                                'stroke': 'orange',
                                'stroke-dasharray': ('3,3'),
                                'stroke-width': 2,
                                'fill': 'none'
                            });                       
                      
                        // Add y labels
                        svg.selectAll('text.y')
                            .data(timeLabels)
                            .enter()
                            .append('text')
                            .text(function (d) { 
                                if (d >= timeLabels[timeLabels.length-1]) {                                
                                    return '>' + d + 's';
                                } else {
                                    return d + 's';
                                }
                            })
                            .attr({
                                'text-anchor': 'middle',
                                x: fontSize,
                                y: function (d, i) {
                                    var timeToPctOffset = (d / timeLabels[lastIndexTL]) * 100;
                                    return hSLA - (timeToPctOffset * yScaleSLA) - (fontSize / 2) + 1; 
                                },
                                'font-family': "sans-serif",
                                'font-size': fontSize
                                // 'font-weight': 'bold'
                            });
                    };

                    // Create time labels
                    scope.createTimeLabels = function (threshTime) {                        
                        var threshTime2x = (threshTime * 2) / 1000;     // also convert ms to s
                        var maxTime = Math.ceil(threshTime2x / 10) * 10;
                        var increment = 5;

                        // Calculate y-upper limit label
                        if (threshTime2x % increment === 0) {
                            maxTime = threshTime2x;
                        } else if (threshTime2x <= maxTime - increment) {
                            maxTime = maxTime - increment;
                        }

                        var timeLabels = [0];
                        var i = increment;
                        while (i <= maxTime) {
                            timeLabels.push(i);
                            i += increment;
                        }

                        return timeLabels;
                    }                                                   
                    
                    // Processing for end to end SLAs : NOT YET IMPLEMENTED
                    scope.processingEtoE = function (brand) {                                

                        // Iterate throught all brands and then metrics to aggregate checks
                        var firstMetricChecked = false;
                        var allMetricsData = scope.brandsData[brand].data;
                        var calcBuffer = {};
                        _.forEach(scope.brandsData[brand].appMetrics, function (metric) {
                            if (metric['view7'] && metric['view24'] && metric['view60']) {
                                var view7ts;
                                var view24ts;
                                var view60ts;
                                if (!firstMetricChecked) {
                                    allMetricsData['view7'] = angular.copy(metric['view7'].timeSeries);
                                    allMetricsData['view24'] = angular.copy(metric['view24'].timeSeries);
                                    allMetricsData['view60'] = angular.copy(metric['view60'].timeSeries);
                                    firstMetricChecked = true;
                                } else {                                 
                                    _.forEach(metric['view7'].timeSeries, function (ts, i) {                                        
                                        view7ts = allMetricsData['view7'][i];                                        
                                        view7ts.hits += ts.hits;
                                        view7ts.total += ts.total;
                                        calcBuffer = CalculationsService.calculateSLA(view7ts.hits, view7ts.total, thresholdSLA);                                        
                                        view7ts.percentagePassed = calcBuffer.percent === 0 ? CalculationsService.getDefaultSLA() : calcBuffer.percent;
                                        view7ts.status = calcBuffer.status;
                                    });
                                    _.forEach(metric['view24'].timeSeries, function (ts, i) {                         
                                        view24ts = allMetricsData['view24'][i];                                       
                                        view24ts.hits += ts.hits;
                                        view24ts.total += ts.total;
                                        calcBuffer = CalculationsService.calculateSLA(view24ts.hits, view24ts.total, thresholdSLA);
                                        view24ts.percentagePassed = calcBuffer.percent === 0 ? CalculationsService.getDefaultSLA() : calcBuffer.percent;
                                        view24ts.status = calcBuffer.status;
                                    });
                                    _.forEach(metric['view60'].timeSeries, function (ts, i) {
                                        view60ts = allMetricsData['view60'][i];
                                        view60ts.hits += ts.hits;
                                        view60ts.total += ts.total;
                                        calcBuffer = CalculationsService.calculateSLA(view60ts.hits, view60ts.total, thresholdSLA);
                                        view60ts.percentagePassed = calcBuffer.percent;
                                        view60ts.status = calcBuffer.status;
                                    });
                                    firstMetricChecked = false;
                                }
                            }
                        });

                        scope.drawEtoEGraph('viewDaysE-'+brand, 'view7', brand);
                        scope.drawEtoEGraph('viewHoursE-'+brand, 'view24', brand);
                        scope.drawEtoEGraph('viewMinutesE-'+brand, 'view60', brand);                     
                    }                                                        

                    // Remove duplicates by comparing against comparator
                    function removeDups (data, comparator) {
                        var hashTable = {};
                        var filteredData = [];

                        _.forEach(data, function (item) {
                            if (!hashTable[item[comparator]]) {
                                hashTable[item[comparator]] = true;
                                filteredData.push(item);
                            } else {
                                console.log('Duplicate entry found!');
                            }                      
                        });

                        return filteredData;   
                    }

                    // Client data processing
                    function clientCalculations (sampleData, bundledData, viewType, threshSLA, threshDelay, brandMetric) {
                        // Format time for x-axis labels of graphs - perhaps opt for moment.js later
                        var currLocalTime;
                        
                        // Remove duplicate data 
                        // var filteredSampleData = removeDups(sampleData, 'SampleID');                              
                        
                        // Real data
                        _.forEach(sampleData, function (checkData) {                                                                                
                            currLocalTime = new Date(checkData.start_time);                                                      
                            var loadTimeSec = checkData.duration / 1000;    // receiving in milliseconds

                            // massage original data
                            bundledData.data.push({
                                timeEpoch: (new Date(currLocalTime)).getTime(),
                                loadDelay: loadTimeSec,
                                timeLocal: currLocalTime,
                                status: checkData.status
                            });                                        
                        });

                        // Calculations Logic
                        CalculationsService.processData(bundledData, viewType, threshSLA, threshDelay);                                                    
                    }

                    // Server data processing - handle missing data
                    function serverCalculations (sampleData, bundledData, viewType, brandMetric) {
                        
                        var currTime;
                        var currCounter;
                        var index;
                        var slaKey;

                        // Filler table defaults
                        var tableDefaults = CalculationsService.timeGapFiller(viewType);

                        // SLA property based on view type
                        if (viewType === 'view60') {
                            slaKey = 'minute';
                        } else if (viewType === 'view24') {
                            slaKey = 'hour';
                        } else {    // viewType === view7
                            slaKey = 'day';
                        }

                        // Calculated data on the backend
                        _.forEach(sampleData, function (calculatedData) {
                            currTime = CalculationsService.timeIndex(calculatedData, 'start_date', viewType, true);                               
                            index = calculatedData.timeIndex;

                            // Insert retrieved data from the API to tableDefaults
                            if (tableDefaults[index]) {                                        
                                currCounter = tableDefaults[index].counter;

                                // Handle received minute data but with empty checks: interim solution until backend solution is done
                                if (calculatedData[slaKey] === 0 && calculatedData.max_load_time === 10000) {
                                    calculatedData[slaKey] = defaultSLA;
                                    calculatedData.max_load_time = defaultThreshold * 1000;
                                }

                                tableDefaults[index] = {
                                    realData: true,
                                    date: calculatedData.start_date,
                                    readableTime: currTime.readableTime,
                                    sla: calculatedData.sla,
                                    threshold: calculatedData.threshold, 
                                    status: calculatedData[slaKey] >= calculatedData.sla ? 0 : 1, 
                                    percentagePassed: calculatedData[slaKey],                                       
                                    counter: currCounter,
                                    loadDelay: calculatedData.max_load_time / 1000                                  
                                };                                       
                                 
                                currCounter = 0;      
                            }
                        });

                        var orderedData = CalculationsService.dateTimeSorter(tableDefaults);
                    
                        // Add sorted and calculated application metric data to final data structure
                        _.forEach(orderedData, function (bucketIndex) {                    
                            bundledData.timeSeries.push(tableDefaults[bucketIndex]);
                        });                          
                    }

                    // Server data processing - no missing data
                    function serverCalculationsAll (sampleData, bundledData, viewType, brandMetric) {
                        
                        var currTime;
                        var slaKey;

                        // SLA property based on view type
                        if (viewType === 'view60') {
                            slaKey = 'minute';
                        } else if (viewType === 'view24') {
                            slaKey = 'hour';
                        } else {    // viewType === view7
                            slaKey = 'day';
                        }

                        // Calculated data on the backend with no missing data
                        _.forEach(sampleData, function (calculatedData) {
                            currTime = CalculationsService.timeIndex(calculatedData, 'start_date', viewType, true);                               

                            bundledData.timeSeries.push({
                                realData: true,
                                date: calculatedData.start_date,
                                readableTime: currTime.readableTime, 
                                status: calculatedData[slaKey] >= calculatedData.sla ? 0 : 1, 
                                percentagePassed: calculatedData[slaKey],                                       
                                loadDelay: calculatedData.max_load_time                                  
                            });                                                                        
                        });
                    }

                    // Data packaging
                    scope.graphViewProcess = function (sampleResponse, viewType, threshSLA, threshDelay, brandMetric) {
                        var bundledData = {
                            brand: brandMetric[0],
                            clientMetric: brandMetric[1],
                            data: [],
                            timeSeries: []
                        };    

                        if (enableClientCalcs) {
                            clientCalculations(sampleResponse, bundledData, viewType, threshSLA, threshDelay, brandMetric);                                                                                 
                        } else {
                            serverCalculations(sampleResponse, bundledData, viewType, brandMetric);
                        }

                        // attach calculated data to the brand object containing all data grouped by brand 
                        var brandMetricSLA = scope.brandsData[brandMetric[0]].appMetrics[brandMetric[1]];
                        if (!brandMetricSLA) {
                            scope.brandsData[brandMetric[0]].appMetrics[brandMetric[1]] = {};
                            brandMetricSLA = scope.brandsData[brandMetric[0]].appMetrics[brandMetric[1]];
                        }
                        
                        brandMetricSLA[viewType] = bundledData;   

                    };
                    
                    // Extract data from packages and insert into their respective objects
                    scope.extractDataTS = function (monitors) {  
                        _.forEach(monitors, function (monitor) {   
                            var monitorRegEx = /SLAM_(\w+)_(\w+)/;
                            var monitorName = monitor['name'];
                            var brandMetric;
                            var metricMeta;
                            var monIndex;
                            var monIndexAnimate;

                            if (monitorRegEx.exec(monitorName)) {
                                var brand = monitorRegEx.exec(monitorName)[1];
                                var clientMetric = monitorRegEx.exec(monitorName)[2];
                                brandMetric = {
                                    monitor: monitor,
                                    clientMetric: clientMetric,
                                    editableBrandName: ClientService.getBrandName(brand.toLowerCase()),
                                    editableMetricName: ClientService.getMetricName(clientMetric.toLowerCase())    
                                };
                                metricMeta = {
                                    metric: brand.toLowerCase() + '-' + clientMetric.toLowerCase(),
                                    active: false,
                                    stale: false
                                }

                                // Filter (configurable) brands and metrics
                                if (scope.brandsData[brand] == false) {
                                    var node = {};                                
                                    node[brand] = [brandMetric];
                                    filteredMonitors.push(node);
                                    scope.brandsData[brand] = true;

                                    // Store meta for animation cycling
                                    scope.animateData.push({
                                        brand: brand.toLowerCase(),
                                        active: false,
                                        stale: false,
                                        metrics: [
                                            {
                                                metric: brand.toLowerCase() + '-' + clientMetric.toLowerCase(),
                                                active: false,
                                                stale: false
                                            }
                                        ]
                                    });
                                } else if (scope.brandsData[brand]) {
                                    // Get index of monitor in filteredMonitors based on brand
                                    monIndex = _.indexOf(filteredMonitors, _.find(filteredMonitors, function (mon) {
                                        return mon[brand];
                                    }));

                                    if (monIndex > -1) {
                                        filteredMonitors[monIndex][brand].push(brandMetric);
                                    }

                                    // Get index of monitor in animateData based on brand
                                    monIndexAnimate = _.indexOf(scope.animateData, _.find(scope.animateData, function (mon) {
                                        return mon.brand === brand.toLowerCase();
                                    }));

                                    if (monIndexAnimate > -1) {
                                        scope.animateData[monIndexAnimate].metrics.push(metricMeta);
                                    }
                                }
                            } else {    // empty monitor
                                scope.animateData.push({
                                    brand: null,
                                    active: false,
                                    stale: false,
                                    metrics: [
                                        {
                                            metric: null,
                                            active: false,
                                            stale: false
                                        }
                                    ]
                                });
                            }                                                                       
                        });

                        if (filteredMonitors.length > 0) {
                            // Get monitor data from API
                            scope.processMonitor(filteredMonitors[0], 0, filteredMonitors.length)  
                        } else {
                            scope.isData = false;
                        }                                                                      
                    };

                    // Extract ONLY percentages from data
                    scope.percentExtractor = function (brandName, view, metric) {
                        if (scope.useCache) {
                            var sortedTS = (angular.copy(scope.cached[brandName].appMetrics[metric][view].timeSeries)).sort(scope.percentSorter);
                        } else {
                            var sortedTS = (angular.copy(scope.brandsData[brandName].appMetrics[metric][view].timeSeries)).sort(scope.percentSorter);
                        }
                        var percents = _.map(sortedTS, function (item, index) {
                            return parseFloat(item.percentagePassed);                        
                        });
                        return percents;
                    };

                    // Create start and end timestamps in ISO format
                    scope.createTimestamps = function (dateType, offset, removeDotZ, convertToMS) {
                        CalculationsService.setDateNow(new Date());
                        now = CalculationsService.getDateNow();
                        var dateObj = {};

                        if (dateType === 'hour') {
                            now.setMinutes(0,0);                        // start at the top of the hour
                        } else if (dateType === 'day') {
                            now.setHours(0,0,0);
                        }
                        
                        dateObj.startTime = (new Date(now.getTime() - (convertToMS * offset))).toISOString();                        
                        dateObj.endTime = now.toISOString();

                        // Remove dots and Z in ISO string format
                        dateObj.startTime = removeDotZ.exec(dateObj.startTime)[1];
                        dateObj.endTime = removeDotZ.exec(dateObj.endTime)[1];
                        return dateObj;
                    }; 

                    scope.manualTransition = function (useStale) {
                        scope.useCache = useStale;      // processing will know to use cache data
                        scope.cacheTriggered = useStale;      // view will know which data to display
                        scope.loaded = false;
                        scope.renderReady = scope.render(manualRenderData.iter, manualRenderData.currMetrics, manualRenderData.currBrandName, manualRenderData.index, manualRenderData.size);
                        // Send ready state of the graph row
                        // scope.$emit('isReady', scope.index);
                    }

                    scope.render = function (iterator, metrics, brandName, index, size) {
                        var iter = iterator;
                        var currMetrics = metrics;
                        var currBrandName = brandName;
                        // Put currMetrics keys into array
                        var currMetricsAry = Object.keys(currMetrics); 
                        var staleBrand;   
                                                   
                        if (iter < currMetricsAry.length) { 
                            // Send ready state of the graph row
                            scope.$emit('isReady', scope.index);

                            // Closure to enable delay of transitions until ready state is up
                            return function () {                                          
                                var metric = currMetrics[currMetricsAry[iter++]].clientMetric;

                                // Cache data
                                scope.cacheData(currBrandName);

                                // Sort timeseries data and extract only the percentages
                                var sortedTS1 = scope.percentExtractor(currBrandName, scope.viewOne.viewType, metric);   
                                var sortedTS2 = scope.percentExtractor(currBrandName, scope.viewTwo.viewType, metric); 
                                var sortedTS3 = scope.percentExtractor(currBrandName, scope.viewThree.viewType, metric);                                                                                                         

                                // Find minimum data value across all graph views
                                minPercentVal = Math.floor(Math.min(sortedTS1[0], sortedTS2[0], sortedTS3[0]));

                                // To ensure bar visibility, adjust bar level when minimum height equals minimum y-label on graphs
                                if (minPercentVal % 10 === 0 && minPercentVal > 10) {
                                    minPercentVal -= 10;
                                }

                                // Recalculate minimum to a value divisible by 10
                                minPercentVal = Math.floor(minPercentVal / 10) * 10;                                                                                
                               
                                // Transition to the next monitor 
                                scope.transits();

                                // Erase previous graphs from page
                                if (scope.animateData[0].active) {
                                    if (nextBrand && !scope.viewIsOne && !scope.viewOneInRow) {
                                    // if (nextBrand && !scope.viewOneInRow) {
                                        // Remove existing graphs from page
                                        if (index-1 >= 0) {
                                            staleBrand = Object.keys(filteredMonitors[index-1])[0];                                                                 
                                        } else {                       // out of range: flush out last index 
                                            staleBrand = Object.keys(filteredMonitors[size-1])[0];
                                        }
                                        scope.update(staleBrand);        // flush out previous  
                                        d3.selectAll('svg.sla-graph-' + scope.index).remove();
                                        d3.selectAll('svg.loadtime-graph-' + scope.index).remove();
                                        nextBrand = false;
                                    } else {
                                        d3.selectAll('svg.sla-graph-' + scope.index).remove();
                                        d3.selectAll('svg.loadtime-graph-' + scope.index).remove();
                                    }
                                }                           

                                // Set CSS for multiple graph rows
                                if (scope.index > 0) {
                                    $('.loader.fresh.graph-set-' + scope.index).css('margin-top', (scope.index) * (hSLA + 11) + 'px');
                                }

                                // Draw graphs based on new data
                                scope.drawMetricGraph(scope.viewOne.elemPrefix+currBrandName+'-'+metric, scope.viewOne.viewType, currBrandName, metric);
                                scope.drawMetricGraph(scope.viewTwo.elemPrefix+currBrandName+'-'+metric, scope.viewTwo.viewType, currBrandName, metric);
                                scope.drawMetricGraph(scope.viewThree.elemPrefix+currBrandName+'-'+metric, scope.viewThree.viewType, currBrandName, metric);
                                
                                // LoadTime vs. 24 Hour Graph
                                // if (scope.graphRows === 1) {
                                    scope.drawLoadTimeGraph('line-graph-'+currBrandName+'-'+metric, scope.viewThree.viewType, currBrandName, metric);
                                // }                                

                                // Also add total hits on a per brand basis
                                if (!brandsChecked) {
                                    brandsChecked = true;
                                    scope.brandCheckStatus();
                                }

                                scope.loaded = true;
                                scope.animateData[0].active = true;

                                if (scope.activateAnime) {
                                    timeoutProm = $timeout(function () {
                                        scope.renderReady = scope.render.call(null, iter, currMetrics, currBrandName, index, size);
                                        // Send ready state of the graph row
                                        // scope.$emit('isReady', scope.index);
                                    }, timer); 
                                } else {
                                    manualRenderData = {
                                        iter: iter,
                                        currMetrics: currMetrics,
                                        currBrandName: currBrandName,
                                        index: index,
                                        size: size
                                    }
                                }

                                // Check if all data has been cached
                                if (!(iter < currMetricsAry) && !(index+1 < size)) {
                                    scope.cacheAvail = true;
                                } 
                            };                               
                        } else {
                            $timeout.cancel(timeoutProm);  
                            nextBrand = true;

                            // // End to End SLA Graphs
                            // if (scope.activeE2E) {
                            //     scope.processingEtoE(currBrandName);
                            // }                                                        

                            // Get next brand and metric data from API
                            scope.processMonitor(filteredMonitors[++index], index, size);

                            return function () {};
                        }     
                    };      

                    // Process monitors and prepare data processing for each graph view
                    scope.processMonitor = function (monitorData, index, size) {
                        // Synchronous calls: Only query for new data after the last one completes
                        if (index < size) {
                            var promises = [];
                            var currBrandName = Object.keys(monitorData)[0];
                            var currMetrics;                                
                            var iter = 0;
                                                                                                                                                                                                            
                            if (scope.useCache && typeof (scope.cached[currBrandName]) === 'object') {
                                // Use cached data for faster loading and fresh data not needed
                                scope.renderReady = scope.scope.render(iter, scope.cached[currBrandName].appMetrics, currBrandName, index, size);
                                // Send ready state of the graph row
                                // scope.$emit('isReady', scope.index);
                            // } else if (scope.brandsData[currBrandName] === true || scope.viewIsOneBrand) {
                            } else if (scope.brandsData[currBrandName] === true || scope.viewIsOne || scope.viewOneInRow) {
                                // Get fresh data and begin processing
                                scope.brandsData[currBrandName] = {
                                    brandName: currBrandName,
                                    data: {
                                        appMetricUsed: 'view60',
                                        totalHits: 0,
                                        totalChecks: 0,
                                        percentagePassed: 0,
                                        passed: false
                                    },
                                    appMetrics: {}
                                };
                                currMetrics = scope.brandsData[currBrandName].appMetrics;

                                _.forEach(monitorData[currBrandName], function (metricMonitor) {
                                    currMetrics[metricMonitor.clientMetric] = metricMonitor;
                                    currMetrics[metricMonitor.clientMetric].thresholdTime = thresholdTime || (metricMonitor.monitor.sla_settings_load_time * 1000);
                                    currMetrics[metricMonitor.clientMetric].thresholdSLA = thresholdSLA || metricMonitor.monitor.sla_settings_uptime;

                                    // if (enableClientCalcs) {
                                    //     currMetrics[metricMonitor.clientMetric].thresholdTime = (metricMonitor.monitor.sla_settings_load_time * 1000) || thresholdTime;
                                    //     currMetrics[metricMonitor.clientMetric].thresholdSLA = metricMonitor.monitor.sla_settings_uptime || thresholdSLA;  
                                    // } else {
                                    //     currMetrics[metricMonitor.clientMetric].thresholdTime = thresholdTime || (metricMonitor.monitor.sla_settings_load_time * 1000);
                                    //     currMetrics[metricMonitor.clientMetric].thresholdSLA = thresholdSLA || metricMonitor.monitor.sla_settings_uptime; 
                                    // }                                  
                                });

                                var dataSource = enableClientCalcs ? 'samples' : 'results';                                                       

                                // Real data logic
                                _.forEach(currMetrics, function (brandData, index) {

                                    var monitorId = brandData.monitor['monitor_id'];                                    
                                    var viewOneDate = {};
                                    var viewTwoDate = {};
                                    var viewThreeDate = {};                                
                                    var dotZ = /(.+?)(:\d+\.\d+Z)/;


                                    // GET Data either by polling or websockets 
                                    if (socketReady && !isMock) {
                                        scope.isData = true;
                                        scope.graphViewProcess(scope.allMonData[monitorId], scope.viewOne.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);                                                                               
                                        scope.graphViewProcess(scope.allMonData[monitorId], scope.viewTwo.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);                                       
                                        scope.graphViewProcess(scope.allMonData[monitorId], scope.viewThree.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);                                                                              
                                    } else {
                                        // Specify the timestamps for each view                                                                  
                                        viewOneDate = scope.createTimestamps(scope.viewOne.unit, scope.viewOne.num, dotZ, scope.viewOne.convertedMS);                                                                                                          
                                        viewTwoDate = scope.createTimestamps(scope.viewTwo.unit, scope.viewTwo.num, dotZ, scope.viewTwo.convertedMS);                                                                                                          
                                        viewThreeDate = scope.createTimestamps(scope.viewThree.unit, scope.viewThree.num, dotZ, scope.viewThree.convertedMS);                                                                                                                                                  

                                        // View 1
                                        promises.push(ClientService.getData(viewOneDate, monitorId, isMock, enableClientCalcs).then(
                                            function (response) {
                                                scope.isData = true;
                                                if (response.data[dataSource] && response.data[dataSource].length > 0) {
                                                    scope.graphViewProcess(response.data[dataSource], scope.viewOne.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);   
                                                } else {
                                                    scope.graphViewProcess([], scope.viewOne.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);   
                                                }
                                                // if (response.data[dataSource] && response.data[dataSource].length > 0) {
                                                //     scope.graphViewProcess(response.data[dataSource], scope.viewOne.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);   
                                                // } else if (Object.keys(scope.cached).length > 0) {                                                    
                                                //     scope.brandsData[currBrandName].appMetrics[brandData.clientMetric][scope.viewOne.viewType] = scope.cached[currBrandName].appMetrics[brandData.clientMetric][scope.viewOne.viewType];
                                                // } else {
                                                //     scope.graphViewProcess([], scope.viewOne.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);   
                                                // }                                  
                                            },
                                            function (error) {
                                                console.log('Cannot get data at this time with error: ' + error);
                                            }
                                        ));

                                        // View 2
                                        promises.push(ClientService.getData(viewTwoDate, monitorId, isMock, enableClientCalcs).then(
                                            function (response) {
                                                scope.isData = true;
                                                if (response.data[dataSource] && response.data[dataSource].length > 0) {
                                                    scope.graphViewProcess(response.data[dataSource], scope.viewTwo.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);                                       
                                                } else {
                                                    scope.graphViewProcess([], scope.viewTwo.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);                                       
                                                }
                                                // if (response.data[dataSource] && response.data[dataSource].length > 0) {
                                                //     scope.graphViewProcess(response.data[dataSource], scope.viewTwo.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);                                       
                                                // } else if (Object.keys(scope.cached).length > 0) {                                                    
                                                //     scope.brandsData[currBrandName].appMetrics[brandData.clientMetric][scope.viewTwo.viewType] = scope.cached[currBrandName].appMetrics[brandData.clientMetric][scope.viewTwo.viewType];
                                                // } else {
                                                //     scope.graphViewProcess([], scope.viewTwo.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);                                       
                                                // }
                                            },
                                            function (error) {
                                                console.log('Cannot get data at this time with error: ' + error);
                                            }
                                        ));
                                        
                                        // View 3
                                        promises.push(ClientService.getData(viewThreeDate, monitorId, isMock, enableClientCalcs).then(                                
                                            function (response) {
                                                scope.isData = true;
                                                if (response.data[dataSource] && response.data[dataSource].length > 0) {
                                                    scope.graphViewProcess(response.data[dataSource], scope.viewThree.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);
                                                } else {
                                                    scope.graphViewProcess([], scope.viewThree.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);
                                                }
                                                // if (response.data[dataSource] && response.data[dataSource].length > 0) {
                                                //     scope.graphViewProcess(response.data[dataSource], scope.viewThree.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);
                                                // } else if (Object.keys(scope.cached).length > 0) {
                                                //     scope.brandsData[currBrandName].appMetrics[brandData.clientMetric][scope.viewThree.viewType] = scope.cached[currBrandName].appMetrics[brandData.clientMetric][scope.viewThree.viewType];
                                                // } else {
                                                //     scope.graphViewProcess([], scope.viewThree.viewType, brandData.thresholdSLA, brandData.thresholdTime, [ currBrandName, brandData.clientMetric ]);
                                                // }
                                            },
                                            function (error) {
                                                console.log('Cannot get data at this time with error: ' + error);
                                            }
                                        ));
                                    } 
                                });                                                                                                           

                                // Resolve all promises before any further processing
                                $q.all(promises).then(
                                    function () {                                    
                                        if ((scope.isData && scope.animateData[0].active) || !scope.activateAnime) {
                                            // Since delay is embedded into the render function, no delay necessary here
                                            scope.renderReady = scope.render(iter, currMetrics, currBrandName, index, size);
                                            // Send ready state of the graph row
                                            // scope.$emit('isReady', scope.index);    
                                        } else {
                                            // Delay rendering graphs based on timer
                                            timeoutProm = $timeout(function () {
                                                scope.renderReady = scope.render.call(null, iter, currMetrics, currBrandName, index, size);
                                                // Send ready state of the graph row
                                                // scope.$emit('isReady', scope.index);                                                                                 
                                            }, sec1);                                              
                                        }
                                    },
                                    function () {
                                        console.log('Cannot get draw graphs a this time.');
                                    }
                                )
                            } 
                        } else {  
                            // scope.cacheAvail = true;
                            scope.processMonitor(filteredMonitors[0], 0, size);                        
                        }
                    }

                    // Vertical Incidents Blocks
                    scope.brandCheckStatus = function () {
                        var calcBuffer = {};

                        _.forEach(scope.brandsData, function (currData) {
                            if (currData && currData !== true) {
                                _.forEach(currData.appMetrics, function (currAppMetric) {
                                    var viewMetric = currAppMetric[currData.data.appMetricUsed];
                                    if (viewMetric) {
                                        currData.data.totalHits += viewMetric.totalHits;
                                        currData.data.totalChecks += viewMetric.totalTotal;
                                    }
                                });
                                // Calculate data to check if pass
                                calcBuffer = CalculationsService.calculateSLA(currData.data.totalHits, currData.data.totalChecks, thresholdSLA);
                                currData.data.percentagePassed = calcBuffer.percent;
                                currData.data.passed = calcBuffer.status;
                            }

                        });

                        // Dump all processed brands                        
                        scope.allData = _.filter(scope.brandsData, function (brand) {
                            if (brand) {
                                return brand;
                            }
                        });

                        // Track brands object contents with array for easy iteration on view
                        scope.brands = Object.keys(scope.brandsData);
                        // Adjust css of brands                                
                        $timeout(function () {
                            // var percentSize = (1 / scope.brands.length) * 100;
                            var blockSize = document.documentElement.clientWidth / scope.brands.length;
                            $('.brand-status').css('width', blockSize + 'px');
                        });                        
                    };       

                    // Get monitors and apply order where SFLY data preceeds all
                    // scope.getInitSfly = function () { 

                    //     var monitorRegEx = /SLAM_(\w+)_(\w+)/;
                    //     var brand = $routeParams.brand;
                    //     // var brand = $stateParams.brand;

                    //     // Get all active SLAM monitors or specific monitors based on brand                     
                    //     ClientService.getMonitors(isMock).then(
                    //         function (response) {                                
                    //             if (!isMock) {                                    
                    //                 if (brand) {
                    //                     scope.viewOne = true;
                    //                     brand = brand.toLowerCase();
                    //                     // Specify view based on brands
                    //                     scope.monitors = response.data.monitors.filter(function (mon) {
                    //                         if (brand === monitorRegEx.exec(mon.name)[1].toLowerCase()) {
                    //                             return mon;
                    //                         }
                    //                     });

                    //                     if (scope.monitors.length <= 0) {
                    //                         scope.monitors = response.data.monitors;
                    //                     }   
                    //                 } else {
                    //                     scope.viewOne = false;
                    //                     scope.monitors = response.data.monitors;
                    //                 }                                                           
                    //             } else {    // mock data
                    //                 scope.monitors = _.filter(response.data.monitors, function (mon, index) {
                    //                     if (mon.monitor_id === '5a1c2ab6588c11e592489848e1660ab3' || mon.monitor_id === '555272e66bb611e58f4a002655ec6e4f' || mon.monitor_id === 'a14f118a6bbc11e5bbb8002655ec6e4f' || mon.monitor_id === '21e85880588d11e5b2309848e1660ab3' || mon.monitor_id === '23f5556e6bb711e585b3002655ec6e4f') {
                    //                         return mon;
                    //                     }
                    //                 });
                    //             }

                    //             // Initial data: SFLY should be the first array element if it exists
                    //             var sflyIndex = _.indexOf(scope.monitors, _.findWhere(scope.monitors, {monitor_id: '5a1c2ab6588c11e592489848e1660ab3'}));
                    //             if (sflyIndex > -1) {
                    //                 scope.monitors.unshift((scope.monitors.splice(sflyIndex, 1))[0]);
                    //             }

                    //             if (!socketReady) {
                    //                 scope.extractDataTS();  
                    //             }                              
                    //         },
                    //         function (error) {
                    //             console.log('Cannot get monitors with error: ' + error);
                    //         }
                    //     );    
                    // };

                    // Public Interface for function transitions
                    scope.transits = function () {
                        transitions();
                    };

                    scope.noTransits = function () {
                        noTransitions();
                    };

                    // Public Interface for graph sizing
                    scope.getSizes = function () {
                        responsiveSizing();
                    };

                    // Public Interface for initial configuration
                    scope.getConfigs = function () {
                        configs();
                    };

                    // Generate random UUID
                    scope.generateUUID = function () {
                        var d = new Date().getTime();
                        // var uuid = '346332d2-7e53-11e5-8bcf-feff819cdc9f';
                        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                            var r = (d + Math.random()*16)%16 | 0;
                            d = Math.floor(d/16);
                            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
                        });
                        return uuid;
                    };

                    // Setup for Web Sockets Implementation
                    scope.webSocketUI = function () {                        
                        var uuid = scope.generateUUID();
                        var host = 'ws://slam.internal.shutterfly.com/socket';                        

                        // Create a websocket connection
                        scope.socket = new WebSocket(host);


                        // Event Listeners                       

                        scope.socket.onopen = function () {
                            console.log('Connection is open');
                            scope.socket.send(uuid);
                        };

                        scope.socket.onmessage = function (event) {
                            console.log('Message received');
                            scope.allMonData = event.data;
                        };

                        scope.socket.onerror = function () {
                            console.log('Error occurred.');
                        }

                    }

                    if (socketReady) {
                        scope.$on('$destroy', function () {
                            console.log('Closing connection');
                            scope.socket.close();
                        });
                    }


                    /*** PRIVATE METHODS ***/

                    // JS Animation Transitions
                    var transitions = function () {
                        if (metricIter >= scope.animateData[brandIter].metrics.length) {
                            brandIter++;   
                            metricIter = 0;
                            disableMetricOffset = scope.animateData[0].metrics.length - 1;
                        } else {
                            disableMetricOffset = -1;
                        }

                        if (brandIter >= scope.animateData.length) {
                            brandIter = 0;
                            var tempIter = scope.animateData.length - 1;
                            if (tempIter !== brandIter) {
                                disableBrandOffset = tempIter;
                            }
                        } else if (metricIter > 0) {
                            disableBrandOffset = 0;
                        } else {
                            disableBrandOffset = -1;
                        }                                

                        var vertical = scope.animateData[brandIter];
                        var client = {};

                        if (Object.keys(vertical).length !== 0) {
                            client = vertical.metrics[metricIter];
                        }

                        var vertInactive = scope.animateData[brandIter + disableBrandOffset];
                        if (vertInactive) {
                            var clientInactive = vertInactive.metrics[metricIter + disableMetricOffset]; 
                        }                                                       
                        metricIter++;   

                        var delay = 1000;
                        
                        // Hide inactive
                        if (vertInactive && clientInactive && vertInactive.brand) {
                            $('.graph-set-' + scope.index).find('.' + vertInactive.brand).find('.brand-title2').fadeTo(0, 0);
                            $('.graph-set-' + scope.index).find('.' + vertInactive.brand).find('.' + clientInactive.metric).fadeTo(0, 0);
                            // $('.graph-set-' + scope.index).find('.' + vertInactive.brand).find('.brand-title2').hide();
                            // $('.graph-set-' + scope.index).find('.' + vertInactive.brand).find('.' + clientInactive.metric).hide();                               
                        }  

                        // Show active
                        $('.graph-set-' + scope.index).find('.' + vertical.brand).find('.brand-title2').fadeTo(delay, 1, 'linear');
                        $('.graph-set-' + scope.index).find('.' + vertical.brand).find('.' + client.metric).fadeTo(delay, 1, 'linear'); 
                        // $('.graph-set-' + scope.index).find('.' + vertical.brand).find('.brand-title2').show();
                        // $('.graph-set-' + scope.index).find('.' + vertical.brand).find('.' + client.metric).show();  
                    };

                    var noTransitions = function () {
                        // Show only current
                        $('.' + vertical.brand).find('.brand-title2').fadeTo(delay, 1, 'linear');
                        $('.' + vertical.brand).find('.' + client.metric).fadeTo(delay, 1, 'linear');
                    }

                    // Dynamic sizing based on screen size
                    var responsiveSizing = function () {                        
                        // Get size values
                        widthEndSLA = widthMetricSLA = (window.innerWidth - 146) / 3;
                        widthTimeGraph = window.innerWidth - 50;
                        var rows = ConfigService.getGraphRows();
    
                        rows = rows === 1 ? 2 : rows;        // ensure at least 2 rows exist
                        if (scope.activeE2E && scope.activeBrands) {
                            hSLA = (window.innerHeight / rows) - 100;
                        } else if (!scope.activeE2E && scope.activeBrands) {
                            hSLA = (window.innerHeight / rows) - 140;
                        }  else if (!scope.activeE2E && !scope.activeBrands) {
                            hSLA = (window.innerHeight / rows) - 100;
                        }
                        // if (scope.activeE2E && scope.activeBrands) {
                        //     hSLA = (window.innerHeight / ConfigService.getNumOfGraphs()) - 100;
                        // } else if (!scope.activeE2E && scope.activeBrands) {
                        //     hSLA = (window.innerHeight / ConfigService.getNumOfGraphs()) - 140;
                        // }  else if (!scope.activeE2E && !scope.activeBrands) {
                        //     hSLA = (window.innerHeight / ConfigService.getNumOfGraphs()) - 100;
                        // }

                        // yScaleSLA = Math.floor(hSLA / 100) + (hSLA % 100 >= 65 ? ((Math.floor(hSLA) % 100) - 20) / 100 : ((Math.floor(hSLA) % 100) - 10) / 100);
                        yScaleSLA = Math.floor(hSLA / 100) + (hSLA % 100 >= 65 ? ((Math.floor(hSLA) % 100) - 12) / 100 : ((Math.floor(hSLA) % 100) - 10) / 100);

                        // Set dynamic CSS
                        if (scope.activeE2E) {
                            $('.app-metrics').css('top', (hSLA + 41) + 'px');
                            $('.load-time').css('top', (hSLA * 2 + 63) + 'px');
                        } else {
                            $('.load-time').css('top', (hSLA + 41) + 'px');
                        }                        
                    }; 

                    // Get configuration settings from services
                    var configs = function () {
                        // Get date now
                        now = CalculationsService.getDateNow();

                        // Get data source                                        
                        dataSource = ClientService.getDataSource();

                        // Get brands and application metrics
                        scope.brandsData = ClientService.getBrands();
                        clientMetrics = ClientService.getAppMetrics();   

                        // Transition timer delay
                        timer = ConfigService.getTransitionDelay();

                        // Check which components are active on the page
                        scope.activeE2E = ConfigService.getActiveE2E();
                        scope.activeBrands = ConfigService.getActiveBrands();
                        // disabledBrandsOffset = scope.activeBrands ? 0 : 0;

                        // Thresholds
                        thresholdTime = ClientService.getThresholdTime();
                        thresholdSLA = ClientService.getThresholdSLA();

                        // Get page and graph colors
                        // themeColor = ConfigService.getTheme();  
                        statusColors.up = ConfigService.getStatusUp() || 'green';                  
                        statusColors.down = ConfigService.getStatusDown() || 'red'; 
                        lightShade = ConfigService.getLightShade() || '#fff';
                        darkShade = ConfigService.getDarkShade() || '#000';

                        // Get default values
                        defaultSLA = CalculationsService.getDefaultSLA();
                        defaultThreshold = CalculationsService.getDefaultThreshold();

                        // Others
                        enableClientCalcs = ConfigService.getCalcsLoc() === 'client' ? true : false;
                        isMock = ConfigService.getMock();
                        socketReady = ConfigService.getSocketReady();
                        scope.activateAnime = ConfigService.getAnimation()? true : false;  
                        scope.zoom = ConfigService.getZoom();                                     
                    };            


                    /*** LISTENERS ***/   

                    // Check if all rows are ready for the next transition
                    scope.$on('nowReady', function (e) {
                        if (filteredMonitors.length > 0) {
                            scope.renderReady();
                        }
                    });                 

                    // Dynamic sizing based on screen resize
                    window.addEventListener('resize', function () {
                        scope.getSizes();  
                        // $timeout.cancel(timeoutProm);
                        // scope.updateAll();
                        // scope.processMonitor(filteredMonitors[0], 0, filteredMonitors.length);

                        // Dynamically resize graphs based on page resize
                        d3.selectAll('svg.sla-graph')
                            .attr('width', widthMetricSLA + labelOffset)   
                            .attr('height', hSLA);  

                        d3.selectAll('svg.loadtime-graph')
                            .attr('width', widthTimeGraph + labelOffset)   
                            // .attr('width', widthTimeGraph + labelOffset)   
                            .attr('height', hSLA);  
                    });                                        

                    scope.$on('$destroy', function () {
                        $timeout.cancel(timeoutProm);
                    });


                    /*** INITIALIZE ***/                                        

                    // Get threshold info along with initial data config
                    scope.getConfigs(); 
                    
                    // Get graph size specifics based on screen size
                    scope.getSizes();

                    // X-labels tooltip on hover
                    scope.createTooltip();                                                                

                    // Get monitor IDs and initial SFLY's data
                    // scope.getInitSfly();

                    // Start processing monitors
                    scope.extractDataTS(scope.monitors);                             

                    // Start animation loop
                    // initialTransition();      

                    // Test webSocket Interface
                    if (socketReady) {
                        scope.webSocketUI(); 
                    }                                                
                }
            } 

        });
});