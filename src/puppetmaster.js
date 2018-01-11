/* jshint ignore:start */ // This is needed as es7 features are not supported in jshint as of Jan 01, 2018

const fs = require('fs')
const {
  spawn
} = require('child_process')
const PuppeteerEventListener = require('./puppeteer-eventEmitter');

//The gruntfile code that launches and manages the instances
/*exports default*/
class PuppetMaster {
  constructor(options) {
    const self = this;
    //TODO add path
    // object || defaults
    options = options || {}

    //TODO need to sanitize the urls up here... need to revise this ish.
    this.path = options.url;
    this.startTimeout = options.startTimeout || 1000;

    this.resolve = options.resolve || function () {
      self.puppeteer.kill();
    } //TODO ? figure out a better way

    this.appName = 'app';
    this.puppeteerId = 'producer';
    this.puppeteer = undefined;
    this.listener = undefined;
    this.eventsMap = options.events || {}; // TODO add default logging
  }

  /*
      API
  */
  // listen to the basic events.
  // this adds events that are not added via grunt options.
  // TODO maybe store the event map here and pass it down at a later point.
  // eventFnMap { eventName: callbackFunction }
  listenOn(eventFnMap) {
    Object.assign(this.eventsMap, eventFnMap);
  }

  //TODO this is the function that fires off the event sequence that spawn everythign.
  // this starts the listener and starts execution.
  start() {
    const self = this;
    //TODO grab the basic connection set from a file.
    // this.listener.connectTo(this.puppeteerId);

    //TODO deprecate this, use the other method, or at least rename the method

    return self.spawnProducer() // spawn the producer first, when it is fully online ~1.5s
      .then(() => {
        return self.spawnListener()
      }) // then spawn the emitter and sync it
      .then(() => {
        self.listener.start()

        return self
      }) // the listener handles all events
    .catch((err) => {
      console.log('The Application failed to start');
      console.error(err);
      this.done();
      process.kill(1);
    })
  }

  // Ensures that the url path given is a valid path.
  // TODO maybe rm, repurpose as path checking does not need to happen anymore.
  exists() {
    let self = this
    return new Promise((resolve, reject) => {
      if (self.debuggerAddress) resolve()

      //TODO make sure this is pointing at the address for the temporary file.
      if (typeof self.path !== 'string') {
        return reject(Error('Application path must be a string'))
      }

      // TODO self.path needs to be the relevant object param to the test file.
      // TODO rm when the path handler is in order
      fs.stat(self.path, (err, stat) => {
        if (err) return reject(err)
        if (stat.isFile()) return resolve()
        reject(Error(`Application path specified is not a file: ${self.path}`))
      })
    })
    .catch(err => {
      console.log('The application already existed or the parameters passed were at issue')
      console.error(err);
      this.done();
      process.kill(1);
    })
  }

  // Spawns the child thread, returns a promise that waits until the child thread is up and running
  // Stops execution on promise failure.
  spawnProducer() {
    if (this.puppeteer) throw new Error("Puppeteer already started");

    this.puppeteer = require('child_process').spawn('node', ['./bin/puppeteer-producer.js', '{}'], {
      stdio: ['ignore', 'inherit', 'ignore', 'ipc'],
      // detached: true
    });

    this.puppeteer.on('exit', () => {
      self.exitHandler();
    })

    const self = this;
    this.exitHandler = () => self.done()
    global.process.on('exit', this.exitHandler);

    return self.waitUntilProducerRunning()
  }

  // Stops execution until producer is running, this is checked by the child_process' connected
  // https://nodejs.org/api/child_process.html#child_process_subprocess_connected
  waitUntilProducerRunning() {
    return new Promise((resolve, reject) => {
      const self = this;
      var startTime = Date.now();
      var check = () => {
        if (!self.puppeteer) {
          return reject(Error('Puppeteer has been stopped'))
        }

        if (self.puppeteer.connected) {
          return resolve()
        }

        var elapsedTime = Date.now() - startTime
        if (elapsedTime > self.startTimeout) {
          return reject(Error(`Puppeteer did not start within ${self.startTimeout}ms`))
        }

        global.setTimeout(check, 100)
      }

      check()
    })
  }

  // Creates the listener object and then listens of the waitUntilRunning promise resolves
  // Stops execution if the child does not spin up, times out, has trouble connecting, or something else.
  spawnListener() {
    if (this.listener) throw new Error("EventEmitter is already started");

    // Add events here, from the store here
    const self = this;
    this.listener = new PuppeteerEventListener({
      url: self.path,
      events: self.eventsMap,
      resolve: self.resolve
    })

    return new Promise((resolve, reject) => {
      resolve()
    })
  }

  cleanup() {
    //TODO figure out which is better
    this.puppeteer.kill()
  }

  done() {
    this.cleanup()
    this.resolve()
  }
}

module.exports = PuppetMaster