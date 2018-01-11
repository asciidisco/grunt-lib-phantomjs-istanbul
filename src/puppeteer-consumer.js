const ipc = require('node-ipc');

ipc.config.id = 'consumer';
ipc.config.retry = 1000;
ipc.config.silent = true;
ipc.config.maxRetries = 5;
ipc.config.maxConnections = 1;

//TODO this is test data...
var json = {
  url: "file:///Users/leolee/EWEGithub/epc-roomsandrates-web/src/static-content-test/scripts/ratesAndAvail/inventoryItemView_qunit.html"
};

ipc.connectTo('producer', () => {
  ipc.of.producer.on('connect', () => { //was 'connect'
    console.log('established connection with puppeteer-sock'.rainbow);
    ipc.of.producer.emit('test.page', json);
  });
  //Error from qunit
  ipc.of.producer.on('qunit.log', res => {
    console.log(res.data);
  });
  //Error from qunit
  ipc.of.producer.on('qunit.error', res => {
    console.log(res.error);
  });
  // Error from puppeteer or ipc
  ipc.of.producer.on('error', (error) => {
    ipc.log('error: ', error);
    ipc.log('stack: ', error.stack);
  });
  ipc.of.producer.on('done', () => {
    ipc.log("finised socket based operation".log);
    ipc.disconnect('producer');

    process.exit(0);
  });
  ipc.of.producer.on('disconnect', () => {
    ipc.log("disconnected from connection with puppeteer-sock".notice);
  });
});