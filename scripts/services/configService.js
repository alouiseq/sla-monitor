define(['angular'], function (angular) {

    'use strict';

    /**
     * Configuration Service that can change many settings and features of the application
     */

    angular.module('services.ConfigService', [])
        .factory('ConfigService', [ function () {

            /*** DEFAULTS ***/

            var isMock = false;
            var activateAnime = true;
            var animateControls = ['enable', 'disable'];
            var socketReady = false;
            var zoom = true;
            var themeColor = 'dark';   // light or dark
            var themes = ['dark', 'light'];
            var e2eEnabled = false;
            var brandBlocksEnabled = false;
            var numOfGraphs = 3;
            var timer = 20000;   // transition timer
            var timerOptions = [ 60, 50, 40, 30, 20, 10, 5, 0];
            var rowsDefault = 1;       // number of rows to display SLA graphs
            var imagePath = "./images/";
            var graphRows = [
                {
                    row: 1,
                    image: imagePath + 'oneRow.png'
                },
                {
                    row: 2,
                    image: imagePath + 'twoRows.png'
                },
                {
                    row: 3,
                    image: imagePath + 'threeRows.png'
                },
                {
                    row: 4,
                    image: imagePath + 'fourRows.png'
                }
            ];
            var statusColors = {
                up: 'green',
                down: 'red'
            };
            var areaShades = {
                lightShade: '#f3f3ef',
                darkShade: '#2b2b2b'
            };

            // View Types
            var views = ['view7', 'view24', 'view60'];

            // View Type Helpers
            var viewHelpers = [
                {   
                    viewType: 'view7', 
                    convertedMS: 24 * 60 * 60 * 1000,     // hours * min * s * ms
                    num: 7,
                    unit: 'day',
                    elemPrefix: 'viewDays-',
                    subTitle: '7 days'
                },
                {
                    viewType: 'view24',
                    convertedMS: 60 * 60 * 1000,     // min * s * ms
                    num: 24,
                    unit: 'hour',
                    elemPrefix: 'viewHours-',
                    subTitle: '24 hours'
                },
                {
                    viewType: 'view60',
                    convertedMS: 60 * 1000,     // s * ms
                    num: 60,
                    unit: 'min',
                    elemPrefix: 'viewMinutes-',
                    subTitle: '60 min'
                }
            ];

            var groups = ['brand', 'metric'];
            var currGroupBy = 'metric';

            // Calculations stack location
            var calcsLocation = 'server';            
            var calcsLocOptions = ['client', 'server'];            


            /*** PRIVATE METHODS ***/

            var toggleAnime = function () {
                if (activateAnime === 'enable') {
                    if (!$('.d3-projects').hasClass('animate')) {
                        $('.d3-projects').addClass('animate');
                    }
                } else {    // deactivated here
                    $('.d3-projects').removeClass('animate');
                }
            };

            // Toggle between light and dark background themes
            function toggleTheme () {
                themeColor = localStorage.getItem('theme') || themeColor;
                if (themeColor === 'dark') {
                    $('body').addClass('dark');
                    $('body').removeClass('light');
                } else {
                    $('body').addClass('light');
                    $('body').removeClass('dark');
                }
            }                     

            // Initialize with theme color
            toggleTheme();


            // Public Methods

            return {                             
                getCalcsLoc: function () {                    
                    return localStorage.getItem('calcsLocation') || calcsLocation;
                },
                setCalcsLocation: function (stackLocation) {
                    calcsLocation = stackLocation;
                    localStorage.setItem('calcsLocation', stackLocation);
                },
                getCalcsLocOptions: function () {
                    return calcsLocOptions;
                },
                getMock: function () {                    
                    return isMock;
                },
                setMock: function (mock) {
                    isMock = mock;
                },
                getSocketReady: function () {                    
                    return socketReady;
                },  
                getZoom: function () {                    
                    return zoom;
                },               
                toggleClass: toggleAnime,
                setAnimation: function (ctrl) {
                    activateAnime = ctrl;
                    localStorage.setItem('animation', ctrl);
                },
                getAnimation: function () {
                    return JSON.parse(localStorage.getItem('animation')) || activateAnime;
                },
                getAnimateControls: function () {
                    return animateControls;
                },
                setTheme: function (color) {
                    localStorage.setItem('theme', color);
                    toggleTheme();
                },
                getTheme: function () {
                    return localStorage.getItem('theme') || themeColor;
                },
                getThemes: function () {
                    return themes;
                },
                getActiveE2E: function () {
                    return e2eEnabled;
                },
                getActiveBrands: function () {
                    return brandBlocksEnabled;
                },
                getNumOfGraphs: function () {
                    return e2eEnabled ? numOfGraphs : numOfGraphs - 1;
                },
                setTransitionDelay: function (userTimer) {
                    timer = userTimer;
                    localStorage.setItem('timerDelay', userTimer);
                },
                getTransitionDelay: function () {
                    return parseInt(localStorage.getItem('timerDelay')) || timer;
                },
                getTimers: function () {
                    return timerOptions;
                },
                setStatusUp: function (up) {
                    statusColors.up = up;
                },
                setStatusDown: function (down) {
                    statusColors.down = down;
                },
                getStatusUp: function () {
                    return statusColors.up;
                },
                getStatusDown: function () {
                    return statusColors.down;
                },
                getLightShade: function () {
                    return areaShades.lightShade;
                },
                getDarkShade: function () {
                    return areaShades.darkShade;
                },
                setGraphRows: function (rows) {
                    rowsDefault = rows;
                    localStorage.setItem('graphRows', rows);
                },
                getGraphRows: function () {
                    return parseInt(localStorage.getItem('graphRows')) || rowsDefault;
                },
                getGraphRowsOptions: function () {
                    return graphRows;
                },                                                             
                setGroupBy: function (groupBy) {
                    currGroupBy = groupBy;
                    localStorage.setItem('groupBy', groupBy);
                },
                getGroupBy: function () {
                    return localStorage.getItem('groupBy') || currGroupBy;
                },
                getGroups: function () {
                    return groups;
                },
                getViewHelpers: function () {
                    return viewHelpers;
                }   
            };
        }]);
});