"use strict";

var Cylon = require('cylon');

// log directly to the page if we're in the browser
if (process.browser) {
  var BrowserLogger = require('./browser-logger'),
      logContainer = document.getElementById("log");

  console.log("Setting logger!");
  Cylon.Logger.setup({
    logger: BrowserLogger(logContainer),
    level: 'debug'
  });
}

Cylon.robot({
  name: "BrowserBot",

  connections: {
    arduino: { adaptor: 'firmata', port: '/dev/tty.usbmodem1411' }
  },

  devices: {
    led: { driver: 'led', pin: 8 }
  },

  work: function(my) {
    Cylon.Logger.info("Hi, my name is " + my.name)

    every((2).seconds(), function() {
      Cylon.Logger.info("Toggling the LED");
      my.led.toggle();
    });
  }
});

Cylon.start();
