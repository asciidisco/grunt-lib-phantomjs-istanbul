/* jshint ignore:start */ // This is needed as es7 features are not supported in jshint as of Jan 01, 2018
const EventEmitter = require('events');
const ipc = require('node-ipc');

const eventDefaults = require('./puppeteerEmitterEventsDefaults');
const AddressHandler = require('./puppeteerAddressHandler');

/*
  Steps:
  1. setup the event emitter syntax (using node events rather than 3rd party) and harmonize it with puppeteer consumer
    - create two spawn calls, one for the producer, one for the consumer.
  2. ensure failures are being signaled correctly
  3. events:
    - log event, to log all the rudimentary logs
    - log the done handler to determine if test succeed or fail.
  4. publish and integrate into the two levels of plugins.
  5. Post work:
    - add verbose logging support for debugging.
    - add code to allow for scripting logging and other things.
    - move out puppeteer code into it's own repository.
    - create monitoring logic so that tests can be run in parallel
*/

/*
  TODO
   - to allow this to be concurrent this id needs to be unique (i.e. add the __filename to the id!)
   - pass the id's has in a connection request and have the monitor/semaphore to allow the scripts to only fire for requests with matching hashes.
*/
/*exports default*/
class PuppeteerEventListener extends EventEmitter {
  constructor(options) {
    super();

    ipc.config.id = 'puppeteerConsumer:' + options.url;
    ipc.config.silent = true || options.verbose;
    ipc.config.retry = 1500;
    ipc.config.maxConnections = 1;
    ipc.config.maxRetries = 5;

    this.socketId = options.socketName || 'producer';
    this.verbose = options.verbose || false;
    this.totalTries = 0;
    this.url = options.url;
    this.grunt = options.grunt;
    this.options = options;
    this.resolve = options.resolve; //the callback from puppetmaster
    this.eventsMap = Object.assign(eventDefaults(this, ipc), options.events);
  }

  start() {
    this.connectTo('producer');
  }

  // add a single entry to the handler
  on(eventName, handler) {
    this.eventsMap[eventName] = handler;
  }

  addEventSet(eventHandlerMapOptional) {
    const entries = Object.entries(eventHandlerMapOptional);
    const len = entries.length;

    for (let i = 0; i < len; i++) {
      const [
        eventName,
        handler
      ] = entries[i];

      this.on(eventName, handler);
    }
  }

  // name of the socket and a hash with { keys:callbacks
  connectTo(socketId, eventHandlerMapOptional) {
    if (this.verbose) {
      console.log("socket id: ", this.socketId);
      console.log("url path", this.url);
      console.log("address from computed getter: ", this.address);
    }

    if (eventHandlerMapOptional) {
      this.addEventSet(eventHandlerMapOptional);
    }

    const entries = Object.entries(this.eventsMap);
    const len = entries.length;

    ipc.connectTo(socketId, () => {
      for (let i = 0; i < len; i++) {
        const [
          event,
          handler
        ] = entries[i];

        ipc.of[socketId].on(event, handler);
      }
    });
  }

  async getBrowserAddress() {
    return await AddressHandler(this.url);
  }

  cleanup() {
    if (this.options.startProducer) {
      this.puppeteer.kill();
    }
  }

  done(isSuccessful) {
    console.log("is done!");

    this.cleanup();
    this.resolve(isSuccessful);
  }
}

module.exports = PuppeteerEventListener;
