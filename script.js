"use strict";

var Cylon = require('cylon');

// log directly to the page if we're in the browser
if (process.browser) {
  var Logger = require('./browser-logger');

  Cylon.config({
    logging: { logger: Logger }
  });
}

Cylon.robot({
  name: "BrowserBot",

  connection: { name: 'arduino', adaptor: 'firmata', port: '/dev/tty.usbmodem1411' },
  device: { name: 'led', driver: 'led', pin: 8 },

  work: function(my) {
    Cylon.Logger.info("Hi, my name is " + my.name)

    every((2).seconds(), function() {
      Cylon.Logger.info("Toggling the LED");
      my.led.toggle();
    });
  }
});

Cylon.start();
