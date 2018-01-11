/* jshint ignore:start */ // This is needed as es7 features are not supported in jshint as of Jan 01, 2018

module.exports = function (self, ipc) {
  if (self.verbose) {
    console.log("Puppeteer Event Emitter is connecting to IPC socket with id: ", self.socketId);
  }

  return {
    // Not reccomended to overwrite this default.
    "connect": () => {
      if (self.verbose) {
        console.log('established connection with puppeteer-sock'.rainbow);
      }

      self.getBrowserAddress()
        .then(url => {
          ipc.of.producer.emit('test.page', {
            url: url
            //TODO add other json to this object.
          });
        })
    },
    "console": res => {
      self.emit('console', res);
    },
    "test.timeout": () => {
      ipc.of.producer.emit('test.end');
      ipc.disconnect(self.socketId);
    },
    "error": err => {
      const {
        code,
        syscall
      } = error;
      if (self.options.verbose) {
        ipc.log('error: ', error);
      }

      // ENOENT fires when socket file has not been created.
      // ECONNREFUSED fires when socket file exists but is either busy or unused.
      if ((code === 'ENOENT' || code === 'ECONNREFUSED') && syscall === 'connect') {
        console.log("fires this ish");

        if (self.totalTries === ipc.config.maxRetries) {
          self.emit('fail.load', self.url);
        } else {
          self.totalTries++;
        }
      } else {
        self.emit('error', error);
      }
    },
    "done": res => {
      ipc.log("finised socket based operation".log);
      ipc.disconnect('producer');

      self.emit('done', res);
      self.resolve(res.successful);

      //process.exit(0);
    },
    "disconnect": () => {
      ipc.log("disconnected from connection with puppeteer-sock".notice);
    }
  }
}