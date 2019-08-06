/*jshint unused: vars */
require.config({
    paths: {
        angular: '../bower_components/angular/angular',
        'angular-mocks': '../bower_components/angular-mocks/angular-mocks',
        'angular-resource': '../bower_components/angular-resource/angular-resource',
        'angular-route': '../bower_components/angular-route/angular-route',
        bootstrap: '../bower_components/bootstrap/dist/js/bootstrap',
        'bs-dropdown': '../../bower_components/bootstrap/js/dropdown',
        'bs-modal': '../../bower_components/bootstrap/js/modal',
        d3: '../bower_components/d3/d3',
        lodash: '../bower_components/lodash/lodash',
        underscore: '../bower_components/underscore/underscore',
        jquery: '../../bower_components/jquery/dist/jquery'
    },
    shim: {
        angular: {
            deps: [
                'jquery'
            ],
            exports: 'angular'
        },
        'angular-route': [
            'angular'
        ],
        'angular-resource': [
            'angular'
        ],
        'angular-mocks': {
            deps: [
                'angular'
            ],
            exports: 'angular.mock'
        },
        'bs-dropdown': [
            'jquery'
        ],
        'bs-modal': [
            'jquery'
        ]
    },
    priority: [
        'angular'
    ],
    packages: [

    ]
});

//http://code.angularjs.org/1.2.1/docs/guide/bootstrap#overview_deferred-bootstrap
window.name = 'NG_DEFER_BOOTSTRAP!';

require([
    'angular',
    'app',
    'jquery',
    'angular-route',
    'angular-resource',
    'd3',
    'lodash',
    'underscore',
    'bs-dropdown',
    'bs-modal',
    // 'angular-ui-router'
], function(angular, app) {
    'use strict';
    /* jshint ignore:start */
    var $html = angular.element(document.getElementsByTagName('html')[0]);
    /* jshint ignore:end */
    angular.element().ready(function() {
        angular.resumeBootstrap([app.name]);
    });
});
