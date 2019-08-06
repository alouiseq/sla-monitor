// Karma configuration
// http://karma-runner.github.io/0.10/config/configuration-file.html

module.exports = function(config) {
    config.set({
        // base path, that will be used to resolve files and exclude
        basePath: '',
        
        // Add Chrome launcher
        plugins: [ 
            'karma-jasmine',
            'karma-requirejs',
            'karma-chrome-launcher',
            'karma-coverage',
            'karma-ng-html2js-preprocessor',
            'karma-phantomjs-launcher'
        ],

        preprocessors: {
            // specify which of the files we want to appear in the coverage report
            'scripts/controllers/pageGraph.js': ['coverage'],
            'scripts/controllers/pageConfig.js': ['coverage'],
            'scripts/directives/appMetricGraph.js': ['coverage'],
            'views/*.html': ['ng-html2js']
        },

        // add coverage to reporters
        reporters: [ 'dots', 'coverage'],

        // tell karma how you want the coverage results
        coverageReporter: {
            type: 'html',
            // where to store the report
            dir: 'coverage/'
        },

        // testing framework to use (jasmine/mocha/qunit/...)
        frameworks: ['jasmine', "requirejs"],     

        // list of files / patterns to load in the browser
        // included is important if manually loading files to the browser, eg. using Requre.js
        files: [
            {pattern: 'bower_components/angular/angular.js', included: false },
            {pattern: 'bower_components/angular-mocks/angular-mocks.js', included: false },
            {pattern: 'bower_components/angular-resource/angular-resource.js', included: false },
            {pattern: 'bower_components/angular-route/angular-route.js', included: false },
            {pattern: 'bower_components/jquery/dist/jquery.js', included: false },
            {pattern: 'bower_components/underscore/underscore.js', included: false },
            {pattern: 'bower_components/d3/d3.js', included: false },
            {pattern: 'scripts/*.js', included: false },
            {pattern: 'scripts/**/*.js', included: false },
            {pattern: 'test/spec/**/*.js', included: false },
            { pattern: 'views/*.html', included: false },
            // http://karma-runner.github.io/0.10/plus/requirejs.html
            'bower_components/angular/angular.js',
            'test/test-main.js'
        ],

        ngHtml2JsPreprocessor: {
            // // strip this from the file path
             // stripPrefix: 'public/app/',
            //  stripSuffix: '.ext',
            //  // prepend this to the
            //  prependPrefix: 'served/',

            //  // or define a custom transform function
            //  // - cacheId returned is used to load template
            //  //   module(cacheId) will return template at filepath
            //  cacheIdFromPath: function(filepath) {
            //    // example strips 'public/' from anywhere in the path
            //    // module(app/templates/template.html) => app/public/templates/template.html
            //    var cacheId = filepath.strip('public/', '');
            //    return cacheId;
            //  },
            // moduleName: 'templates'
        },

        // list of files / patterns to exclude
        exclude: [
                'app/scripts/main.js'
        ],

        // web server port
        port: 8080,

        // level of logging
        // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        browsers: ['PhantomJS'],


        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: false
    });
};
