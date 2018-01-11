'use strict';

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'src/*.js',
        'test/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    test: {
      basic: {
        options: {
          url: 'test/fixtures/basic.html',
          startProducer: true,
          expected: [1, 2, 3, 4, 5, 6],
          test: function test(a, b, c) {
            if (!test.actual) {
              test.actual = [];
            }
            test.actual.push(a, b, c);
          }
        }
      },
      inject: {
        options: {
          url: 'test/fixtures/inject.html',
          expected: 'injected',
          test: function test(msg) {
            test.actual = msg;
          },
          puppeteer: {
            inject: require('path').resolve('test/fixtures/inject.js')
          }
        }
      },
      headers: {
        options: {
          url: 'http://localhost:8075',
          startProducer: true,
          server: './test/fixtures/headers_server.js',
          expected: 'custom_header_567',
          test: function test(msg) {
            test.actual = msg;
          },
          puppeteer: {
            page: {
              customHeaders: {
                'X-CUSTOM': 'custom_header_567'
              }
            }
          }
        }
      },
      viewportSize: {
        options: {
          url: 'test/fixtures/viewportSize.html',
          startProducer: true,
          expected: [1366, 800],
          test: function test(a, b) {
            if (!test.actual) {
              test.actual = [];
            }
            test.actual.push(a, b);
          },
          puppeteer: {
            page: {
              viewportSize: {
                width: 1366,
                height: 800
              }
            }
          }
        }
      }
    }
  });

  // The most basic of tests. Not even remotely comprehensive.
  grunt.registerMultiTask('test', 'A test, of sorts.', function () {
    /*
      Sequence of Events:
      1. spawn thread of producer
      2. spawn thread of consumer, this handles the async call.
      3. consumer connects to producer
      4. consumer sends path to qunit html file to producer
      5. producer navigates to the page and evaluates it, sending log and utlimately the successs status
      6. producer notifies the consumer when it is finished, consumer disconnects.
      7. consumer kills itself resolving it's async call
      8. producer kills itself when there are no consumers left
      9. resolve grunt job with the success status determining success of failure.
    */
    /*
      grunt
        task
          producer (or producer monitor with internal queue with hashes for each consumer thread)
          consumer threads (if using monitor, there are many consumer threads)
    */
    var options = this.options();
    options.url = require('fs').realpathSync(options.url);
    var done = this.async();

    options.resolve = function (isSuccessful, output) {
      console.log('Test Finished');
      //TODO add some output testing here?
      done(isSuccessful);
    };

    var PuppetMaster = require('./src/puppetmaster');
    var masterOfPuppets = new PuppetMaster(options);

    //TODO -> this needs to be cleaned up
    masterOfPuppets.listenOn({
      'test': options.test,
      'debug': function (msg) {
        grunt.log.writeln('debug:' + msg);
      },
      'console.log': function (response) {
        grunt.log.writeln(response);
      },
      'fail.load': function (url) {
        grunt.verbose.write('Running Puppeteer...').or.write('...');
        grunt.log.error();
        grunt.warn('Puppeteer unable to load "' + url + '" URI.');
      },
      'fail.timeout': function () {
        grunt.log.writeln();
        grunt.warn('Puppeteer timed out.');
      },
      'error': function (error) {
        var code = error.code;
        var syscall = error.syscall;
        // Ignore time out issue unless thrown from emitter.
        if (!(code === 'ENOENT' || code === 'ECONNREFUSED') && syscall !== 'connect') {
          grunt.fail.warn(error);
        }
      },
      'done': function (res) {
        const {
          error
        } = res;

        //clean up and etc..
        if (error) {
          done(error);
          return;
        }
        var assert = require('assert');
        var difflet = require('difflet')({
          indent: 2,
          comment: true
        });
        try {
          assert.deepEqual(options.test.actual, options.expected, 'Actual should match expected.');
          grunt.log.writeln('Test passed.');
          done();
        } catch (error) {
          grunt.log.subhead('Assertion Failure');
          console.log(difflet.compare(error.expected, error.actual));
          done(error);
        }
      },
    });

    masterOfPuppets.start();
  });

  // The jshint plugin is used for linting.
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // By default, lint library.
  grunt.registerTask('default', ['jshint', 'test']);
};