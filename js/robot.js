require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Logger = module.exports = {
  log: function(args) {
    args = args.length >= 1 ? [].slice.call(args, 0) : [];

    var container = document.getElementById('log'),
        div = document.createElement("div"),
        text = document.createTextNode(args.join(''));

    div.appendChild(text);
    container.appendChild(div);
  }
};

['debug', 'info', 'warn', 'error', 'fatal'].forEach(function(type) {
  Logger[type] = Logger.log;
});

},{}],2:[function(require,module,exports){
/*
 * Cylonjs Adaptor adaptor
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var Firmata = require('firmata');
var Cylon = require('cylon');

var Adaptor = module.exports = function Adaptor(opts) {
  if (opts == null) {
    opts = {};
  }

  Adaptor.__super__.constructor.apply(this, arguments);
  this.board = "";
  this.i2cReady = false;
};

Cylon.Utils.subclass(Adaptor, Cylon.Adaptor);

Adaptor.prototype.commands = [
  'pinMode',
  'digitalRead',
  'digitalWrite',
  'analogRead',
  'analogWrite',
  'pwmWrite',
  'servoWrite',
  'i2cConfig',
  'i2cWrite',
  'i2cRead'
];

Adaptor.prototype.connect = function(callback) {
  this.board = new Firmata.Board(this.connection.port, function(data) {
    this.connection.emit('connect');
    callback(null, data);
  }.bind(this));

  this.proxyMethods(this.commands, this.board, this);
};

Adaptor.prototype.disconnect = function(callback) {
  this.board.reset();
  callback();
};

Adaptor.prototype.digitalRead = function(pin, callback) {
  this.pinMode(pin, 'input');

  var adCallback = function(readVal) {
    callback(null, readVal);
  };

  this.board.digitalRead(pin, adCallback);
};

Adaptor.prototype.digitalWrite = function(pin, value) {
  this.pinMode(pin, 'output');
  this.board.digitalWrite(pin, value);
};

Adaptor.prototype.analogRead = function(pin, callback) {
  var adCallback = function(readVal) {
    callback(null, readVal);
  };

  this.board.analogRead(pin, adCallback);
};

Adaptor.prototype.analogWrite = function(pin, value) {
  value = (value).toScale(0, 255);
  this.pinMode(this.board.analogPins[pin], 'analog');
  this.board.analogWrite(this.board.analogPins[pin], value);
};

Adaptor.prototype.pwmWrite = function(pin, value) {
  value = (value).toScale(0, 255);
  this.pinMode(pin, 'pwm');
  this.board.analogWrite(pin, value);
};

Adaptor.prototype.servoWrite = function(pin, value) {
  value = (value).toScale(0, 180);
  this.pinMode(pin, 'servo');
  this.board.servoWrite(pin, value);
};

Adaptor.prototype.i2cWrite = function(address, cmd, buff, callback) {
  if (!this.i2cReady) { this.i2cConfig(2000); }
  this.board.sendI2CWriteRequest(address, [cmd].concat(buff));
  if ('function' === typeof(callback)) { callback(); }
};

Adaptor.prototype.i2cRead = function(address, cmd, length, callback) {
  if (!this.i2cReady) { this.i2cConfig(2000); }
  // TODO: decouple read and write operations here...
  if (cmd) { this.board.sendI2CWriteRequest(address, cmd); }
  this.board.sendI2CReadRequest(address, length, function(data){
    var err = null;

    if (data.name === 'Error') {
      err = data;
      data = null;
    }

    callback(err, data);
  });
};

Adaptor.prototype.pinMode = function(pin, mode) {
  this.board.pinMode(pin, this._convertPinMode(mode));
};

Adaptor.prototype.i2cConfig = function(delay) {
  this.board.sendI2CConfig(delay);
  this.i2cReady = true;
};

Adaptor.prototype._convertPinMode = function(mode) {
  switch (mode) {
    case 'input':
      return this.board.MODES.INPUT ;
    case 'output':
      return this.board.MODES.OUTPUT ;
    case 'analog':
      return this.board.MODES.ANALOG ;
    case 'pwm':
      return this.board.MODES.PWM ;
    case 'servo':
      return this.board.MODES.SERVO ;
    default:
      return this.board.MODES.INPUT ;
  }
};

},{"cylon":46,"firmata":4}],3:[function(require,module,exports){
/**
 * "Inspired" by Encoder7Bit.h/Encoder7Bit.cpp in the
 * Firmata source code.
 */
module.exports = {
    to7BitArray: function(data) {
        var shift = 0;
        var previous = 0;
        var output = [];

        data.forEach(function(byte) {
            if (shift == 0) {
                output.push(byte & 0x7f)
                shift++;
                previous = byte >> 7;
            } else {
                output.push(((byte << shift) & 0x7f) | previous);
                if (shift == 6) {
                    output.push(byte >> 1);
                    shift = 0;
                } else {
                    shift++;
                    previous = byte >> (8 - shift);
                }
            }
        })

        if (shift > 0) {
            output.push(previous);
        }

        return output;
    },
    from7BitArray: function(encoded) {
        var expectedBytes = (encoded.length) * 7 >> 3;
        var decoded = [];

        for (var i = 0; i < expectedBytes ; i++) {
            var j = i << 3;
            var pos = parseInt(j/7);
            var shift = j % 7;
            decoded[i] = (encoded[pos] >> shift) | ((encoded[pos+1] << (7 - shift)) & 0xFF);
        }

        return decoded;
    }
}

},{}],4:[function(require,module,exports){
(function (process,Buffer){
/**
 * @author Julian Gautier
 */

/**
 * Module Dependencies
 */

var util = require('util'),
    events = require('events'),
    Encoder7Bit = require('./encoder7bit'),
    OneWireUtils = require('./onewireutils'),
    SerialPort = null;

try {
    if (process.browser) {
        SerialPort = require('browser-serialport').SerialPort;
    } else {
        SerialPort = require('serialport').SerialPort;
    }
} catch (err) {
    SerialPort = null;
}

if (SerialPort == null) {
    console.log("It looks like serialport didn't compile properly. This is a common problem and its fix is well documented here https://github.com/voodootikigod/node-serialport#to-install");
    throw "Missing serialport dependency";
}

/**
 * constants
 */

var PIN_MODE = 0xF4,
    REPORT_DIGITAL = 0xD0,
    REPORT_ANALOG = 0xC0,
    DIGITAL_MESSAGE = 0x90,
    START_SYSEX = 0xF0,
    END_SYSEX = 0xF7,
    QUERY_FIRMWARE = 0x79,
    REPORT_VERSION = 0xF9,
    ANALOG_MESSAGE = 0xE0,
    EXTENDED_ANALOG = 0x6F,
    CAPABILITY_QUERY = 0x6B,
    CAPABILITY_RESPONSE = 0x6C,
    PIN_STATE_QUERY = 0x6D,
    PIN_STATE_RESPONSE = 0x6E,
    ANALOG_MAPPING_QUERY = 0x69,
    ANALOG_MAPPING_RESPONSE = 0x6A,
    I2C_REQUEST = 0x76,
    I2C_REPLY = 0x77,
    I2C_CONFIG = 0x78,
    STRING_DATA = 0x71,
    SYSTEM_RESET = 0xFF,
    PULSE_OUT = 0x73,
    PULSE_IN = 0x74,
    SAMPLING_INTERVAL = 0x7A,
    STEPPER = 0x72,
    ONEWIRE_DATA = 0x73,

    ONEWIRE_CONFIG_REQUEST = 0x41,
    ONEWIRE_SEARCH_REQUEST = 0x40,
    ONEWIRE_SEARCH_REPLY = 0x42,
    ONEWIRE_SEARCH_ALARMS_REQUEST = 0x44,
    ONEWIRE_SEARCH_ALARMS_REPLY = 0x45,
    ONEWIRE_READ_REPLY = 0x43,
    ONEWIRE_RESET_REQUEST_BIT = 0x01,
    ONEWIRE_READ_REQUEST_BIT = 0x08,
    ONEWIRE_DELAY_REQUEST_BIT = 0x10,
    ONEWIRE_WRITE_REQUEST_BIT = 0x20,
    ONEWIRE_WITHDATA_REQUEST_BITS = 0x3C;

/**
* MIDI_RESPONSE contains functions to be called when we receive a MIDI message from the arduino.
* used as a switch object as seen here http://james.padolsey.com/javascript/how-to-avoid-switch-case-syndrome/
* @private
*/

var MIDI_RESPONSE = {};

/**
 * Handles a REPORT_VERSION response and emits the reportversion event.  Also turns on all pins to start reporting
 * @private
 * @param {Board} board the current arduino board we are working with.
 */

MIDI_RESPONSE[REPORT_VERSION] = function (board) {
    board.version.major = board.currentBuffer[1];
    board.version.minor = board.currentBuffer[2];
    for (var i = 0; i < 16; i++) {
        board.sp.write(new Buffer([REPORT_DIGITAL | i, 1]));
        board.sp.write(new Buffer([REPORT_ANALOG | i, 1]));
    }
    board.emit('reportversion');
};

/**
 * Handles a ANALOG_MESSAGE response and emits 'analog-read' and 'analog-read-'+n events where n is the pin number.
 * @private
 * @param {Board} board the current arduino board we are working with.
 */

MIDI_RESPONSE[ANALOG_MESSAGE] = function (board) {
    var value = board.currentBuffer[1] | (board.currentBuffer[2] << 7);
    var port = board.currentBuffer[0] & 0x0F;
    if (board.pins[board.analogPins[port]]) {
        board.pins[board.analogPins[port]].value = value;
    }
    board.emit('analog-read-' + port, value);
    board.emit('analog-read', {
        pin: port,
        value: value
    });
};

/**
 * Handles a DIGITAL_MESSAGE response and emits a 'digital-read' and 'digital-read-'+n events where n is the pin number.
 * @private
 * @param {Board} board the current arduino board we are working with.
 */

MIDI_RESPONSE[DIGITAL_MESSAGE] = function (board) {
    var port = (board.currentBuffer[0] & 0x0F);
    var portValue = board.currentBuffer[1] | (board.currentBuffer[2] << 7);
    for (var i = 0; i < 8; i++) {
        var pinNumber = 8 * port + i;
        var pin = board.pins[pinNumber];
        if (pin && (pin.mode === board.MODES.INPUT)) {
            pin.value = (portValue >> (i & 0x07)) & 0x01;
            board.emit('digital-read-' + pinNumber, pin.value);
            board.emit('digital-read', {
                pin: pinNumber,
                value: pin.value
            });
        }
    }
};

/**
 * SYSEX_RESPONSE contains functions to be called when we receive a SYSEX message from the arduino.
 * used as a switch object as seen here http://james.padolsey.com/javascript/how-to-avoid-switch-case-syndrome/
 * @private
 */

var SYSEX_RESPONSE = {};

/**
 * Handles a QUERY_FIRMWARE response and emits the 'queryfirmware' event
 * @private
 * @param {Board} board the current arduino board we are working with.
 */

SYSEX_RESPONSE[QUERY_FIRMWARE] = function (board) {
    var firmwareBuf = [];
    board.firmware.version = {};
    board.firmware.version.major = board.currentBuffer[2];
    board.firmware.version.minor = board.currentBuffer[3];
    for (var i = 4, length = board.currentBuffer.length - 2; i < length; i += 2) {
        firmwareBuf.push((board.currentBuffer[i] & 0x7F) | ((board.currentBuffer[i + 1] & 0x7F) << 7));
    }


    board.firmware.name = new Buffer(firmwareBuf).toString('utf8', 0, firmwareBuf.length);
    board.emit('queryfirmware');
};

/**
 * Handles a CAPABILITY_RESPONSE response and emits the 'capability-query' event
 * @private
 * @param {Board} board the current arduino board we are working with.
 */

SYSEX_RESPONSE[CAPABILITY_RESPONSE] = function (board) {
    var supportedModes = 0;

    function pushModes(modesArray, mode) {
        if (supportedModes & (1 << board.MODES[mode])) {
            modesArray.push(board.MODES[mode]);
        }
    }

    for (var i = 2, n = 0; i < board.currentBuffer.length - 1; i++) {
        if (board.currentBuffer[i] === 127) {
            var modesArray = [];
            Object.keys(board.MODES).forEach(pushModes.bind(null, modesArray));
            board.pins.push({
                supportedModes: modesArray,
                mode: board.MODES.UNKNOWN,
                value : 0,
                report: 1
            });
            supportedModes = 0;
            n = 0;
            continue;
        }
        if (n === 0) {
            supportedModes |= (1 << board.currentBuffer[i]);
        }
        n ^= 1;
    }
    board.emit('capability-query');
};

/**
 * Handles a PIN_STATE response and emits the 'pin-state-'+n event where n is the pin number
 * @private
 * @param {Board} board the current arduino board we are working with.
 */

SYSEX_RESPONSE[PIN_STATE_RESPONSE] = function (board) {
    var pin = board.currentBuffer[2];
    board.pins[pin].mode = board.currentBuffer[3];
    board.pins[pin].value = board.currentBuffer[4];
    if (board.currentBuffer.length > 6) {
        board.pins[pin].value |= (board.currentBuffer[5] << 7);
    }
    if (board.currentBuffer.length > 7) {
        board.pins[pin].value |= (board.currentBuffer[6] << 14);
    }
    board.emit('pin-state-' + pin);
};

/**
 * Handles a ANALOG_MAPPING_RESPONSE response and emits the 'analog-mapping-query' event.
 * @private
 * @param {Board} board the current arduino board we are working with.
 */

SYSEX_RESPONSE[ANALOG_MAPPING_RESPONSE] = function (board) {
    var pin = 0;
    var currentValue;
    for (var i = 2; i < board.currentBuffer.length - 1; i++) {
        currentValue = board.currentBuffer[i];
        board.pins[pin].analogChannel = currentValue;
        if (currentValue !== 127) {
            board.analogPins.push(pin);
        }
        pin++;
    }
    board.emit('analog-mapping-query');
};

/**
 * Handles a I2C_REPLY response and emits the 'I2C-reply-'+n event where n is the slave address of the I2C device.
 * The event is passed the buffer of data sent from the I2C Device
 * @private
 * @param {Board} board the current arduino board we are working with.
 */

SYSEX_RESPONSE[I2C_REPLY] = function (board) {
    var replyBuffer = [];
    var slaveAddress = (board.currentBuffer[2] & 0x7F) | ((board.currentBuffer[3] & 0x7F) << 7);
    var register = (board.currentBuffer[4] & 0x7F) | ((board.currentBuffer[5] & 0x7F) << 7);
    for (var i = 6, length = board.currentBuffer.length - 1; i < length; i += 2) {
        replyBuffer.push(board.currentBuffer[i] | (board.currentBuffer[i + 1] << 7));
    }
    board.emit('I2C-reply-' + slaveAddress, replyBuffer);
};

SYSEX_RESPONSE[ONEWIRE_DATA] = function(board) {
    var subCommand = board.currentBuffer[2];

    if(!SYSEX_RESPONSE[subCommand]) {
        return;
    }

    SYSEX_RESPONSE[subCommand](board);
};

SYSEX_RESPONSE[ONEWIRE_SEARCH_REPLY] = function(board) {
    var pin = board.currentBuffer[3];
    var replyBuffer = board.currentBuffer.slice(4, board.currentBuffer.length -1);

    board.emit('1-wire-search-reply-' + pin, OneWireUtils.readDevices(replyBuffer));
};

SYSEX_RESPONSE[ONEWIRE_SEARCH_ALARMS_REPLY] = function(board) {
    var pin = board.currentBuffer[3];
    var replyBuffer = board.currentBuffer.slice(4, board.currentBuffer.length -1);

    board.emit('1-wire-search-alarms-reply-' + pin, OneWireUtils.readDevices(replyBuffer));
};

SYSEX_RESPONSE[ONEWIRE_READ_REPLY] = function(board) {
    var encoded = board.currentBuffer.slice(4, board.currentBuffer.length -1);
    var decoded = Encoder7Bit.from7BitArray(encoded);
    var correlationId = (decoded[1] << 8) | decoded[0];

    board.emit('1-wire-read-reply-' + correlationId, decoded.slice(2));
};

/**
 * Handles a STRING_DATA response and logs the string to the console.
 * @private
 * @param {Board} board the current arduino board we are working with.
 */

SYSEX_RESPONSE[STRING_DATA] = function (board) {
    var string = new Buffer(board.currentBuffer.slice(2, -1)).toString('utf8').replace(/\0/g, '');
    board.emit('string', string);
};

/**
 * Response from pulseIn
 */

SYSEX_RESPONSE[PULSE_IN] = function (board){
    var pin = (board.currentBuffer[2] & 0x7F) | ((board.currentBuffer[3] & 0x7F) << 7);
    var durationBuffer = [
        (board.currentBuffer[4] & 0x7F) | ((board.currentBuffer[5] & 0x7F) << 7),
        (board.currentBuffer[6] & 0x7F) | ((board.currentBuffer[7] & 0x7F) << 7),
        (board.currentBuffer[8] & 0x7F) | ((board.currentBuffer[9] & 0x7F) << 7),
        (board.currentBuffer[10] & 0x7F) | ((board.currentBuffer[11] & 0x7F) << 7)
    ];
    var duration = ( (durationBuffer[0] << 24) +
                     (durationBuffer[1] << 16) +
                     (durationBuffer[2] << 8) +
                     (durationBuffer[3] ) );
    board.emit('pulse-in-'+pin,duration);
};

/**
 * Handles the message from a stepper completing move
 * @param {Board} board
 */

SYSEX_RESPONSE[STEPPER] = function (board) {
    var deviceNum = board.currentBuffer[2];
    board.emit('stepper-done-'+deviceNum, true);
};

/**
 * @class The Board object represents an arduino board.
 * @augments EventEmitter
 * @param {String} port This is the serial port the arduino is connected to.
 * @param {function} function A function to be called when the arduino is ready to communicate.
 * @property MODES All the modes available for pins on this arduino board.
 * @property I2C_MODES All the I2C modes available.
 * @property HIGH A constant to set a pins value to HIGH when the pin is set to an output.
 * @property LOW A constant to set a pins value to LOW when the pin is set to an output.
 * @property pins An array of pin object literals.
 * @property analogPins An array of analog pins and their corresponding indexes in the pins array.
 * @property version An object indicating the major and minor version of the firmware currently running.
 * @property firmware An object indicateon the name, major and minor version of the firmware currently running.
 * @property currentBuffer An array holding the current bytes received from the arduino.
 * @property {SerialPort} sp The serial port object used to communicate with the arduino.
 */
var Board = function(port, options, callback) {
    events.EventEmitter.call(this);
    if (typeof options === 'function') {
        callback = options;
        options = {
            reportVersionTimeout: 5000
        };
    }
    var board = this;
    this.MODES = {
        INPUT: 0x00,
        OUTPUT: 0x01,
        ANALOG: 0x02,
        PWM: 0x03,
        SERVO: 0x04,
        SHIFT: 0x05,
        I2C: 0x06,
        ONEWIRE: 0x07,
        STEPPER: 0x08,
        IGNORE: 0x7F,
        UNKOWN: 0x10
    };

    this.I2C_MODES = {
        WRITE: 0x00,
        READ: 1,
        CONTINUOUS_READ: 2,
        STOP_READING: 3
    };

    this.STEPPER = {
        TYPE: {
            DRIVER: 1,
            TWO_WIRE: 2,
            FOUR_WIRE: 4
        },
        RUNSTATE: {
            STOP: 0,
            ACCEL: 1,
            DECEL: 2,
            RUN: 3
        },
        DIRECTION: {
            CCW: 0,
            CW: 1
        }
    };

    this.HIGH = 1;
    this.LOW = 0;
    this.pins = [];
    this.analogPins = [];
    this.version = {};
    this.firmware = {};
    this.currentBuffer = [];
    this.versionReceived = false;

    if(typeof port === 'object'){
        this.sp = port;
    } else {
        this.sp = new SerialPort(port, {
            baudrate: 57600,
            buffersize: 1
        });
    }

    this.sp.on('error', function(string) {
        if (typeof callback === 'function') {
            callback(string);
        }
    });

    this.sp.on('data', function(data) {
        var byt, cmd;

        if (!board.versionReceived && data[0] !== REPORT_VERSION) {
            return;
        } else {
            board.versionReceived = true;
        }

        for (var i = 0; i < data.length; i++) {
            byt = data[i];
            // we dont want to push 0 as the first byte on our buffer
            if (board.currentBuffer.length === 0 && byt === 0) {
                continue;
            } else {
                board.currentBuffer.push(byt);

                // [START_SYSEX, ... END_SYSEX]
                if (board.currentBuffer[0] === START_SYSEX &&
                    SYSEX_RESPONSE[board.currentBuffer[1]] &&
                    board.currentBuffer[board.currentBuffer.length - 1] === END_SYSEX) {

                    SYSEX_RESPONSE[board.currentBuffer[1]](board);
                    board.currentBuffer.length = 0;
                }

                // Check if data gets out of sync (first byte in buffer must be a valid command if not START_SYSEX)
                else if (board.currentBuffer[0] !== START_SYSEX) {
                    // Identify command on first byte
                    cmd = board.currentBuffer[0] < 240 ? board.currentBuffer[0] & 0xF0 : board.currentBuffer[0];

                    // Check if it is not a valid command
                    if (cmd !== REPORT_VERSION && cmd !== ANALOG_MESSAGE && cmd !== DIGITAL_MESSAGE) {
                        // console.log("OUT OF SYNC - CMD: "+cmd);
                        // Clean buffer
                        board.currentBuffer.length = 0;
                    }
                }

                // There are 3 bytes in the buffer and the first is not START_SYSEX:
                // Might have a MIDI Command
                if (board.currentBuffer.length === 3 && board.currentBuffer[0] !== START_SYSEX) {
                    //commands under 0xF0 we have a multi byte command
                    if (board.currentBuffer[0] < 240) {
                        cmd = board.currentBuffer[0] & 0xF0;
                    } else {
                        cmd = board.currentBuffer[0];
                    }

                    if (MIDI_RESPONSE[cmd]) {
                        MIDI_RESPONSE[cmd](board);
                        board.currentBuffer.length = 0;
                    } else {
                        // A bad serial read must have happened.
                        // Reseting the buffer will allow recovery.
                        board.currentBuffer.length = 0;
                    }
                }
            }
        }
    });
    // if we have not received the version in the timeout  ask for it
    this.reportVersionTimeoutId = setTimeout(function () {
        if (this.versionReceived === false) {
            this.reportVersion(function () {});
            this.queryFirmware(function () {});
        }
    }.bind(this), options.reportVersionTimeout);
    board.once('reportversion', function () {
        clearTimeout(board.reportVersionTimeoutId);
        board.versionReceived = true;
        board.once('queryfirmware', function () {
            if(options.skipCapabilities) {
                board.emit('ready');
                if (typeof callback === 'function') {
                    callback();
                }
                return;
            }
            board.queryCapabilities(function() {
                board.queryAnalogMapping(function() {
                    board.emit('ready');
                    if(typeof callback === 'function') {
                        callback();
                    }
                });
            });
        });
    });
};

util.inherits(Board, events.EventEmitter);

/**
 * Asks the arduino to tell us its version.
 * @param {function} callback A function to be called when the arduino has reported its version.
 */

Board.prototype.reportVersion = function(callback) {
    this.once('reportversion', callback);
    this.sp.write(new Buffer([REPORT_VERSION]));
};

/**
 * Asks the arduino to tell us its firmware version.
 * @param {function} callback A function to be called when the arduino has reported its firmware version.
 */

Board.prototype.queryFirmware = function (callback) {
    this.once('queryfirmware', callback);
    this.sp.write(new Buffer([START_SYSEX, QUERY_FIRMWARE, END_SYSEX]));
};

/**
 * Asks the arduino to read analog data.
 * @param {number} pin The pin to read analog data
 * @param {function} callback A function to call when we have the analag data.
 */

Board.prototype.analogRead = function (pin, callback) {
    this.addListener('analog-read-' + pin, callback);
};

/**
 * Asks the arduino to write an analog message.
 * @param {number} pin The pin to write analog data to.
 * @param {nubmer} value The data to write to the pin between 0 and 255.
 */

Board.prototype.analogWrite = function (pin, value) {
    var data = [];

    this.pins[pin].value = value;

    if (pin > 15) {
        data[0] = START_SYSEX;
        data[1] = EXTENDED_ANALOG;
        data[2] = pin;
        data[3] = value & 0x7F;
        data[4] = (value >> 7) & 0x7F;

        if (value > 0x00004000) {
            data[data.length] = (value >> 14) & 0x7F;
        }

        if (value > 0x00200000) {
            data[data.length] = (value >> 21) & 0x7F;
        }

        if (value > 0x10000000) {
            data[data.length] = (value >> 28) & 0x7F;
        }

        data[data.length] = END_SYSEX;
    } else {
        data.push(ANALOG_MESSAGE | pin, value & 0x7F, (value >> 7) & 0x7F);
    }

    this.sp.write(new Buffer(data));
};

/**
 * Asks the arduino to move a servo
 * @param {number} pin The pin the servo is connected to
 * @param {number} value The degrees to move the servo to.
 */

Board.prototype.servoWrite = function (pin, value) {
    this.analogWrite.apply(this, arguments);
};

/**
 * Asks the arduino to set the pin to a certain mode.
 * @param {number} pin The pin you want to change the mode of.
 * @param {number} mode The mode you want to set. Must be one of board.MODES
 */

Board.prototype.pinMode = function (pin, mode) {
    this.pins[pin].mode = mode;
    this.sp.write(new Buffer([PIN_MODE, pin, mode]));
};

/**
 * Asks the arduino to write a value to a digital pin
 * @param {number} pin The pin you want to write a value to.
 * @param {value} value The value you want to write. Must be board.HIGH or board.LOW
 */

Board.prototype.digitalWrite = function (pin, value) {
    var port = Math.floor(pin / 8);
    var portValue = 0;
    this.pins[pin].value = value;
    for (var i = 0; i < 8; i++) {
        if (this.pins[8 * port + i].value) {
            portValue |= (1 << i);
        }
    }
    this.sp.write(new Buffer([DIGITAL_MESSAGE | port, portValue & 0x7F, (portValue >> 7) & 0x7F]));
};

/**
 * Asks the arduino to read digital data
 * @param {number} pin The pin to read data from
 * @param {function} callback The function to call when data has been received
 */

Board.prototype.digitalRead = function (pin, callback) {
    this.addListener('digital-read-' + pin, callback);
};

/**
 * Asks the arduino to tell us its capabilities
 * @param {function} callback A function to call when we receive the capabilities
 */

Board.prototype.queryCapabilities = function(callback) {
    this.once('capability-query', callback);
    this.sp.write(new Buffer([START_SYSEX, CAPABILITY_QUERY, END_SYSEX]));
};

/**
 * Asks the arduino to tell us its analog pin mapping
 * @param {function} callback A function to call when we receive the pin mappings.
 */

Board.prototype.queryAnalogMapping = function (callback) {
    this.once('analog-mapping-query', callback);
    this.sp.write(new Buffer([START_SYSEX, ANALOG_MAPPING_QUERY, END_SYSEX]));
};

/**
 * Asks the arduino to tell us the current state of a pin
 * @param {number} pin The pin we want to the know the state of
 * @param {function} callback A function to call when we receive the pin state.
 */

Board.prototype.queryPinState = function (pin, callback) {
    this.once('pin-state-' + pin, callback);
    this.sp.write(new Buffer([START_SYSEX, PIN_STATE_QUERY, pin, END_SYSEX]));
};

/**
 * Sends a I2C config request to the arduino board with an optional
 * value in microseconds to delay an I2C Read.  Must be called before
 * an I2C Read or Write
 * @param {number} delay in microseconds to set for I2C Read
 */

Board.prototype.sendI2CConfig = function(delay){
    delay = delay || 0;
    this.sp.write(new Buffer([START_SYSEX,I2C_CONFIG,(delay & 0xFF),((delay >> 8) & 0xFF),END_SYSEX]));
};

/**
 * Sends a string to the arduino
 * @param {String} string to send to the device
 */

Board.prototype.sendString = function(string) {
    var bytes = new Buffer(string + '\0', 'utf8');
    var data = [];
    data.push(START_SYSEX);
    data.push(STRING_DATA);
    for (var i = 0, length = bytes.length; i < length; i++) {
        data.push(bytes[i] & 0x7F);
        data.push((bytes[i] >> 7) & 0x7F);
    }
    data.push(END_SYSEX);
    this.sp.write(data);
};

/**
 * Asks the arduino to send an I2C request to a device
 * @param {number} slaveAddress The address of the I2C device
 * @param {Array} bytes The bytes to send to the device
 */

Board.prototype.sendI2CWriteRequest = function (slaveAddress, bytes) {
    var data = [];
    bytes = bytes || [];
    data.push(START_SYSEX);
    data.push(I2C_REQUEST);
    data.push(slaveAddress);
    data.push(this.I2C_MODES.WRITE << 3);
    for (var i = 0, length = bytes.length; i < length; i++) {
        data.push(bytes[i] & 0x7F);
        data.push((bytes[i] >> 7) & 0x7F);
    }
    data.push(END_SYSEX);
    this.sp.write(new Buffer(data));
};

/**
 * Asks the arduino to request bytes from an I2C device
 * @param {number} slaveAddress The address of the I2C device
 * @param {number} numBytes The number of bytes to receive.
 * @param {function} callback A function to call when we have received the bytes.
 */

Board.prototype.sendI2CReadRequest = function (slaveAddress, numBytes, callback) {
    this.sp.write(new Buffer([START_SYSEX, I2C_REQUEST, slaveAddress, this.I2C_MODES.READ << 3, numBytes & 0x7F, (numBytes >> 7) & 0x7F, END_SYSEX]));
    this.once('I2C-reply-' + slaveAddress, callback);
};

/**
 * Configure the passed pin as the controller in a 1-wire bus.
 * Pass as enableParasiticPower true if you want the data pin to power the bus.
 * @param pin
 * @param enableParasiticPower
 */
Board.prototype.sendOneWireConfig = function(pin, enableParasiticPower) {
    this.sp.write(new Buffer([START_SYSEX, ONEWIRE_DATA, ONEWIRE_CONFIG_REQUEST, pin, enableParasiticPower ? 0x01 : 0x00, END_SYSEX]));
};

/**
 * Searches for 1-wire devices on the bus.  The passed callback should accept
 * and error argument and an array of device identifiers.
 * @param pin
 * @param callback
 */
Board.prototype.sendOneWireSearch = function(pin, callback) {
    this._sendOneWireSearch(ONEWIRE_SEARCH_REQUEST, '1-wire-search-reply-' + pin, pin, callback);
};

/**
 * Searches for 1-wire devices on the bus in an alarmed state.  The passed callback
 * should accept and error argument and an array of device identifiers.
 * @param pin
 * @param callback
 */
Board.prototype.sendOneWireAlarmsSearch = function(pin, callback) {
    this._sendOneWireSearch(ONEWIRE_SEARCH_ALARMS_REQUEST, '1-wire-search-alarms-reply-' + pin, pin, callback);
};

Board.prototype._sendOneWireSearch = function(type, event, pin, callback) {
    this.sp.write(new Buffer([START_SYSEX, ONEWIRE_DATA, type, pin, END_SYSEX]));

    var searchTimeout = setTimeout(function() {
        callback(new Error("1-Wire device search timeout - are you running ConfigurableFirmata?"));
    }, 5000);
    this.once(event, function(devices) {
        clearTimeout(searchTimeout);

        callback(null, devices);
    });
};

/**
 * Reads data from a device on the bus and invokes the passed callback.
 *
 * N.b. ConfigurableFirmata will issue the 1-wire select command internally.
 * @param pin
 * @param device
 * @param numBytesToRead
 * @param callback
 */
Board.prototype.sendOneWireRead = function(pin, device, numBytesToRead, callback) {
    var correlationId = Math.floor(Math.random() * 255);
    var readTimeout = setTimeout(function() {
        callback(new Error("1-Wire device read timeout - are you running ConfigurableFirmata?"));
    }, 5000);
    this._sendOneWireRequest(pin, ONEWIRE_READ_REQUEST_BIT, device, numBytesToRead, correlationId, null, null, '1-wire-read-reply-' + correlationId, function(data) {
        clearTimeout(readTimeout);

        callback(null, data);
    });
};

/**
 * Resets all devices on the bus.
 * @param pin
 */
Board.prototype.sendOneWireReset = function(pin) {
    this._sendOneWireRequest(pin, ONEWIRE_RESET_REQUEST_BIT);
};

/**
 * Writes data to the bus to be received by the passed device.  The device
 * should be obtained from a previous call to sendOneWireSearch.
 *
 * N.b. ConfigurableFirmata will issue the 1-wire select command internally.
 * @param pin
 * @param device
 * @param data
 */
Board.prototype.sendOneWireWrite = function(pin, device, data) {
    this._sendOneWireRequest(pin, ONEWIRE_WRITE_REQUEST_BIT, device, null, null, null, Array.isArray(data) ? data : [data]);
};

/**
 * Tells firmata to not do anything for the passed amount of ms.  For when you
 * need to give a device attached to the bus time to do a calculation.
 * @param pin
 */
Board.prototype.sendOneWireDelay = function(pin, delay) {
    this._sendOneWireRequest(pin, ONEWIRE_DELAY_REQUEST_BIT, null, null, null, delay);
};

/**
 * Sends the passed data to the passed device on the bus, reads the specified
 * number of bytes and invokes the passed callback.
 *
 * N.b. ConfigurableFirmata will issue the 1-wire select command internally.
 * @param pin
 * @param device
 * @param data
 * @param numBytesToRead
 * @param callback
 */
Board.prototype.sendOneWireWriteAndRead = function(pin, device, data, numBytesToRead, callback) {
    var correlationId = Math.floor(Math.random() * 255);
    var readTimeout = setTimeout(function() {
        callback(new Error("1-Wire device read timeout - are you running ConfigurableFirmata?"));
    }, 5000);
    this._sendOneWireRequest(pin, ONEWIRE_WRITE_REQUEST_BIT | ONEWIRE_READ_REQUEST_BIT, device, numBytesToRead, correlationId, null, Array.isArray(data) ? data : [data], '1-wire-read-reply-' + correlationId, function(data) {
        clearTimeout(readTimeout);

        callback(null, data);
    });
};

// see http://firmata.org/wiki/Proposals#OneWire_Proposal
Board.prototype._sendOneWireRequest = function(pin, subcommand, device, numBytesToRead, correlationId, delay, dataToWrite, event, callback) {
    var bytes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    if(device || numBytesToRead || correlationId || delay || dataToWrite) {
        subcommand = subcommand | ONEWIRE_WITHDATA_REQUEST_BITS;
    }

    if(device) {
        bytes.splice.apply(bytes, [0, 8].concat(device));
    }

    if(numBytesToRead) {
        bytes[8] = numBytesToRead & 0xFF;
        bytes[9] = (numBytesToRead >> 8) & 0xFF;
    }

    if(correlationId) {
        bytes[10] = correlationId & 0xFF;
        bytes[11] = (correlationId >> 8) & 0xFF;
    }

    if(delay) {
        bytes[12] = delay & 0xFF;
        bytes[13] = (delay >> 8) & 0xFF;
        bytes[14] = (delay >> 16) & 0xFF;
        bytes[15] = (delay >> 24) & 0xFF;
    }

    if(dataToWrite) {
        dataToWrite.forEach(function(byte) {
            bytes.push(byte);
        });
    }

    var output = [START_SYSEX, ONEWIRE_DATA, subcommand, pin];
    output = output.concat(Encoder7Bit.to7BitArray(bytes));
    output.push(END_SYSEX);

    this.sp.write(new Buffer(output));

    if(event && callback) {
        this.once(event, callback);
    }
};

/**
 * Set sampling interval in millis. Default is 19 ms
 * @param {number} interval The sampling interval in ms > 10
 */

Board.prototype.setSamplingInterval = function (interval) {
    var safeint = interval < 10 ? 10 : (interval > 65535 ? 65535 : interval); // constrained
    this.sp.write(new Buffer([START_SYSEX, SAMPLING_INTERVAL, (safeint & 0xFF),((safeint >> 8) & 0xFF), END_SYSEX]));
};

/**
 * Set reporting on pin
 * @param {number} pin The pin to turn on/off reporting
 * @param {number} value Binary value to turn reporting on/off
 */

Board.prototype.reportAnalogPin = function (pin, value) {
    if(value === 0 || value === 1) {
        this.pins[this.analogPins[pin]].report = value;
        this.sp.write(new Buffer([REPORT_ANALOG | pin, value]));
    }
};

/**
 * Set reporting on pin
 * @param {number} pin The pin to turn on/off reporting
 * @param {number} value Binary value to turn reporting on/off
 */

Board.prototype.reportDigitalPin = function (pin, value) {
    if(value === 0 || value === 1) {
        this.pins[pin].report = value;
        this.sp.write(new Buffer([REPORT_DIGITAL | pin, value]));
    }
};

/**
 *
 *
 */

Board.prototype.pulseIn = function (opts, callback) {
    var pin = opts.pin;
    var value = opts.value;
    var pulseOut = opts.pulseOut || 0;
    var timeout = opts.timeout || 1000000;
    var pulseOutArray = [
        ((pulseOut >> 24) & 0xFF),
        ((pulseOut >> 16) & 0xFF),
        ((pulseOut >> 8) & 0XFF),
        ((pulseOut & 0xFF))
    ];
    var timeoutArray = [
        ((timeout >> 24) & 0xFF),
        ((timeout >> 16) & 0xFF),
        ((timeout >> 8) & 0XFF),
        ((timeout & 0xFF))
    ];
    var data = [
        START_SYSEX,
        PULSE_IN,
        pin,
        value,
        pulseOutArray[0] & 0x7F,
        (pulseOutArray[0] >> 7) & 0x7F,
        pulseOutArray[1] & 0x7F,
        (pulseOutArray[1] >> 7) & 0x7F,
        pulseOutArray[2] & 0x7F,
        (pulseOutArray[2] >> 7) & 0x7F,
        pulseOutArray[3] & 0x7F,
        (pulseOutArray[3] >> 7) & 0x7F,
        timeoutArray[0] & 0x7F,
        (timeoutArray[0] >> 7) & 0x7F,
        timeoutArray[1] & 0x7F,
        (timeoutArray[1] >> 7) & 0x7F,
        timeoutArray[2] & 0x7F,
        (timeoutArray[2] >> 7) & 0x7F,
        timeoutArray[3] & 0x7F,
        (timeoutArray[3] >> 7) & 0x7F,
        END_SYSEX
    ];
    this.sp.write(new Buffer(data));
    this.once('pulse-in-' + pin,callback);
};

/**
 * Stepper functions to support AdvancedFirmata's asynchronous control of stepper motors
 * https://github.com/soundanalogous/AdvancedFirmata
 */

/**
 * Asks the arduino to configure a stepper motor with the given config to allow asynchronous control of the stepper
 * @param {number} deviceNum Device number for the stepper (range 0-5, expects steppers to be setup in order from 0 to 5)
 * @param {number} type One of this.STEPPER.TYPE.*
 * @param {number} stepsPerRev Number of steps motor takes to make one revolution
 * @param {number} dirOrMotor1Pin If using EasyDriver type stepper driver, this is direction pin, otherwise it is motor 1 pin
 * @param {number} stepOrMotor2Pin If using EasyDriver type stepper driver, this is step pin, otherwise it is motor 2 pin
 * @param {number} [motor3Pin] Only required if type == this.STEPPER.TYPE.FOUR_WIRE
 * @param {number} [motor4Pin] Only required if type == this.STEPPER.TYPE.FOUR_WIRE
 */

Board.prototype.stepperConfig = function (deviceNum, type, stepsPerRev, dirOrMotor1Pin, stepOrMotor2Pin, motor3Pin, motor4Pin) {
    var data = [
        START_SYSEX,
        STEPPER,
        0x00,       // STEPPER_CONFIG from firmware
        deviceNum,
        type,
        stepsPerRev & 0x7F,
        (stepsPerRev >> 7) & 0x7F,
        dirOrMotor1Pin,
        stepOrMotor2Pin
    ];
    if(type === this.STEPPER.TYPE.FOUR_WIRE) {
        data.push(motor3Pin, motor4Pin);
    }
    data.push(END_SYSEX);
    this.sp.write(new Buffer(data));
};

/**
 * Asks the arduino to move a stepper a number of steps at a specific speed
 * (and optionally with and acceleration and deceleration)
 * speed is in units of .01 rad/sec
 * accel and decel are in units of .01 rad/sec^2
 * TODO: verify the units of speed, accel, and decel
 * @param {number} deviceNum Device number for the stepper (range 0-5)
 * @param {number} direction One of this.STEPPER.DIRECTION.*
 * @param {number} steps Number of steps to make
 * @param {number} speed
 * @param {number|function} accel Acceleration or if accel and decel are not used, then it can be the callback
 * @param {number} [decel]
 * @param {function} [callback]
 */

Board.prototype.stepperStep = function (deviceNum, direction, steps, speed, accel, decel, callback) {
    if (typeof accel === 'function') {
        callback = accel;
        accel = 0;
        decel = 0;
    }

    var data = [
        START_SYSEX,
        STEPPER,
        0x01,       // STEPPER_STEP from firmware
        deviceNum,
        direction,  // one of this.STEPPER.DIRECTION.*
        steps & 0x7F,
        (steps >> 7) & 0x7F,
        (steps >> 14) & 0x7f,
        speed & 0x7F,
        (speed >> 7) & 0x7F
    ];
    if(accel > 0 || decel > 0) {
        data.push(
            accel & 0x7F,
            (accel >> 7) & 0x7F,
            decel & 0x7F,
            (decel >> 7) & 0x7F
        );
    }
    data.push(END_SYSEX);
    this.sp.write(new Buffer(data));
    this.once('stepper-done-'+deviceNum, callback);
};

/**
 * Send SYSTEM_RESET to arduino
 */

Board.prototype.reset = function () {
    this.sp.write(new Buffer([SYSTEM_RESET]));
};

module.exports = {
    Board: Board,
    SYSEX_RESPONSE: SYSEX_RESPONSE,
    MIDI_RESPONSE: MIDI_RESPONSE
};

}).call(this,require('_process'),require("buffer").Buffer)
},{"./encoder7bit":3,"./onewireutils":5,"_process":131,"browser-serialport":6,"buffer":104,"events":122,"serialport":21,"util":151}],5:[function(require,module,exports){
var Encoder7Bit = require('./encoder7bit');

OneWireUtils = {
    crc8: function(data) {
        var crc = 0;

        for(var i = 0; i < data.length; i++) {
            var inbyte = data[i];

            for (var n = 8; n; n--) {
                var mix = (crc ^ inbyte) & 0x01;
                crc >>= 1;

                if (mix) {
                    crc ^= 0x8C;
                }

                inbyte >>= 1;
            }
        }
        return crc;
    },

    readDevices: function(data) {
        var deviceBytes = Encoder7Bit.from7BitArray(data);
        var devices = [];

        for(var i = 0; i < deviceBytes.length; i += 8) {
            var device = deviceBytes.slice(i, i + 8);

			if(device.length != 8) {
				continue;
			}

            var check = OneWireUtils.crc8(device.slice(0, 7));

            if(check != device[7]) {
                console.error("ROM invalid!");
            }

            devices.push(device);
        }

        return devices;
    }
};

module.exports = OneWireUtils;

},{"./encoder7bit":3}],6:[function(require,module,exports){
"use strict";

function SerialPort(path, options, openImmediately) {
	console.log("SerialPort constructed.");

	this.comName = path;

	if (options) {
		for (var key in this.options) {
			//console.log("Looking for " + key + " option.");
			if (options[key] != undefined) {
				//console.log("Replacing " + key + " with " + options[key]);
				this.options[key] = options[key];
			}
		}
	}

	if (typeof chrome != "undefined" && chrome.serial) {
		var self = this;

		if (openImmediately != false) {
			this.open();
		}

	} else {
		throw "No access to serial ports. Try loading as a Chrome Application.";
	}
}

SerialPort.prototype.options = {
    baudrate: 57600,
    buffersize: 1
};

SerialPort.prototype.connectionId = -1;

SerialPort.prototype.comName = "";

SerialPort.prototype.eventListeners = {};

SerialPort.prototype.open = function (callback) {
	console.log("Opening ", this.comName);
	chrome.serial.connect(this.comName, {bitrate: parseInt(this.options.baudrate)}, this.proxy('onOpen', callback));
};

SerialPort.prototype.onOpen = function (callback, openInfo) {
	console.log("onOpen", callback, openInfo);
	this.connectionId = openInfo.connectionId;
	if (this.connectionId == -1) {
		this.publishEvent("error", "Could not open port.");
		return;
	}

	this.publishEvent("open", openInfo);


	console.log('Connected to port.', this.connectionId);

	typeof callback == "function" && callback(openInfo);

	chrome.serial.onReceive.addListener(this.proxy('onRead'));

};

SerialPort.prototype.onRead = function (readInfo) {
	if (readInfo && this.connectionId == readInfo.connectionId) {

		var uint8View = new Uint8Array(readInfo.data);
		var string = "";
		for (var i = 0; i < readInfo.data.byteLength; i++) {
			string += String.fromCharCode(uint8View[i]);
		}

		//console.log("Got data", string, readInfo.data);

		//Maybe this should be a Buffer()
		this.publishEvent("data", uint8View);
		this.publishEvent("dataString", string);
	}
}

SerialPort.prototype.write = function (buffer, callback) {
	if (typeof callback != "function") { callback = function() {}; }

	//Make sure its not a browserify faux Buffer.
	if (buffer instanceof ArrayBuffer == false) {
		buffer = buffer2ArrayBuffer(buffer);
	}

	chrome.serial.send(this.connectionId, buffer, callback);
};

SerialPort.prototype.writeString = function (string, callback) {
	this.write(str2ab(string), callback);
};

SerialPort.prototype.close = function (callback) {
	chrome.serial.close(this.connectionId, this.proxy('onClose', callback));
};

SerialPort.prototype.onClose = function (callback) {
	this.connectionId = -1;
	console.log("Closed port", arguments);
	this.publishEvent("close");
	typeof callback == "function" && callback(openInfo);
};

SerialPort.prototype.flush = function (callback) {

};

//Expecting: data, error
SerialPort.prototype.on = function (eventName, callback) {
	if (this.eventListeners[eventName] == undefined) {
		this.eventListeners[eventName] = [];
	}
	if (typeof callback == "function") {
		this.eventListeners[eventName].push(callback);
	} else {
		throw "can not subscribe with a non function callback";
	}
}

SerialPort.prototype.publishEvent = function (eventName, data) {
	if (this.eventListeners[eventName] != undefined) {
		for (var i = 0; i < this.eventListeners[eventName].length; i++) {
			this.eventListeners[eventName][i](data);
		}
	}
}

SerialPort.prototype.proxy = function () {
	var self = this;
	var proxyArgs = [];

	//arguments isnt actually an array.
	for (var i = 0; i < arguments.length; i++) {
	    proxyArgs[i] = arguments[i];
	}

	var functionName = proxyArgs.splice(0, 1)[0];

	var func = function() {
		var funcArgs = [];
		for (var i = 0; i < arguments.length; i++) {
		    funcArgs[i] = arguments[i];
		}
		var allArgs = proxyArgs.concat(funcArgs);

		self[functionName].apply(self, allArgs);
	}

	return func;
}

function SerialPortList(callback) {
	if (typeof chrome != "undefined" && chrome.serial) {
		chrome.serial.getDevices(function(ports) {
			var portObjects = Array(ports.length);
			for (var i = 0; i < ports.length; i++) {
				portObjects[i] = new SerialPort(ports[i].path, null, false);
			}
			callback(null, portObjects);
		});
	} else {
		callback("No access to serial ports. Try loading as a Chrome Application.", null);
	}
};

// Convert string to ArrayBuffer
function str2ab(str) {
	var buf = new ArrayBuffer(str.length);
	var bufView = new Uint8Array(buf);
	for (var i = 0; i < str.length; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

// Convert buffer to ArrayBuffer
function buffer2ArrayBuffer(buffer) {
	var buf = new ArrayBuffer(buffer.length);
	var bufView = new Uint8Array(buf);
	for (var i = 0; i < buffer.length; i++) {
		bufView[i] = buffer[i];
	}
	return buf;
}

module.exports = {
	SerialPort: SerialPort,
	list: SerialPortList,
	used: [] //TODO: Populate this somewhere.
};

},{}],7:[function(require,module,exports){
(function (process){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };
    
    async.priorityQueue = function (worker, concurrency) {
        
        function _compareTasks(a, b){
          return a.priority - b.priority;
        };
        
        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }
        
        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };
              
              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }
        
        // Start with a normal queue
        var q = async.queue(worker, concurrency);
        
        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };
        
        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'))
},{"_process":131}],8:[function(require,module,exports){
(function (process,__dirname){

/**
 * Module exports.
 */

module.exports = exports;

/**
 * Module dependencies.
 */

var fs = require('fs')
  , path = require('path')
  , nopt = require('nopt')
  , log = require('npmlog')
  , child_process = require('child_process')
  , EE = require('events').EventEmitter
  , inherits = require('util').inherits
  , commands = [
      'clean',
      'install',
      'reinstall',
      'build',
      'rebuild',
      'package',
      'testpackage',
      'publish',
      'unpublish',
      'info',
      'testbinary'
    ]
  , aliases = {
    }

// differentiate node-pre-gyp's logs from npm's
log.heading = 'node-pre-gyp'

exports.find = require('./pre-binding').find;

function Run() {
  var self = this

  this.commands = {}

  commands.forEach(function (command) {
    self.commands[command] = function (argv, callback) {
      log.verbose('command', command, argv)
      return require('./' + command)(self, argv, callback)
    }
  })
}
inherits(Run, EE)
exports.Run = Run
var proto = Run.prototype

/**
 * Export the contents of the package.json.
 */

proto.package = require('../package')

/**
 * nopt configuration definitions
 */

proto.configDefs = {
    help: Boolean     // everywhere
  , arch: String      // 'configure'
  , debug: Boolean    // 'build'
  , directory: String // bin
  , proxy: String     // 'install'
  , loglevel: String  // everywhere
}

/**
 * nopt shorthands
 */

proto.shorthands = {
    release: '--no-debug'
  , C: '--directory'
  , debug: '--debug'
  , j: '--jobs'
  , silly: '--loglevel=silly'
  , verbose: '--loglevel=verbose'
}

/**
 * expose the command aliases for the bin file to use.
 */

proto.aliases = aliases

/**
 * Parses the given argv array and sets the 'opts',
 * 'argv' and 'command' properties.
 */

proto.parseArgv = function parseOpts (argv) {
  this.opts = nopt(this.configDefs, this.shorthands, argv)
  this.argv = this.opts.argv.remain.slice()

  var commands = this.todo = []

  // create a copy of the argv array with aliases mapped
  argv = this.argv.map(function (arg) {
    // is this an alias?
    if (arg in this.aliases) {
      arg = this.aliases[arg]
    }
    return arg
  }, this)

  // process the mapped args into "command" objects ("name" and "args" props)
  argv.slice().forEach(function (arg) {
    if (arg in this.commands) {
      var args = argv.splice(0, argv.indexOf(arg))
      argv.shift()
      if (commands.length > 0) {
        commands[commands.length - 1].args = args
      }
      commands.push({ name: arg, args: [] })
    }
  }, this)
  if (commands.length > 0) {
    commands[commands.length - 1].args = argv.splice(0)
  }

  // support for inheriting config env variables from npm
  var npm_config_prefix = 'npm_config_'
  Object.keys(process.env).forEach(function (name) {
    if (name.indexOf(npm_config_prefix) !== 0) return
    var val = process.env[name]
    if (name === npm_config_prefix + 'loglevel') {
      log.level = val
    } else {
      // add the user-defined options to the config
      name = name.substring(npm_config_prefix.length)
      // avoid npm argv clobber already present args
      // which avoids problem of 'npm test' calling
      // script that runs unique npm install commands
      if (name === 'argv') {
         if (this.opts.argv &&
             this.opts.argv.remain &&
             this.opts.argv.remain.length) {
            // do nothing
         } else {
            this.opts[name] = val
         }
      } else {
        this.opts[name] = val
      }
    }
  }, this)

  if (this.opts.loglevel) {
    log.level = this.opts.loglevel
  }
  log.resume()
}

/**
 * Returns the usage instructions for node-pre-gyp.
 */

proto.usage = function usage () {
  var str = [
      ''
    , '  Usage: node-pre-gyp <command> [options]'
    , ''
    , '  where <command> is one of:'
    , commands.map(function (c) {
        return '    - ' + c + ' - ' + require('./' + c).usage
      }).join('\n')
    , ''
    , 'node-pre-gyp@' + this.version + '  ' + path.resolve(__dirname, '..')
    , 'node@' + process.versions.node
  ].join('\n')
  return str
}

/**
 * Version number getter.
 */

Object.defineProperty(proto, 'version', {
    get: function () {
      return this.package.version
    }
  , enumerable: true
})


}).call(this,require('_process'),"/node_modules/cylon-firmata/node_modules/firmata/node_modules/serialport/node_modules/node-pre-gyp/lib")
},{"../package":19,"./pre-binding":9,"_process":131,"child_process":101,"events":122,"fs":101,"nopt":13,"npmlog":15,"path":130,"util":151}],9:[function(require,module,exports){
var fs = require('fs');
var versioning = require('../lib/util/versioning.js')
var existsSync = require('fs').existsSync || require('path').existsSync;
var path = require('path');

module.exports = exports;

exports.usage = 'Finds the require path for the node-pre-gyp installed module'

exports.validate = function(package_json) {
    versioning.validate_config(package_json);
}

exports.find = function(package_json_path,opts) {
   if (!existsSync(package_json_path)) {
        throw new Error("package.json does not exist at " + package_json_path);
   }
   var package_json = require(package_json_path);
   versioning.validate_config(package_json);
   opts = opts || {};
   if (!opts.module_root) opts.module_root = path.dirname(package_json_path);
   var meta = versioning.evaluate(package_json,opts);
   return path.join(meta.module_path,meta.module_name + '.node');
}

},{"../lib/util/versioning.js":12,"fs":101,"path":130}],10:[function(require,module,exports){
module.exports={
  "0.6.3": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.4": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.5": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.6": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.7": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.8": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.9": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.10": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.11": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.12": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.13": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.14": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.15": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.16": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.17": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.18": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.19": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.20": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.6.21": {
    "node_abi": 1,
    "v8": "3.6"
  },
  "0.7.0": {
    "node_abi": 1,
    "v8": "3.8"
  },
  "0.7.1": {
    "node_abi": 1,
    "v8": "3.8"
  },
  "0.7.2": {
    "node_abi": 1,
    "v8": "3.8"
  },
  "0.7.3": {
    "node_abi": 1,
    "v8": "3.9"
  },
  "0.7.4": {
    "node_abi": 1,
    "v8": "3.9"
  },
  "0.7.5": {
    "node_abi": 1,
    "v8": "3.9"
  },
  "0.7.6": {
    "node_abi": 1,
    "v8": "3.9"
  },
  "0.7.7": {
    "node_abi": 1,
    "v8": "3.9"
  },
  "0.7.8": {
    "node_abi": 1,
    "v8": "3.9"
  },
  "0.7.9": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.7.10": {
    "node_abi": 1,
    "v8": "3.9"
  },
  "0.7.11": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.7.12": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.0": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.1": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.2": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.3": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.4": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.5": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.6": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.7": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.8": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.9": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.10": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.11": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.12": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.13": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.14": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.15": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.16": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.17": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.18": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.19": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.20": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.21": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.22": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.23": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.24": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.25": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.8.26": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.9.0": {
    "node_abi": 1,
    "v8": "3.11"
  },
  "0.9.1": {
    "node_abi": 10,
    "v8": "3.11"
  },
  "0.9.2": {
    "node_abi": 10,
    "v8": "3.11"
  },
  "0.9.3": {
    "node_abi": 10,
    "v8": "3.13"
  },
  "0.9.4": {
    "node_abi": 10,
    "v8": "3.13"
  },
  "0.9.5": {
    "node_abi": 10,
    "v8": "3.13"
  },
  "0.9.6": {
    "node_abi": 10,
    "v8": "3.15"
  },
  "0.9.7": {
    "node_abi": 10,
    "v8": "3.15"
  },
  "0.9.8": {
    "node_abi": 10,
    "v8": "3.15"
  },
  "0.9.9": {
    "node_abi": 11,
    "v8": "3.15"
  },
  "0.9.10": {
    "node_abi": 11,
    "v8": "3.15"
  },
  "0.9.11": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.9.12": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.0": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.1": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.2": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.3": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.4": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.5": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.6": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.7": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.8": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.9": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.10": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.11": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.12": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.13": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.14": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.15": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.16": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.17": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.18": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.19": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.20": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.21": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.22": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.23": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.24": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.25": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.26": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.27": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.28": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.10.29": {
    "node_abi": 11,
    "v8": "3.14"
  },
  "0.11.0": {
    "node_abi": 12,
    "v8": "3.17"
  },
  "0.11.1": {
    "node_abi": 12,
    "v8": "3.18"
  },
  "0.11.2": {
    "node_abi": 12,
    "v8": "3.19"
  },
  "0.11.3": {
    "node_abi": 12,
    "v8": "3.19"
  },
  "0.11.4": {
    "node_abi": 12,
    "v8": "3.20"
  },
  "0.11.5": {
    "node_abi": 12,
    "v8": "3.20"
  },
  "0.11.6": {
    "node_abi": 12,
    "v8": "3.20"
  },
  "0.11.7": {
    "node_abi": 12,
    "v8": "3.20"
  },
  "0.11.8": {
    "node_abi": 13,
    "v8": "3.21"
  },
  "0.11.9": {
    "node_abi": 13,
    "v8": "3.22"
  },
  "0.11.10": {
    "node_abi": 13,
    "v8": "3.22"
  },
  "0.11.11": {
    "node_abi": 14,
    "v8": "3.22"
  },
  "0.11.12": {
    "node_abi": 14,
    "v8": "3.22"
  },
  "0.11.13": {
    "node_abi": 14,
    "v8": "3.25"
  }
}

},{}],11:[function(require,module,exports){
module.exports={
  "0.10.0": "0.11.13",
  "0.10.0-rc1": "0.11.13",
  "0.9.2": "0.11.9",
  "0.9.1": "0.11.9",
  "0.9.0": "0.11.9",
  "0.8.6": "0.10.22",
  "0.8.5": "0.10.22",
  "0.8.4": "0.10.22",
  "0.8.3": "0.10.22",
  "0.8.2": "0.10.22",
  "0.8.1": "0.10.22",
  "0.8.0": "0.10.18",
  "0.7.5": "0.10.18",
  "0.7.4": "0.10.18",
  "0.7.3": "0.10.18",
  "0.7.2": "0.10.12",
  "0.7.1": "0.10.12",
  "0.7.0": "0.10.12",
  "0.6.3": "0.10.12",
  "0.6.2": "0.10.12",
  "0.6.1": "0.10.5",
  "0.6.0": "0.10.5",
  "0.5.1": "0.10.5",
  "0.5.0": "0.8.17",
  "0.4.2": "0.8.17"
}

},{}],12:[function(require,module,exports){
(function (process){

module.exports = exports;

var path = require('path')
  , semver = require('semver')
  , url = require('url')
  , abi_crosswalk = require('./abi_crosswalk.json')
  , nw_crosswalk = require('./nw_crosswalk.json')


function get_node_abi(runtime, target) {
    if (target) {
        // abi_crosswalk generated with ./scripts/abi_crosswalk.js
        var abi = '';
        if (runtime === 'node-webkit') {
            var node_version = nw_crosswalk[target];
            if (!node_version) {
                throw new Error("node-webkit version '"+target+"' not supported");
            }
            abi = abi_crosswalk[node_version].node_abi;
        } else {
            if (abi_crosswalk[target]) {
                abi = abi_crosswalk[target].node_abi;
            }
        }
        if (!abi) {
            throw new Error("Unsupported target version: " + target);
        }
        if (abi > 1) {
            return runtime+'-v' + (+abi);
        } else {
            // no support for node-webkit unless > 0.10.x
            if (runtime != 'node') {
                throw new Error("Runtime '" + runtime + "' unsupported for target version: " + target);
            }
            if (!abi_crosswalk[target]) {
                throw new Error("Unsupported target version: " + target);
            }
            abi = abi_crosswalk[target].v8;
            return 'v8-' + abi;
        }
    } else {
        // process.versions.modules added in >= v0.10.4 and v0.11.7
        // https://github.com/joyent/node/commit/ccabd4a6fa8a6eb79d29bc3bbe9fe2b6531c2d8e
        return process.versions.modules ? runtime+'-v' + (+process.versions.modules) :
               'v8-' + process.versions.v8.split('.').slice(0,2).join('.');
    }
}

var required_parameters = [
    'module_name',
    'module_path',
    'host'
];

function validate_config(package_json,callback) {
    var msg = package_json.name + ' package.json is not node-pre-gyp ready:\n';
    var missing = [];
    if (!package_json.main) {
        missing.push('main');
    }
    if (!package_json.name) {
        missing.push('name');
    }
    if (!package_json.binary) {
        missing.push('binary');
    }
    var o = package_json.binary;
    required_parameters.forEach(function(p) {
        if (missing.indexOf('binary') > -1) {
            missing.pop('binary');
        }
        if (!o || o[p] == undefined) {
            missing.push('binary.' + p);
        }
    });
    if (missing.length >= 1) {
        throw new Error(msg+"package.json must declare these properties: \n" + missing.join('\n'));
    }
    if (o) {
        // enforce https over http
        var protocol = url.parse(o.host).protocol;
        if (protocol === 'http:') {
            throw new Error("'host' protocol ("+protocol+") is invalid - only 'https:' is accepted");
        }
    }
};

module.exports.validate_config = validate_config;

function eval_template(template,opts) {
    Object.keys(opts).forEach(function(key) {
        var pattern = '{'+key+'}';
        while (template.indexOf(pattern) > -1) {
            template = template.replace(pattern,opts[key]);
        }
    });
    return template;
}

// url.resolve needs single trailing slash
// to behave correctly, otherwise a double slash
// may end up in the url which breaks requests
// and a lacking slash may not lead to proper joining
function add_trailing_slash(pathname) {
    if (pathname.slice(-1) != '/') {
        return pathname + '/';
    }
    return pathname;
}

var default_package_name = '{module_name}-v{version}-{node_abi}-{platform}-{arch}.tar.gz';
var default_remote_path = '';

module.exports.evaluate = function(package_json,options) {
    options = options || {};
    validate_config(package_json);
    var v = package_json.version;
    var module_version = semver.parse(v);
    var runtime = options.runtime || (process.versions['node-webkit'] ? 'node-webkit' : 'node');
    options.debug = Boolean(options.debug);
    var opts = {
          name: package_json.name
        , configuration: options.debug ? 'Debug' : 'Release'
        , debug: options.debug
        , module_name: package_json.binary.module_name
        , version: module_version.version
        , prerelease: module_version.prerelease.length ? v.slice(v.indexOf(module_version.prerelease[0])) : ''
        , major: module_version.major
        , minor: module_version.minor
        , patch: module_version.patch
        , runtime: runtime
        , node_abi: get_node_abi(runtime,options.target)
        , target: options.target || ''
        , platform: options.target_platform || process.platform
        , target_platform: options.target_platform || process.platform
        , arch: options.target_arch || process.arch
        , target_arch: options.target_arch || process.arch
        , module_main: package_json.main
    }
    opts.host = add_trailing_slash(eval_template(package_json.binary.host,opts));
    opts.module_path = eval_template(package_json.binary.module_path,opts);
    // now we resolve the module_path to ensure it is absolute so that binding.gyp variables work predictably
    if (options.module_root) {
        // resolve relative to known module root: works for pre-binding require
        opts.module_path = path.join(options.module_root,opts.module_path);
    } else {
        // resolve relative to current working directory: works for node-pre-gyp commands
        opts.module_path = path.resolve(opts.module_path);
    }
    opts.remote_path = package_json.binary.remote_path ? add_trailing_slash(eval_template(package_json.binary.remote_path,opts)) : default_remote_path;
    var package_name = package_json.binary.package_name ? package_json.binary.package_name : default_package_name;
    opts.package_name = eval_template(package_name,opts);
    opts.staged_tarball = path.join('build/stage',opts.remote_path,opts.package_name);
    opts.hosted_path = url.resolve(opts.host,opts.remote_path);
    opts.hosted_tarball = url.resolve(opts.hosted_path,opts.package_name);
    return opts;
}

}).call(this,require('_process'))
},{"./abi_crosswalk.json":10,"./nw_crosswalk.json":11,"_process":131,"path":130,"semver":18,"url":149}],13:[function(require,module,exports){
(function (process){
// info about each config option.

var debug = process.env.DEBUG_NOPT || process.env.NOPT_DEBUG
  ? function () { console.error.apply(console, arguments) }
  : function () {}

var url = require("url")
  , path = require("path")
  , Stream = require("stream").Stream
  , abbrev = require("abbrev")

module.exports = exports = nopt
exports.clean = clean

exports.typeDefs =
  { String  : { type: String,  validate: validateString  }
  , Boolean : { type: Boolean, validate: validateBoolean }
  , url     : { type: url,     validate: validateUrl     }
  , Number  : { type: Number,  validate: validateNumber  }
  , path    : { type: path,    validate: validatePath    }
  , Stream  : { type: Stream,  validate: validateStream  }
  , Date    : { type: Date,    validate: validateDate    }
  }

function nopt (types, shorthands, args, slice) {
  args = args || process.argv
  types = types || {}
  shorthands = shorthands || {}
  if (typeof slice !== "number") slice = 2

  debug(types, shorthands, args, slice)

  args = args.slice(slice)
  var data = {}
    , key
    , remain = []
    , cooked = args
    , original = args.slice(0)

  parse(args, data, remain, types, shorthands)
  // now data is full
  clean(data, types, exports.typeDefs)
  data.argv = {remain:remain,cooked:cooked,original:original}
  Object.defineProperty(data.argv, 'toString', { value: function () {
    return this.original.map(JSON.stringify).join(" ")
  }, enumerable: false })
  return data
}

function clean (data, types, typeDefs) {
  typeDefs = typeDefs || exports.typeDefs
  var remove = {}
    , typeDefault = [false, true, null, String, Number, Array]

  Object.keys(data).forEach(function (k) {
    if (k === "argv") return
    var val = data[k]
      , isArray = Array.isArray(val)
      , type = types[k]
    if (!isArray) val = [val]
    if (!type) type = typeDefault
    if (type === Array) type = typeDefault.concat(Array)
    if (!Array.isArray(type)) type = [type]

    debug("val=%j", val)
    debug("types=", type)
    val = val.map(function (val) {
      // if it's an unknown value, then parse false/true/null/numbers/dates
      if (typeof val === "string") {
        debug("string %j", val)
        val = val.trim()
        if ((val === "null" && ~type.indexOf(null))
            || (val === "true" &&
               (~type.indexOf(true) || ~type.indexOf(Boolean)))
            || (val === "false" &&
               (~type.indexOf(false) || ~type.indexOf(Boolean)))) {
          val = JSON.parse(val)
          debug("jsonable %j", val)
        } else if (~type.indexOf(Number) && !isNaN(val)) {
          debug("convert to number", val)
          val = +val
        } else if (~type.indexOf(Date) && !isNaN(Date.parse(val))) {
          debug("convert to date", val)
          val = new Date(val)
        }
      }

      if (!types.hasOwnProperty(k)) {
        return val
      }

      // allow `--no-blah` to set 'blah' to null if null is allowed
      if (val === false && ~type.indexOf(null) &&
          !(~type.indexOf(false) || ~type.indexOf(Boolean))) {
        val = null
      }

      var d = {}
      d[k] = val
      debug("prevalidated val", d, val, types[k])
      if (!validate(d, k, val, types[k], typeDefs)) {
        if (exports.invalidHandler) {
          exports.invalidHandler(k, val, types[k], data)
        } else if (exports.invalidHandler !== false) {
          debug("invalid: "+k+"="+val, types[k])
        }
        return remove
      }
      debug("validated val", d, val, types[k])
      return d[k]
    }).filter(function (val) { return val !== remove })

    if (!val.length) delete data[k]
    else if (isArray) {
      debug(isArray, data[k], val)
      data[k] = val
    } else data[k] = val[0]

    debug("k=%s val=%j", k, val, data[k])
  })
}

function validateString (data, k, val) {
  data[k] = String(val)
}

function validatePath (data, k, val) {
  if (val === true) return false
  val = String(val)
  var homePattern = process.platform === 'win32' ? /^~(\/|\\)/ : /^~\//
  if (val.match(homePattern) && process.env.HOME) {
    val = path.resolve(process.env.HOME, val.substr(2))
  }
  data[k] = path.resolve(String(val))
  return true
}

function validateNumber (data, k, val) {
  debug("validate Number %j %j %j", k, val, isNaN(val))
  if (isNaN(val)) return false
  data[k] = +val
}

function validateDate (data, k, val) {
  debug("validate Date %j %j %j", k, val, Date.parse(val))
  var s = Date.parse(val)
  if (isNaN(s)) return false
  data[k] = new Date(val)
}

function validateBoolean (data, k, val) {
  if (val instanceof Boolean) val = val.valueOf()
  else if (typeof val === "string") {
    if (!isNaN(val)) val = !!(+val)
    else if (val === "null" || val === "false") val = false
    else val = true
  } else val = !!val
  data[k] = val
}

function validateUrl (data, k, val) {
  val = url.parse(String(val))
  if (!val.host) return false
  data[k] = val.href
}

function validateStream (data, k, val) {
  if (!(val instanceof Stream)) return false
  data[k] = val
}

function validate (data, k, val, type, typeDefs) {
  // arrays are lists of types.
  if (Array.isArray(type)) {
    for (var i = 0, l = type.length; i < l; i ++) {
      if (type[i] === Array) continue
      if (validate(data, k, val, type[i], typeDefs)) return true
    }
    delete data[k]
    return false
  }

  // an array of anything?
  if (type === Array) return true

  // NaN is poisonous.  Means that something is not allowed.
  if (type !== type) {
    debug("Poison NaN", k, val, type)
    delete data[k]
    return false
  }

  // explicit list of values
  if (val === type) {
    debug("Explicitly allowed %j", val)
    // if (isArray) (data[k] = data[k] || []).push(val)
    // else data[k] = val
    data[k] = val
    return true
  }

  // now go through the list of typeDefs, validate against each one.
  var ok = false
    , types = Object.keys(typeDefs)
  for (var i = 0, l = types.length; i < l; i ++) {
    debug("test type %j %j %j", k, val, types[i])
    var t = typeDefs[types[i]]
    if (t && type === t.type) {
      var d = {}
      ok = false !== t.validate(d, k, val)
      val = d[k]
      if (ok) {
        // if (isArray) (data[k] = data[k] || []).push(val)
        // else data[k] = val
        data[k] = val
        break
      }
    }
  }
  debug("OK? %j (%j %j %j)", ok, k, val, types[i])

  if (!ok) delete data[k]
  return ok
}

function parse (args, data, remain, types, shorthands) {
  debug("parse", args, data, remain)

  var key = null
    , abbrevs = abbrev(Object.keys(types))
    , shortAbbr = abbrev(Object.keys(shorthands))

  for (var i = 0; i < args.length; i ++) {
    var arg = args[i]
    debug("arg", arg)

    if (arg.match(/^-{2,}$/)) {
      // done with keys.
      // the rest are args.
      remain.push.apply(remain, args.slice(i + 1))
      args[i] = "--"
      break
    }
    var hadEq = false
    if (arg.charAt(0) === "-" && arg.length > 1) {
      if (arg.indexOf("=") !== -1) {
        hadEq = true
        var v = arg.split("=")
        arg = v.shift()
        v = v.join("=")
        args.splice.apply(args, [i, 1].concat([arg, v]))
      }

      // see if it's a shorthand
      // if so, splice and back up to re-parse it.
      var shRes = resolveShort(arg, shorthands, shortAbbr, abbrevs)
      debug("arg=%j shRes=%j", arg, shRes)
      if (shRes) {
        debug(arg, shRes)
        args.splice.apply(args, [i, 1].concat(shRes))
        if (arg !== shRes[0]) {
          i --
          continue
        }
      }
      arg = arg.replace(/^-+/, "")
      var no = null
      while (arg.toLowerCase().indexOf("no-") === 0) {
        no = !no
        arg = arg.substr(3)
      }

      if (abbrevs[arg]) arg = abbrevs[arg]

      var isArray = types[arg] === Array ||
        Array.isArray(types[arg]) && types[arg].indexOf(Array) !== -1

      // allow unknown things to be arrays if specified multiple times.
      if (!types.hasOwnProperty(arg) && data.hasOwnProperty(arg)) {
        if (!Array.isArray(data[arg]))
          data[arg] = [data[arg]]
        isArray = true
      }

      var val
        , la = args[i + 1]

      var isBool = typeof no === 'boolean' ||
        types[arg] === Boolean ||
        Array.isArray(types[arg]) && types[arg].indexOf(Boolean) !== -1 ||
        (typeof types[arg] === 'undefined' && !hadEq) ||
        (la === "false" &&
         (types[arg] === null ||
          Array.isArray(types[arg]) && ~types[arg].indexOf(null)))

      if (isBool) {
        // just set and move along
        val = !no
        // however, also support --bool true or --bool false
        if (la === "true" || la === "false") {
          val = JSON.parse(la)
          la = null
          if (no) val = !val
          i ++
        }

        // also support "foo":[Boolean, "bar"] and "--foo bar"
        if (Array.isArray(types[arg]) && la) {
          if (~types[arg].indexOf(la)) {
            // an explicit type
            val = la
            i ++
          } else if ( la === "null" && ~types[arg].indexOf(null) ) {
            // null allowed
            val = null
            i ++
          } else if ( !la.match(/^-{2,}[^-]/) &&
                      !isNaN(la) &&
                      ~types[arg].indexOf(Number) ) {
            // number
            val = +la
            i ++
          } else if ( !la.match(/^-[^-]/) && ~types[arg].indexOf(String) ) {
            // string
            val = la
            i ++
          }
        }

        if (isArray) (data[arg] = data[arg] || []).push(val)
        else data[arg] = val

        continue
      }

      if (types[arg] === String && la === undefined)
        la = ""

      if (la && la.match(/^-{2,}$/)) {
        la = undefined
        i --
      }

      val = la === undefined ? true : la
      if (isArray) (data[arg] = data[arg] || []).push(val)
      else data[arg] = val

      i ++
      continue
    }
    remain.push(arg)
  }
}

function resolveShort (arg, shorthands, shortAbbr, abbrevs) {
  // handle single-char shorthands glommed together, like
  // npm ls -glp, but only if there is one dash, and only if
  // all of the chars are single-char shorthands, and it's
  // not a match to some other abbrev.
  arg = arg.replace(/^-+/, '')

  // if it's an exact known option, then don't go any further
  if (abbrevs[arg] === arg)
    return null

  // if it's an exact known shortopt, same deal
  if (shorthands[arg]) {
    // make it an array, if it's a list of words
    if (shorthands[arg] && !Array.isArray(shorthands[arg]))
      shorthands[arg] = shorthands[arg].split(/\s+/)

    return shorthands[arg]
  }

  // first check to see if this arg is a set of single-char shorthands
  var singles = shorthands.___singles
  if (!singles) {
    singles = Object.keys(shorthands).filter(function (s) {
      return s.length === 1
    }).reduce(function (l,r) {
      l[r] = true
      return l
    }, {})
    shorthands.___singles = singles
    debug('shorthand singles', singles)
  }

  var chrs = arg.split("").filter(function (c) {
    return singles[c]
  })

  if (chrs.join("") === arg) return chrs.map(function (c) {
    return shorthands[c]
  }).reduce(function (l, r) {
    return l.concat(r)
  }, [])


  // if it's an arg abbrev, and not a literal shorthand, then prefer the arg
  if (abbrevs[arg] && !shorthands[arg])
    return null

  // if it's an abbr for a shorthand, then use that
  if (shortAbbr[arg])
    arg = shortAbbr[arg]

  // make it an array, if it's a list of words
  if (shorthands[arg] && !Array.isArray(shorthands[arg]))
    shorthands[arg] = shorthands[arg].split(/\s+/)

  return shorthands[arg]
}

}).call(this,require('_process'))
},{"_process":131,"abbrev":14,"path":130,"stream":147,"url":149}],14:[function(require,module,exports){

module.exports = exports = abbrev.abbrev = abbrev

abbrev.monkeyPatch = monkeyPatch

function monkeyPatch () {
  Object.defineProperty(Array.prototype, 'abbrev', {
    value: function () { return abbrev(this) },
    enumerable: false, configurable: true, writable: true
  })

  Object.defineProperty(Object.prototype, 'abbrev', {
    value: function () { return abbrev(Object.keys(this)) },
    enumerable: false, configurable: true, writable: true
  })
}

function abbrev (list) {
  if (arguments.length !== 1 || !Array.isArray(list)) {
    list = Array.prototype.slice.call(arguments, 0)
  }
  for (var i = 0, l = list.length, args = [] ; i < l ; i ++) {
    args[i] = typeof list[i] === "string" ? list[i] : String(list[i])
  }

  // sort them lexicographically, so that they're next to their nearest kin
  args = args.sort(lexSort)

  // walk through each, seeing how much it has in common with the next and previous
  var abbrevs = {}
    , prev = ""
  for (var i = 0, l = args.length ; i < l ; i ++) {
    var current = args[i]
      , next = args[i + 1] || ""
      , nextMatches = true
      , prevMatches = true
    if (current === next) continue
    for (var j = 0, cl = current.length ; j < cl ; j ++) {
      var curChar = current.charAt(j)
      nextMatches = nextMatches && curChar === next.charAt(j)
      prevMatches = prevMatches && curChar === prev.charAt(j)
      if (!nextMatches && !prevMatches) {
        j ++
        break
      }
    }
    prev = current
    if (j === cl) {
      abbrevs[current] = current
      continue
    }
    for (var a = current.substr(0, j) ; j <= cl ; j ++) {
      abbrevs[a] = current
      a += current.charAt(j)
    }
  }
  return abbrevs
}

function lexSort (a, b) {
  return a === b ? 0 : a > b ? 1 : -1
}

},{}],15:[function(require,module,exports){
(function (process){
var EE = require('events').EventEmitter
var log = exports = module.exports = new EE
var util = require('util')

var ansi = require('ansi')
log.cursor = ansi(process.stderr)
log.stream = process.stderr

// by default, let ansi decide based on tty-ness.
var colorEnabled = undefined
log.enableColor = function () {
  colorEnabled = true
  this.cursor.enabled = true
}
log.disableColor = function () {
  colorEnabled = false
  this.cursor.enabled = false
}

// default level
log.level = 'info'

// temporarily stop emitting, but don't drop
log.pause = function () {
  this._paused = true
}

log.resume = function () {
  if (!this._paused) return
  this._paused = false

  var b = this._buffer
  this._buffer = []
  b.forEach(function (m) {
    this.emitLog(m)
  }, this)
}

log._buffer = []

var id = 0
log.record = []
log.maxRecordSize = 10000
log.log = function (lvl, prefix, message) {
  var l = this.levels[lvl]
  if (l === undefined) {
    return this.emit('error', new Error(util.format(
      'Undefined log level: %j', lvl)))
  }

  var a = new Array(arguments.length - 2)
  var stack = null
  for (var i = 2; i < arguments.length; i ++) {
    var arg = a[i-2] = arguments[i]

    // resolve stack traces to a plain string.
    if (typeof arg === 'object' && arg &&
        (arg instanceof Error) && arg.stack) {
      arg.stack = stack = arg.stack + ''
    }
  }
  if (stack) a.unshift(stack + '\n')
  message = util.format.apply(util, a)

  var m = { id: id++,
            level: lvl,
            prefix: String(prefix || ''),
            message: message,
            messageRaw: a }

  this.emit('log', m)
  this.emit('log.' + lvl, m)
  if (m.prefix) this.emit(m.prefix, m)

  this.record.push(m)
  var mrs = this.maxRecordSize
  var n = this.record.length - mrs
  if (n > mrs / 10) {
    var newSize = Math.floor(mrs * 0.9)
    this.record = this.record.slice(-1 * newSize)
  }

  this.emitLog(m)
}.bind(log)

log.emitLog = function (m) {
  if (this._paused) {
    this._buffer.push(m)
    return
  }
  var l = this.levels[m.level]
  if (l === undefined) return
  if (l < this.levels[this.level]) return
  if (l > 0 && !isFinite(l)) return

  var style = log.style[m.level]
  var disp = log.disp[m.level] || m.level
  m.message.split(/\r?\n/).forEach(function (line) {
    if (this.heading) {
      this.write(this.heading, this.headingStyle)
      this.write(' ')
    }
    this.write(disp, log.style[m.level])
    var p = m.prefix || ''
    if (p) this.write(' ')
    this.write(p, this.prefixStyle)
    this.write(' ' + line + '\n')
  }, this)
}

log.write = function (msg, style) {
  if (!this.cursor) return
  if (this.stream !== this.cursor.stream) {
    this.cursor = ansi(this.stream, { enabled: colorEnabled })
  }

  style = style || {}
  if (style.fg) this.cursor.fg[style.fg]()
  if (style.bg) this.cursor.bg[style.bg]()
  if (style.bold) this.cursor.bold()
  if (style.underline) this.cursor.underline()
  if (style.inverse) this.cursor.inverse()
  if (style.beep) this.cursor.beep()
  this.cursor.write(msg).reset()
}

log.addLevel = function (lvl, n, style, disp) {
  if (!disp) disp = lvl
  this.levels[lvl] = n
  this.style[lvl] = style
  if (!this[lvl]) this[lvl] = function () {
    var a = new Array(arguments.length + 1)
    a[0] = lvl
    for (var i = 0; i < arguments.length; i ++) {
      a[i + 1] = arguments[i]
    }
    return this.log.apply(this, a)
  }.bind(this)
  this.disp[lvl] = disp
}

log.prefixStyle = { fg: 'magenta' }
log.headingStyle = { fg: 'white', bg: 'black' }

log.style = {}
log.levels = {}
log.disp = {}
log.addLevel('silly', -Infinity, { inverse: true }, 'sill')
log.addLevel('verbose', 1000, { fg: 'blue', bg: 'black' }, 'verb')
log.addLevel('info', 2000, { fg: 'green' })
log.addLevel('http', 3000, { fg: 'green', bg: 'black' })
log.addLevel('warn', 4000, { fg: 'black', bg: 'yellow' }, 'WARN')
log.addLevel('error', 5000, { fg: 'red', bg: 'black' }, 'ERR!')
log.addLevel('silent', Infinity)

}).call(this,require('_process'))
},{"_process":131,"ansi":16,"events":122,"util":151}],16:[function(require,module,exports){

/**
 * References:
 *
 *   - http://en.wikipedia.org/wiki/ANSI_escape_code
 *   - http://www.termsys.demon.co.uk/vtansi.htm
 *
 */

/**
 * Module dependencies.
 */

var emitNewlineEvents = require('./newlines')
  , prefix = '\x1b[' // For all escape codes
  , suffix = 'm'     // Only for color codes

/**
 * The ANSI escape sequences.
 */

var codes = {
    up: 'A'
  , down: 'B'
  , forward: 'C'
  , back: 'D'
  , nextLine: 'E'
  , previousLine: 'F'
  , horizontalAbsolute: 'G'
  , eraseData: 'J'
  , eraseLine: 'K'
  , scrollUp: 'S'
  , scrollDown: 'T'
  , savePosition: 's'
  , restorePosition: 'u'
  , queryPosition: '6n'
  , hide: '?25l'
  , show: '?25h'
}

/**
 * Rendering ANSI codes.
 */

var styles = {
    bold: 1
  , italic: 3
  , underline: 4
  , inverse: 7
}

/**
 * The negating ANSI code for the rendering modes.
 */

var reset = {
    bold: 22
  , italic: 23
  , underline: 24
  , inverse: 27
}

/**
 * The standard, styleable ANSI colors.
 */

var colors = {
    white: 37
  , black: 30
  , blue: 34
  , cyan: 36
  , green: 32
  , magenta: 35
  , red: 31
  , yellow: 33
  , grey: 90
  , brightBlack: 90
  , brightRed: 91
  , brightGreen: 92
  , brightYellow: 93
  , brightBlue: 94
  , brightMagenta: 95
  , brightCyan: 96
  , brightWhite: 97
}


/**
 * Creates a Cursor instance based off the given `writable stream` instance.
 */

function ansi (stream, options) {
  if (stream._ansicursor) {
    return stream._ansicursor
  } else {
    return stream._ansicursor = new Cursor(stream, options)
  }
}
module.exports = exports = ansi

/**
 * The `Cursor` class.
 */

function Cursor (stream, options) {
  if (!(this instanceof Cursor)) {
    return new Cursor(stream, options)
  }
  if (typeof stream != 'object' || typeof stream.write != 'function') {
    throw new Error('a valid Stream instance must be passed in')
  }

  // the stream to use
  this.stream = stream

  // when 'enabled' is false then all the functions are no-ops except for write()
  this.enabled = options && options.enabled
  if (typeof this.enabled === 'undefined') {
    this.enabled = stream.isTTY
  }
  this.enabled = !!this.enabled

  // then `buffering` is true, then `write()` calls are buffered in
  // memory until `flush()` is invoked
  this.buffering = !!(options && options.buffering)
  this._buffer = []

  // controls the foreground and background colors
  this.fg = this.foreground = new Colorer(this, 0)
  this.bg = this.background = new Colorer(this, 10)

  // defaults
  this.Bold = false
  this.Italic = false
  this.Underline = false
  this.Inverse = false

  // keep track of the number of "newlines" that get encountered
  this.newlines = 0
  emitNewlineEvents(stream)
  stream.on('newline', function () {
    this.newlines++
  }.bind(this))
}
exports.Cursor = Cursor

/**
 * Helper function that calls `write()` on the underlying Stream.
 * Returns `this` instead of the write() return value to keep
 * the chaining going.
 */

Cursor.prototype.write = function (data) {
  if (this.buffering) {
    this._buffer.push(arguments)
  } else {
    this.stream.write.apply(this.stream, arguments)
  }
  return this
}

/**
 * Buffer `write()` calls into memory.
 *
 * @api public
 */

Cursor.prototype.buffer = function () {
  this.buffering = true
  return this
}

/**
 * Write out the in-memory buffer.
 *
 * @api public
 */

Cursor.prototype.flush = function () {
  this.buffering = false
  var str = this._buffer.map(function (args) {
    if (args.length != 1) throw new Error('unexpected args length! ' + args.length);
    return args[0];
  }).join('');
  this._buffer.splice(0); // empty
  this.write(str);
  return this
}


/**
 * The `Colorer` class manages both the background and foreground colors.
 */

function Colorer (cursor, base) {
  this.current = null
  this.cursor = cursor
  this.base = base
}
exports.Colorer = Colorer

/**
 * Write an ANSI color code, ensuring that the same code doesn't get rewritten.
 */

Colorer.prototype._setColorCode = function setColorCode (code) {
  var c = String(code)
  if (this.current === c) return
  this.cursor.enabled && this.cursor.write(prefix + c + suffix)
  this.current = c
  return this
}


/**
 * Set up the positional ANSI codes.
 */

Object.keys(codes).forEach(function (name) {
  var code = String(codes[name])
  Cursor.prototype[name] = function () {
    var c = code
    if (arguments.length > 0) {
      c = toArray(arguments).map(Math.round).join(';') + code
    }
    this.enabled && this.write(prefix + c)
    return this
  }
})

/**
 * Set up the functions for the rendering ANSI codes.
 */

Object.keys(styles).forEach(function (style) {
  var name = style[0].toUpperCase() + style.substring(1)
    , c = styles[style]
    , r = reset[style]

  Cursor.prototype[style] = function () {
    if (this[name]) return
    this.enabled && this.write(prefix + c + suffix)
    this[name] = true
    return this
  }

  Cursor.prototype['reset' + name] = function () {
    if (!this[name]) return
    this.enabled && this.write(prefix + r + suffix)
    this[name] = false
    return this
  }
})

/**
 * Setup the functions for the standard colors.
 */

Object.keys(colors).forEach(function (color) {
  var code = colors[color]

  Colorer.prototype[color] = function () {
    this._setColorCode(this.base + code)
    return this.cursor
  }

  Cursor.prototype[color] = function () {
    return this.foreground[color]()
  }
})

/**
 * Makes a beep sound!
 */

Cursor.prototype.beep = function () {
  this.enabled && this.write('\x07')
  return this
}

/**
 * Moves cursor to specific position
 */

Cursor.prototype.goto = function (x, y) {
  x = x | 0
  y = y | 0
  this.enabled && this.write(prefix + y + ';' + x + 'H')
  return this
}

/**
 * Resets the color.
 */

Colorer.prototype.reset = function () {
  this._setColorCode(this.base + 39)
  return this.cursor
}

/**
 * Resets all ANSI formatting on the stream.
 */

Cursor.prototype.reset = function () {
  this.enabled && this.write(prefix + '0' + suffix)
  this.Bold = false
  this.Italic = false
  this.Underline = false
  this.Inverse = false
  this.foreground.current = null
  this.background.current = null
  return this
}

/**
 * Sets the foreground color with the given RGB values.
 * The closest match out of the 216 colors is picked.
 */

Colorer.prototype.rgb = function (r, g, b) {
  var base = this.base + 38
    , code = rgb(r, g, b)
  this._setColorCode(base + ';5;' + code)
  return this.cursor
}

/**
 * Same as `cursor.fg.rgb(r, g, b)`.
 */

Cursor.prototype.rgb = function (r, g, b) {
  return this.foreground.rgb(r, g, b)
}

/**
 * Accepts CSS color codes for use with ANSI escape codes.
 * For example: `#FF000` would be bright red.
 */

Colorer.prototype.hex = function (color) {
  return this.rgb.apply(this, hex(color))
}

/**
 * Same as `cursor.fg.hex(color)`.
 */

Cursor.prototype.hex = function (color) {
  return this.foreground.hex(color)
}


// UTIL FUNCTIONS //

/**
 * Translates a 255 RGB value to a 0-5 ANSI RGV value,
 * then returns the single ANSI color code to use.
 */

function rgb (r, g, b) {
  var red = r / 255 * 5
    , green = g / 255 * 5
    , blue = b / 255 * 5
  return rgb5(red, green, blue)
}

/**
 * Turns rgb 0-5 values into a single ANSI color code to use.
 */

function rgb5 (r, g, b) {
  var red = Math.round(r)
    , green = Math.round(g)
    , blue = Math.round(b)
  return 16 + (red*36) + (green*6) + blue
}

/**
 * Accepts a hex CSS color code string (# is optional) and
 * translates it into an Array of 3 RGB 0-255 values, which
 * can then be used with rgb().
 */

function hex (color) {
  var c = color[0] === '#' ? color.substring(1) : color
    , r = c.substring(0, 2)
    , g = c.substring(2, 4)
    , b = c.substring(4, 6)
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)]
}

/**
 * Turns an array-like object into a real array.
 */

function toArray (a) {
  var i = 0
    , l = a.length
    , rtn = []
  for (; i<l; i++) {
    rtn.push(a[i])
  }
  return rtn
}

},{"./newlines":17}],17:[function(require,module,exports){

/**
 * Accepts any node Stream instance and hijacks its "write()" function,
 * so that it can count any newlines that get written to the output.
 *
 * When a '\n' byte is encountered, then a "newline" event will be emitted
 * on the stream, with no arguments. It is up to the listeners to determine
 * any necessary deltas required for their use-case.
 *
 * Ex:
 *
 *   var cursor = ansi(process.stdout)
 *     , ln = 0
 *   process.stdout.on('newline', function () {
 *    ln++
 *   })
 */

/**
 * Module dependencies.
 */

var assert = require('assert')
var NEWLINE = '\n'.charCodeAt(0)

function emitNewlineEvents (stream) {
  if (stream._emittingNewlines) {
    // already emitting newline events
    return
  }

  var write = stream.write

  stream.write = function (data) {
    // first write the data
    var rtn = write.apply(stream, arguments)

    if (stream.listeners('newline').length > 0) {
      var len = data.length
        , i = 0
      // now try to calculate any deltas
      if (typeof data == 'string') {
        for (; i<len; i++) {
          processByte(stream, data.charCodeAt(i))
        }
      } else {
        // buffer
        for (; i<len; i++) {
          processByte(stream, data[i])
        }
      }
    }

    return rtn
  }

  stream._emittingNewlines = true
}
module.exports = emitNewlineEvents


/**
 * Processes an individual byte being written to a stream
 */

function processByte (stream, b) {
  assert.equal(typeof b, 'number')
  if (b === NEWLINE) {
    stream.emit('newline')
  }
}

},{"assert":102}],18:[function(require,module,exports){
;(function(exports) {

// export the class if we are in a Node-like system.
if (typeof module === 'object' && module.exports === exports)
  exports = module.exports = SemVer;

// The debug function is excluded entirely from the minified version.

// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
exports.SEMVER_SPEC_VERSION = '2.0.0';

// The actual regexps go on exports.re
var re = exports.re = [];
var src = exports.src = [];
var R = 0;

// The following Regular Expressions can be used for tokenizing,
// validating, and parsing SemVer version strings.

// ## Numeric Identifier
// A single `0`, or a non-zero digit followed by zero or more digits.

var NUMERICIDENTIFIER = R++;
src[NUMERICIDENTIFIER] = '0|[1-9]\\d*';
var NUMERICIDENTIFIERLOOSE = R++;
src[NUMERICIDENTIFIERLOOSE] = '[0-9]+';


// ## Non-numeric Identifier
// Zero or more digits, followed by a letter or hyphen, and then zero or
// more letters, digits, or hyphens.

var NONNUMERICIDENTIFIER = R++;
src[NONNUMERICIDENTIFIER] = '\\d*[a-zA-Z-][a-zA-Z0-9-]*';


// ## Main Version
// Three dot-separated numeric identifiers.

var MAINVERSION = R++;
src[MAINVERSION] = '(' + src[NUMERICIDENTIFIER] + ')\\.' +
                   '(' + src[NUMERICIDENTIFIER] + ')\\.' +
                   '(' + src[NUMERICIDENTIFIER] + ')';

var MAINVERSIONLOOSE = R++;
src[MAINVERSIONLOOSE] = '(' + src[NUMERICIDENTIFIERLOOSE] + ')\\.' +
                        '(' + src[NUMERICIDENTIFIERLOOSE] + ')\\.' +
                        '(' + src[NUMERICIDENTIFIERLOOSE] + ')';

// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.

var PRERELEASEIDENTIFIER = R++;
src[PRERELEASEIDENTIFIER] = '(?:' + src[NUMERICIDENTIFIER] +
                            '|' + src[NONNUMERICIDENTIFIER] + ')';

var PRERELEASEIDENTIFIERLOOSE = R++;
src[PRERELEASEIDENTIFIERLOOSE] = '(?:' + src[NUMERICIDENTIFIERLOOSE] +
                                 '|' + src[NONNUMERICIDENTIFIER] + ')';


// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.

var PRERELEASE = R++;
src[PRERELEASE] = '(?:-(' + src[PRERELEASEIDENTIFIER] +
                  '(?:\\.' + src[PRERELEASEIDENTIFIER] + ')*))';

var PRERELEASELOOSE = R++;
src[PRERELEASELOOSE] = '(?:-?(' + src[PRERELEASEIDENTIFIERLOOSE] +
                       '(?:\\.' + src[PRERELEASEIDENTIFIERLOOSE] + ')*))';

// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.

var BUILDIDENTIFIER = R++;
src[BUILDIDENTIFIER] = '[0-9A-Za-z-]+';

// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.

var BUILD = R++;
src[BUILD] = '(?:\\+(' + src[BUILDIDENTIFIER] +
             '(?:\\.' + src[BUILDIDENTIFIER] + ')*))';


// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.

// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.

var FULL = R++;
var FULLPLAIN = 'v?' + src[MAINVERSION] +
                src[PRERELEASE] + '?' +
                src[BUILD] + '?';

src[FULL] = '^' + FULLPLAIN + '$';

// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
// common in the npm registry.
var LOOSEPLAIN = '[v=\\s]*' + src[MAINVERSIONLOOSE] +
                 src[PRERELEASELOOSE] + '?' +
                 src[BUILD] + '?';

var LOOSE = R++;
src[LOOSE] = '^' + LOOSEPLAIN + '$';

var GTLT = R++;
src[GTLT] = '((?:<|>)?=?)';

// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifer, meaning "any version"
// Only the first item is strictly required.
var XRANGEIDENTIFIERLOOSE = R++;
src[XRANGEIDENTIFIERLOOSE] = src[NUMERICIDENTIFIERLOOSE] + '|x|X|\\*';
var XRANGEIDENTIFIER = R++;
src[XRANGEIDENTIFIER] = src[NUMERICIDENTIFIER] + '|x|X|\\*';

var XRANGEPLAIN = R++;
src[XRANGEPLAIN] = '[v=\\s]*(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:\\.(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:\\.(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:(' + src[PRERELEASE] + ')' +
                   ')?)?)?';

var XRANGEPLAINLOOSE = R++;
src[XRANGEPLAINLOOSE] = '[v=\\s]*(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:\\.(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:\\.(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:(' + src[PRERELEASELOOSE] + ')' +
                        ')?)?)?';

// >=2.x, for example, means >=2.0.0-0
// <1.x would be the same as "<1.0.0-0", though.
var XRANGE = R++;
src[XRANGE] = '^' + src[GTLT] + '\\s*' + src[XRANGEPLAIN] + '$';
var XRANGELOOSE = R++;
src[XRANGELOOSE] = '^' + src[GTLT] + '\\s*' + src[XRANGEPLAINLOOSE] + '$';

// Tilde ranges.
// Meaning is "reasonably at or greater than"
var LONETILDE = R++;
src[LONETILDE] = '(?:~>?)';

var TILDETRIM = R++;
src[TILDETRIM] = '(\\s*)' + src[LONETILDE] + '\\s+';
re[TILDETRIM] = new RegExp(src[TILDETRIM], 'g');
var tildeTrimReplace = '$1~';

var TILDE = R++;
src[TILDE] = '^' + src[LONETILDE] + src[XRANGEPLAIN] + '$';
var TILDELOOSE = R++;
src[TILDELOOSE] = '^' + src[LONETILDE] + src[XRANGEPLAINLOOSE] + '$';

// Caret ranges.
// Meaning is "at least and backwards compatible with"
var LONECARET = R++;
src[LONECARET] = '(?:\\^)';

var CARETTRIM = R++;
src[CARETTRIM] = '(\\s*)' + src[LONECARET] + '\\s+';
re[CARETTRIM] = new RegExp(src[CARETTRIM], 'g');
var caretTrimReplace = '$1^';

var CARET = R++;
src[CARET] = '^' + src[LONECARET] + src[XRANGEPLAIN] + '$';
var CARETLOOSE = R++;
src[CARETLOOSE] = '^' + src[LONECARET] + src[XRANGEPLAINLOOSE] + '$';

// A simple gt/lt/eq thing, or just "" to indicate "any version"
var COMPARATORLOOSE = R++;
src[COMPARATORLOOSE] = '^' + src[GTLT] + '\\s*(' + LOOSEPLAIN + ')$|^$';
var COMPARATOR = R++;
src[COMPARATOR] = '^' + src[GTLT] + '\\s*(' + FULLPLAIN + ')$|^$';


// An expression to strip any whitespace between the gtlt and the thing
// it modifies, so that `> 1.2.3` ==> `>1.2.3`
var COMPARATORTRIM = R++;
src[COMPARATORTRIM] = '(\\s*)' + src[GTLT] +
                      '\\s*(' + LOOSEPLAIN + '|' + src[XRANGEPLAIN] + ')';

// this one has to use the /g flag
re[COMPARATORTRIM] = new RegExp(src[COMPARATORTRIM], 'g');
var comparatorTrimReplace = '$1$2$3';


// Something like `1.2.3 - 1.2.4`
// Note that these all use the loose form, because they'll be
// checked against either the strict or loose comparator form
// later.
var HYPHENRANGE = R++;
src[HYPHENRANGE] = '^\\s*(' + src[XRANGEPLAIN] + ')' +
                   '\\s+-\\s+' +
                   '(' + src[XRANGEPLAIN] + ')' +
                   '\\s*$';

var HYPHENRANGELOOSE = R++;
src[HYPHENRANGELOOSE] = '^\\s*(' + src[XRANGEPLAINLOOSE] + ')' +
                        '\\s+-\\s+' +
                        '(' + src[XRANGEPLAINLOOSE] + ')' +
                        '\\s*$';

// Star ranges basically just allow anything at all.
var STAR = R++;
src[STAR] = '(<|>)?=?\\s*\\*';

// Compile to actual regexp objects.
// All are flag-free, unless they were created above with a flag.
for (var i = 0; i < R; i++) {
  ;
  if (!re[i])
    re[i] = new RegExp(src[i]);
}

exports.parse = parse;
function parse(version, loose) {
  var r = loose ? re[LOOSE] : re[FULL];
  return (r.test(version)) ? new SemVer(version, loose) : null;
}

exports.valid = valid;
function valid(version, loose) {
  var v = parse(version, loose);
  return v ? v.version : null;
}


exports.clean = clean;
function clean(version, loose) {
  var s = parse(version, loose);
  return s ? s.version : null;
}

exports.SemVer = SemVer;

function SemVer(version, loose) {
  if (version instanceof SemVer) {
    if (version.loose === loose)
      return version;
    else
      version = version.version;
  } else if (typeof version !== 'string') {
    throw new TypeError('Invalid Version: ' + version);
  }

  if (!(this instanceof SemVer))
    return new SemVer(version, loose);

  ;
  this.loose = loose;
  var m = version.trim().match(loose ? re[LOOSE] : re[FULL]);

  if (!m)
    throw new TypeError('Invalid Version: ' + version);

  this.raw = version;

  // these are actually numbers
  this.major = +m[1];
  this.minor = +m[2];
  this.patch = +m[3];

  // numberify any prerelease numeric ids
  if (!m[4])
    this.prerelease = [];
  else
    this.prerelease = m[4].split('.').map(function(id) {
      return (/^[0-9]+$/.test(id)) ? +id : id;
    });

  this.build = m[5] ? m[5].split('.') : [];
  this.format();
}

SemVer.prototype.format = function() {
  this.version = this.major + '.' + this.minor + '.' + this.patch;
  if (this.prerelease.length)
    this.version += '-' + this.prerelease.join('.');
  return this.version;
};

SemVer.prototype.inspect = function() {
  return '<SemVer "' + this + '">';
};

SemVer.prototype.toString = function() {
  return this.version;
};

SemVer.prototype.compare = function(other) {
  ;
  if (!(other instanceof SemVer))
    other = new SemVer(other, this.loose);

  return this.compareMain(other) || this.comparePre(other);
};

SemVer.prototype.compareMain = function(other) {
  if (!(other instanceof SemVer))
    other = new SemVer(other, this.loose);

  return compareIdentifiers(this.major, other.major) ||
         compareIdentifiers(this.minor, other.minor) ||
         compareIdentifiers(this.patch, other.patch);
};

SemVer.prototype.comparePre = function(other) {
  if (!(other instanceof SemVer))
    other = new SemVer(other, this.loose);

  // NOT having a prerelease is > having one
  if (this.prerelease.length && !other.prerelease.length)
    return -1;
  else if (!this.prerelease.length && other.prerelease.length)
    return 1;
  else if (!this.prerelease.length && !other.prerelease.length)
    return 0;

  var i = 0;
  do {
    var a = this.prerelease[i];
    var b = other.prerelease[i];
    ;
    if (a === undefined && b === undefined)
      return 0;
    else if (b === undefined)
      return 1;
    else if (a === undefined)
      return -1;
    else if (a === b)
      continue;
    else
      return compareIdentifiers(a, b);
  } while (++i);
};

// preminor will bump the version up to the next minor release, and immediately
// down to pre-release. premajor and prepatch work the same way.
SemVer.prototype.inc = function(release) {
  switch (release) {
    case 'premajor':
      this.inc('major');
      this.inc('pre');
      break;
    case 'preminor':
      this.inc('minor');
      this.inc('pre');
      break;
    case 'prepatch':
      this.inc('patch');
      this.inc('pre');
      break;
    // If the input is a non-prerelease version, this acts the same as
    // prepatch.
    case 'prerelease':
      if (this.prerelease.length === 0)
        this.inc('patch');
      this.inc('pre');
      break;
    case 'major':
      this.major++;
      this.minor = -1;
    case 'minor':
      this.minor++;
      this.patch = 0;
      this.prerelease = [];
      break;
    case 'patch':
      // If this is not a pre-release version, it will increment the patch.
      // If it is a pre-release it will bump up to the same patch version.
      // 1.2.0-5 patches to 1.2.0
      // 1.2.0 patches to 1.2.1
      if (this.prerelease.length === 0)
        this.patch++;
      this.prerelease = [];
      break;
    // This probably shouldn't be used publically.
    // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
    case 'pre':
      if (this.prerelease.length === 0)
        this.prerelease = [0];
      else {
        var i = this.prerelease.length;
        while (--i >= 0) {
          if (typeof this.prerelease[i] === 'number') {
            this.prerelease[i]++;
            i = -2;
          }
        }
        if (i === -1) // didn't increment anything
          this.prerelease.push(0);
      }
      break;

    default:
      throw new Error('invalid increment argument: ' + release);
  }
  this.format();
  return this;
};

exports.inc = inc;
function inc(version, release, loose) {
  try {
    return new SemVer(version, loose).inc(release).version;
  } catch (er) {
    return null;
  }
}

exports.compareIdentifiers = compareIdentifiers;

var numeric = /^[0-9]+$/;
function compareIdentifiers(a, b) {
  var anum = numeric.test(a);
  var bnum = numeric.test(b);

  if (anum && bnum) {
    a = +a;
    b = +b;
  }

  return (anum && !bnum) ? -1 :
         (bnum && !anum) ? 1 :
         a < b ? -1 :
         a > b ? 1 :
         0;
}

exports.rcompareIdentifiers = rcompareIdentifiers;
function rcompareIdentifiers(a, b) {
  return compareIdentifiers(b, a);
}

exports.compare = compare;
function compare(a, b, loose) {
  return new SemVer(a, loose).compare(b);
}

exports.compareLoose = compareLoose;
function compareLoose(a, b) {
  return compare(a, b, true);
}

exports.rcompare = rcompare;
function rcompare(a, b, loose) {
  return compare(b, a, loose);
}

exports.sort = sort;
function sort(list, loose) {
  return list.sort(function(a, b) {
    return exports.compare(a, b, loose);
  });
}

exports.rsort = rsort;
function rsort(list, loose) {
  return list.sort(function(a, b) {
    return exports.rcompare(a, b, loose);
  });
}

exports.gt = gt;
function gt(a, b, loose) {
  return compare(a, b, loose) > 0;
}

exports.lt = lt;
function lt(a, b, loose) {
  return compare(a, b, loose) < 0;
}

exports.eq = eq;
function eq(a, b, loose) {
  return compare(a, b, loose) === 0;
}

exports.neq = neq;
function neq(a, b, loose) {
  return compare(a, b, loose) !== 0;
}

exports.gte = gte;
function gte(a, b, loose) {
  return compare(a, b, loose) >= 0;
}

exports.lte = lte;
function lte(a, b, loose) {
  return compare(a, b, loose) <= 0;
}

exports.cmp = cmp;
function cmp(a, op, b, loose) {
  var ret;
  switch (op) {
    case '===': ret = a === b; break;
    case '!==': ret = a !== b; break;
    case '': case '=': case '==': ret = eq(a, b, loose); break;
    case '!=': ret = neq(a, b, loose); break;
    case '>': ret = gt(a, b, loose); break;
    case '>=': ret = gte(a, b, loose); break;
    case '<': ret = lt(a, b, loose); break;
    case '<=': ret = lte(a, b, loose); break;
    default: throw new TypeError('Invalid operator: ' + op);
  }
  return ret;
}

exports.Comparator = Comparator;
function Comparator(comp, loose) {
  if (comp instanceof Comparator) {
    if (comp.loose === loose)
      return comp;
    else
      comp = comp.value;
  }

  if (!(this instanceof Comparator))
    return new Comparator(comp, loose);

  ;
  this.loose = loose;
  this.parse(comp);

  if (this.semver === ANY)
    this.value = '';
  else
    this.value = this.operator + this.semver.version;
}

var ANY = {};
Comparator.prototype.parse = function(comp) {
  var r = this.loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
  var m = comp.match(r);

  if (!m)
    throw new TypeError('Invalid comparator: ' + comp);

  this.operator = m[1];
  // if it literally is just '>' or '' then allow anything.
  if (!m[2])
    this.semver = ANY;
  else {
    this.semver = new SemVer(m[2], this.loose);

    // <1.2.3-rc DOES allow 1.2.3-beta (has prerelease)
    // >=1.2.3 DOES NOT allow 1.2.3-beta
    // <=1.2.3 DOES allow 1.2.3-beta
    // However, <1.2.3 does NOT allow 1.2.3-beta,
    // even though `1.2.3-beta < 1.2.3`
    // The assumption is that the 1.2.3 version has something you
    // *don't* want, so we push the prerelease down to the minimum.
    if (this.operator === '<' && !this.semver.prerelease.length) {
      this.semver.prerelease = ['0'];
      this.semver.format();
    }
  }
};

Comparator.prototype.inspect = function() {
  return '<SemVer Comparator "' + this + '">';
};

Comparator.prototype.toString = function() {
  return this.value;
};

Comparator.prototype.test = function(version) {
  ;
  return (this.semver === ANY) ? true :
         cmp(version, this.operator, this.semver, this.loose);
};


exports.Range = Range;
function Range(range, loose) {
  if ((range instanceof Range) && range.loose === loose)
    return range;

  if (!(this instanceof Range))
    return new Range(range, loose);

  this.loose = loose;

  // First, split based on boolean or ||
  this.raw = range;
  this.set = range.split(/\s*\|\|\s*/).map(function(range) {
    return this.parseRange(range.trim());
  }, this).filter(function(c) {
    // throw out any that are not relevant for whatever reason
    return c.length;
  });

  if (!this.set.length) {
    throw new TypeError('Invalid SemVer Range: ' + range);
  }

  this.format();
}

Range.prototype.inspect = function() {
  return '<SemVer Range "' + this.range + '">';
};

Range.prototype.format = function() {
  this.range = this.set.map(function(comps) {
    return comps.join(' ').trim();
  }).join('||').trim();
  return this.range;
};

Range.prototype.toString = function() {
  return this.range;
};

Range.prototype.parseRange = function(range) {
  var loose = this.loose;
  range = range.trim();
  ;
  // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
  var hr = loose ? re[HYPHENRANGELOOSE] : re[HYPHENRANGE];
  range = range.replace(hr, hyphenReplace);
  ;
  // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
  range = range.replace(re[COMPARATORTRIM], comparatorTrimReplace);
  ;

  // `~ 1.2.3` => `~1.2.3`
  range = range.replace(re[TILDETRIM], tildeTrimReplace);

  // `^ 1.2.3` => `^1.2.3`
  range = range.replace(re[CARETTRIM], caretTrimReplace);

  // normalize spaces
  range = range.split(/\s+/).join(' ');

  // At this point, the range is completely trimmed and
  // ready to be split into comparators.

  var compRe = loose ? re[COMPARATORLOOSE] : re[COMPARATOR];
  var set = range.split(' ').map(function(comp) {
    return parseComparator(comp, loose);
  }).join(' ').split(/\s+/);
  if (this.loose) {
    // in loose mode, throw out any that are not valid comparators
    set = set.filter(function(comp) {
      return !!comp.match(compRe);
    });
  }
  set = set.map(function(comp) {
    return new Comparator(comp, loose);
  });

  return set;
};

// Mostly just for testing and legacy API reasons
exports.toComparators = toComparators;
function toComparators(range, loose) {
  return new Range(range, loose).set.map(function(comp) {
    return comp.map(function(c) {
      return c.value;
    }).join(' ').trim().split(' ');
  });
}

// comprised of xranges, tildes, stars, and gtlt's at this point.
// already replaced the hyphen ranges
// turn into a set of JUST comparators.
function parseComparator(comp, loose) {
  ;
  comp = replaceCarets(comp, loose);
  ;
  comp = replaceTildes(comp, loose);
  ;
  comp = replaceXRanges(comp, loose);
  ;
  comp = replaceStars(comp, loose);
  ;
  return comp;
}

function isX(id) {
  return !id || id.toLowerCase() === 'x' || id === '*';
}

// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
function replaceTildes(comp, loose) {
  return comp.trim().split(/\s+/).map(function(comp) {
    return replaceTilde(comp, loose);
  }).join(' ');
}

function replaceTilde(comp, loose) {
  var r = loose ? re[TILDELOOSE] : re[TILDE];
  return comp.replace(r, function(_, M, m, p, pr) {
    ;
    var ret;

    if (isX(M))
      ret = '';
    else if (isX(m))
      ret = '>=' + M + '.0.0-0 <' + (+M + 1) + '.0.0-0';
    else if (isX(p))
      // ~1.2 == >=1.2.0- <1.3.0-
      ret = '>=' + M + '.' + m + '.0-0 <' + M + '.' + (+m + 1) + '.0-0';
    else if (pr) {
      ;
      if (pr.charAt(0) !== '-')
        pr = '-' + pr;
      ret = '>=' + M + '.' + m + '.' + p + pr +
            ' <' + M + '.' + (+m + 1) + '.0-0';
    } else
      // ~1.2.3 == >=1.2.3-0 <1.3.0-0
      ret = '>=' + M + '.' + m + '.' + p + '-0' +
            ' <' + M + '.' + (+m + 1) + '.0-0';

    ;
    return ret;
  });
}

// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
// ^1.2.3 --> >=1.2.3 <2.0.0
// ^1.2.0 --> >=1.2.0 <2.0.0
function replaceCarets(comp, loose) {
  return comp.trim().split(/\s+/).map(function(comp) {
    return replaceCaret(comp, loose);
  }).join(' ');
}

function replaceCaret(comp, loose) {
  var r = loose ? re[CARETLOOSE] : re[CARET];
  return comp.replace(r, function(_, M, m, p, pr) {
    ;
    var ret;

    if (isX(M))
      ret = '';
    else if (isX(m))
      ret = '>=' + M + '.0.0-0 <' + (+M + 1) + '.0.0-0';
    else if (isX(p)) {
      if (M === '0')
        ret = '>=' + M + '.' + m + '.0-0 <' + M + '.' + (+m + 1) + '.0-0';
      else
        ret = '>=' + M + '.' + m + '.0-0 <' + (+M + 1) + '.0.0-0';
    } else if (pr) {
      ;
      if (pr.charAt(0) !== '-')
        pr = '-' + pr;
      if (M === '0') {
        if (m === '0')
          ret = '=' + M + '.' + m + '.' + p + pr;
        else
          ret = '>=' + M + '.' + m + '.' + p + pr +
                ' <' + M + '.' + (+m + 1) + '.0-0';
      } else
        ret = '>=' + M + '.' + m + '.' + p + pr +
              ' <' + (+M + 1) + '.0.0-0';
    } else {
      if (M === '0') {
        if (m === '0')
          ret = '=' + M + '.' + m + '.' + p;
        else
          ret = '>=' + M + '.' + m + '.' + p + '-0' +
                ' <' + M + '.' + (+m + 1) + '.0-0';
      } else
        ret = '>=' + M + '.' + m + '.' + p + '-0' +
              ' <' + (+M + 1) + '.0.0-0';
    }

    ;
    return ret;
  });
}

function replaceXRanges(comp, loose) {
  ;
  return comp.split(/\s+/).map(function(comp) {
    return replaceXRange(comp, loose);
  }).join(' ');
}

function replaceXRange(comp, loose) {
  comp = comp.trim();
  var r = loose ? re[XRANGELOOSE] : re[XRANGE];
  return comp.replace(r, function(ret, gtlt, M, m, p, pr) {
    ;
    var xM = isX(M);
    var xm = xM || isX(m);
    var xp = xm || isX(p);
    var anyX = xp;

    if (gtlt === '=' && anyX)
      gtlt = '';

    if (gtlt && anyX) {
      // replace X with 0, and then append the -0 min-prerelease
      if (xM)
        M = 0;
      if (xm)
        m = 0;
      if (xp)
        p = 0;

      if (gtlt === '>') {
        // >1 => >=2.0.0-0
        // >1.2 => >=1.3.0-0
        // >1.2.3 => >= 1.2.4-0
        gtlt = '>=';
        if (xM) {
          // no change
        } else if (xm) {
          M = +M + 1;
          m = 0;
          p = 0;
        } else if (xp) {
          m = +m + 1;
          p = 0;
        }
      }


      ret = gtlt + M + '.' + m + '.' + p + '-0';
    } else if (xM) {
      // allow any
      ret = '*';
    } else if (xm) {
      // append '-0' onto the version, otherwise
      // '1.x.x' matches '2.0.0-beta', since the tag
      // *lowers* the version value
      ret = '>=' + M + '.0.0-0 <' + (+M + 1) + '.0.0-0';
    } else if (xp) {
      ret = '>=' + M + '.' + m + '.0-0 <' + M + '.' + (+m + 1) + '.0-0';
    }

    ;

    return ret;
  });
}

// Because * is AND-ed with everything else in the comparator,
// and '' means "any version", just remove the *s entirely.
function replaceStars(comp, loose) {
  ;
  // Looseness is ignored here.  star is always as loose as it gets!
  return comp.trim().replace(re[STAR], '');
}

// This function is passed to string.replace(re[HYPHENRANGE])
// M, m, patch, prerelease, build
// 1.2 - 3.4.5 => >=1.2.0-0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0-0 <3.5.0-0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0-0 <3.5.0-0
function hyphenReplace($0,
                       from, fM, fm, fp, fpr, fb,
                       to, tM, tm, tp, tpr, tb) {

  if (isX(fM))
    from = '';
  else if (isX(fm))
    from = '>=' + fM + '.0.0-0';
  else if (isX(fp))
    from = '>=' + fM + '.' + fm + '.0-0';
  else
    from = '>=' + from;

  if (isX(tM))
    to = '';
  else if (isX(tm))
    to = '<' + (+tM + 1) + '.0.0-0';
  else if (isX(tp))
    to = '<' + tM + '.' + (+tm + 1) + '.0-0';
  else if (tpr)
    to = '<=' + tM + '.' + tm + '.' + tp + '-' + tpr;
  else
    to = '<=' + to;

  return (from + ' ' + to).trim();
}


// if ANY of the sets match ALL of its comparators, then pass
Range.prototype.test = function(version) {
  if (!version)
    return false;
  for (var i = 0; i < this.set.length; i++) {
    if (testSet(this.set[i], version))
      return true;
  }
  return false;
};

function testSet(set, version) {
  for (var i = 0; i < set.length; i++) {
    if (!set[i].test(version))
      return false;
  }
  return true;
}

exports.satisfies = satisfies;
function satisfies(version, range, loose) {
  try {
    range = new Range(range, loose);
  } catch (er) {
    return false;
  }
  return range.test(version);
}

exports.maxSatisfying = maxSatisfying;
function maxSatisfying(versions, range, loose) {
  return versions.filter(function(version) {
    return satisfies(version, range, loose);
  }).sort(function(a, b) {
    return rcompare(a, b, loose);
  })[0] || null;
}

exports.validRange = validRange;
function validRange(range, loose) {
  try {
    // Return '*' instead of '' so that truthiness works.
    // This will throw if it's invalid anyway
    return new Range(range, loose).range || '*';
  } catch (er) {
    return null;
  }
}

// Determine if version is less than all the versions possible in the range
exports.ltr = ltr;
function ltr(version, range, loose) {
  return outside(version, range, '<', loose);
}

// Determine if version is greater than all the versions possible in the range.
exports.gtr = gtr;
function gtr(version, range, loose) {
  return outside(version, range, '>', loose);
}

exports.outside = outside;
function outside(version, range, hilo, loose) {
  version = new SemVer(version, loose);
  range = new Range(range, loose);

  var gtfn, ltefn, ltfn, comp, ecomp;
  switch (hilo) {
    case '>':
      gtfn = gt;
      ltefn = lte;
      ltfn = lt;
      comp = '>';
      ecomp = '>=';
      break;
    case '<':
      gtfn = lt;
      ltefn = gte;
      ltfn = gt;
      comp = '<';
      ecomp = '<=';
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }

  // If it satisifes the range it is not outside
  if (satisfies(version, range, loose)) {
    return false;
  }

  // From now on, variable terms are as if we're in "gtr" mode.
  // but note that everything is flipped for the "ltr" function.

  for (var i = 0; i < range.set.length; ++i) {
    var comparators = range.set[i];

    var high = null;
    var low = null;

    comparators.forEach(function(comparator) {
      high = high || comparator;
      low = low || comparator;
      if (gtfn(comparator.semver, high.semver, loose)) {
        high = comparator;
      } else if (ltfn(comparator.semver, low.semver, loose)) {
        low = comparator;
      }
    });

    // If the edge version comparator has a operator then our version
    // isn't outside it
    if (high.operator === comp || high.operator === ecomp) {
      return false;
    }

    // If the lowest version comparator has an operator and our version
    // is less than it then it isn't higher than the range
    if ((!low.operator || low.operator === comp) &&
        ltefn(version, low.semver)) {
      return false;
    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
      return false;
    }
  }
  return true;
}

// Use the define() function if we're in AMD land
if (typeof define === 'function' && define.amd)
  define(exports);

})(
  typeof exports === 'object' ? exports :
  typeof define === 'function' && define.amd ? {} :
  semver = {}
);

},{}],19:[function(require,module,exports){
module.exports={
  "name": "node-pre-gyp",
  "description": "Node.js native addon binary install tool",
  "version": "0.5.19",
  "keywords": [
    "native",
    "addon",
    "module",
    "c",
    "c++",
    "bindings",
    "binary"
  ],
  "author": {
    "name": "Dane Springmeyer",
    "email": "dane@mapbox.com"
  },
  "repository": {
    "type": "git",
    "url": "git://github.com/mapbox/node-pre-gyp.git"
  },
  "bin": {
    "node-pre-gyp": "./bin/node-pre-gyp"
  },
  "main": "./lib/node-pre-gyp.js",
  "dependencies": {
    "nopt": "~2.2.0",
    "npmlog": "~0.0.6",
    "request": "2",
    "semver": "~2.3.0",
    "tar": "~0.1.19",
    "tar-pack": "~2.0.0",
    "mkdirp": "~0.5.0",
    "rc": "~0.4.0",
    "rimraf": "~2.2.5"
  },
  "devDependencies": {
    "aws-sdk": "*"
  },
  "engineStrict": true,
  "engines": {
    "node": ">= 0.8.0"
  },
  "scripts": {
    "update-crosswalk": "node scripts/abi_crosswalk.js > lib/util/abi_crosswalk.json",
    "test": "./test.sh"
  },
  "gitHead": "4584ffba7b411bd98a5a8452894159e7c200e55b",
  "bugs": {
    "url": "https://github.com/mapbox/node-pre-gyp/issues"
  },
  "homepage": "https://github.com/mapbox/node-pre-gyp",
  "bundleDependencies": [
    "nopt",
    "npmlog",
    "request",
    "semver",
    "tar",
    "tar-pack",
    "mkdirp",
    "rc",
    "rimraf"
  ],
  "_id": "node-pre-gyp@0.5.19",
  "_shasum": "9b320edc2f0b005eff769438b648fa1e84759359",
  "_from": "node-pre-gyp@0.5.x",
  "_npmVersion": "1.4.16",
  "_npmUser": {
    "name": "springmeyer",
    "email": "dane@mapbox.com"
  },
  "maintainers": [
    {
      "name": "springmeyer",
      "email": "dane@dbsgeo.com"
    }
  ],
  "dist": {
    "shasum": "9b320edc2f0b005eff769438b648fa1e84759359",
    "tarball": "http://registry.npmjs.org/node-pre-gyp/-/node-pre-gyp-0.5.19.tgz"
  },
  "directories": {},
  "_resolved": "https://registry.npmjs.org/node-pre-gyp/-/node-pre-gyp-0.5.19.tgz",
  "readme": "ERROR: No README data found!"
}

},{}],20:[function(require,module,exports){
(function (Buffer){
/*jslint node: true */
"use strict";

// Copyright 2011 Chris Williams <chris@iterativedesigns.com>

module.exports = {
  raw: function (emitter, buffer) {
    emitter.emit("data", buffer);
  },

  //encoding: ascii utf8 utf16le ucs2 base64 binary hex
  //More: http://nodejs.org/api/buffer.html#buffer_buffer
  readline: function (delimiter, encoding) {
    if (typeof delimiter === "undefined" || delimiter === null) { delimiter = "\r"; }
    if (typeof encoding  === "undefined" || encoding  === null) { encoding  = "utf8"; }
    // Delimiter buffer saved in closure
    var data = "";
    return function (emitter, buffer) {
      // Collect data
      data += buffer.toString(encoding);
      // Split collected data by delimiter
      var parts = data.split(delimiter);
      data = parts.pop();
      parts.forEach(function (part) {
        emitter.emit('data', part);
      });
    };
  },

  // Emit a data event every `length` bytes
  byteLength: function(length) {
    var data = new Buffer(0);
    return function(emitter, buffer){
      data = Buffer.concat([data, buffer]);
      while (data.length >= length) {
        var out = data.slice(0,length);
        data = data.slice(length);
        emitter.emit('data', out);
      }
    };
  }
};

}).call(this,require("buffer").Buffer)
},{"buffer":104}],21:[function(require,module,exports){
(function (process,Buffer,__dirname){
/*jslint node: true */
"use strict";

// Copyright 2011 Chris Williams <chris@iterativedesigns.com>

// Require serialport binding from pre-compiled binaries using
// node-pre-gyp, if something fails or package not available fallback
// to regular build from source.

var binary = require('node-pre-gyp');
var path = require('path');
var PACKAGE_JSON = path.join(__dirname,'package.json');
var binding_path = binary.find(path.resolve(PACKAGE_JSON));
var SerialPortBinding = require(binding_path);

var parsers = require('./parsers');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var fs = require('fs');
var stream = require('stream');
var path = require('path');
var async = require('async');

function SerialPortFactory() {

  var factory = this;

  // Removing check for valid BaudRates due to ticket: #140
  // var BAUDRATES = [500000, 230400, 115200, 57600, 38400, 19200, 9600, 4800, 2400, 1800, 1200, 600, 300, 200, 150, 134, 110, 75, 50];

  //  VALIDATION ARRAYS
  var DATABITS = [5, 6, 7, 8];
  var STOPBITS = [1, 1.5, 2];
  var PARITY = ['none', 'even', 'mark', 'odd', 'space'];
  var FLOWCONTROLS = ["XON", "XOFF", "XANY", "RTSCTS"];


  // Stuff from ReadStream, refactored for our usage:
  var kPoolSize = 40 * 1024;
  var kMinPoolSpace = 128;

  // The default options, can be overwritten in the 'SerialPort' constructor
  var _options = {
    baudrate: 9600,
    parity: 'none',
    rtscts: false,
    xon: false,
    xoff: false,
    xany: false,
    databits: 8,
    stopbits: 1,
    buffersize: 256,
    parser: parsers.raw
  };

  function SerialPort(path, options, openImmediately, callback) {

    var self = this;

    var args = Array.prototype.slice.call(arguments);
    callback = args.pop();
    if (typeof(callback) !== 'function') {
      callback = null;
    }

    options = (typeof options !== 'function') && options || {};

    openImmediately = (openImmediately === undefined || openImmediately === null) ? true : openImmediately;

    stream.Stream.call(this);

    callback = callback || function (err) {
      if (err) {
        if (self._events.error) {
          self.emit('error', err);
        } else {
          factory.emit('error', err);
        }
      }
    };

    var err;

    options.baudRate = options.baudRate || options.baudrate || _options.baudrate;

    options.dataBits = options.dataBits || options.databits || _options.databits;
    if (DATABITS.indexOf(options.dataBits) === -1) {
      err = new Error('Invalid "databits": ' + options.dataBits);
      callback(err);
      return;
    }

    options.stopBits = options.stopBits || options.stopbits || _options.stopbits;
    if (STOPBITS.indexOf(options.stopBits) === -1) {
      err = new Error('Invalid "stopbits": ' + options.stopbits);
      callback(err);
      return;
    }

    options.parity = options.parity || _options.parity;
    if (PARITY.indexOf(options.parity) === -1) {
      err = new Error('Invalid "parity": ' + options.parity);
      callback(err);
      return;
    }
    if (!path) {
      err = new Error('Invalid port specified: ' + path);
      callback(err);
      return;
    }

    // flush defaults, then update with provided details
    options.rtscts = _options.rtscts;
    options.xon = _options.xon;
    options.xoff = _options.xoff;
    options.xany = _options.xany;

    if (options.flowControl || options.flowcontrol) {
      var fc = options.flowControl || options.flowcontrol;

      if (typeof fc === 'boolean') {
        options.rtscts = true;
      } else {
        fc.forEach(function (flowControl) {
          var fcup = flowControl.toUpperCase();
          var idx = FLOWCONTROLS.indexOf(fcup);
          if (idx < 0) {
            var err = new Error('Invalid "flowControl": ' + fcup + ". Valid options: " + FLOWCONTROLS.join(", "));
            callback(err);
            return;
          } else {

            // "XON", "XOFF", "XANY", "DTRDTS", "RTSCTS"
            switch (idx) {
              case 0: options.xon = true; break;
              case 1: options.xoff = true; break;
              case 2: options.xany = true;  break;
              case 3: options.rtscts = true; break;
            }
          }
        });
      }
    }

    options.bufferSize = options.bufferSize || options.buffersize || _options.buffersize;
    options.parser = options.parser || _options.parser;

    options.dataCallback = options.dataCallback || function (data) {
      options.parser(self, data);
    };

    options.disconnectedCallback = options.disconnectedCallback || function () {
      if (self.closing) {
        return;
      }
      var err = new Error("Disconnected");
      self.emit("disconnect",err);
    };

    if (process.platform !== 'win32') {
      // All other platforms:
      this.fd = null;
      this.paused = true;
      this.bufferSize = options.bufferSize || 64 * 1024;
      this.readable = true;
      this.reading = false;
    }

    this.options = options;
    this.path = path;
    if (openImmediately) {
      process.nextTick(function () {
        self.open(callback);
      });
    }
  }

  util.inherits(SerialPort, stream.Stream);


  SerialPort.prototype.open = function (callback) {
    var self = this;
    this.paused = true;
    this.readable = true;
    this.reading = false;
    factory.SerialPortBinding.open(this.path, this.options, function (err, fd) {
      self.fd = fd;
      if (err) {
        if (callback) {
          callback(err);
        } else {
          // console.log("open");
          self.emit('error', err);
        }
        return;
      }
      if (process.platform !== 'win32') {
        self.paused = false;
        self.serialPoller = new factory.SerialPortBinding.SerialportPoller(self.fd, function () { self._read(); });
        self.serialPoller.start();
      }

      self.emit('open');
      if (callback) { callback(); }
    });
  };

  SerialPort.prototype.write = function (buffer, callback) {
    var self = this;
    if (!this.fd) {
      var err = new Error("Serialport not open.");
      if (callback) {
        callback(err);
      } else {
        // console.log("write-fd");
        self.emit('error', err);
      }
      return;
    }

    if (!Buffer.isBuffer(buffer)) {
      buffer = new Buffer(buffer);
    }
    factory.SerialPortBinding.write(this.fd, buffer, function (err, results) {
      if (callback) {
        callback(err, results);
      } else {
        if (err) {
          // console.log("write");
          self.emit('error', err);
        }
      }
    });
  };

  if (process.platform !== 'win32') {
    SerialPort.prototype._read = function () {
      var self = this;

      // console.log(">>READ");
      if (!self.readable || self.paused || self.reading) {
        return;
      }

      self.reading = true;

      if (!self.pool || self.pool.length - self.pool.used < kMinPoolSpace) {
        // discard the old pool. Can't add to the free list because
        // users might have refernces to slices on it.
        self.pool = null;

        // alloc new pool
        self.pool = new Buffer(kPoolSize);
        self.pool.used = 0;
      }

      // Grab another reference to the pool in the case that while we're in the
      // thread pool another read() finishes up the pool, and allocates a new
      // one.
      var toRead = Math.min(self.pool.length - self.pool.used, ~~self.bufferSize);
      var start = self.pool.used;

      function afterRead(err, bytesRead, readPool, bytesRequested) {
        self.reading = false;
        if (err) {

          if (err.code && err.code === 'EAGAIN') {
            if (self.fd >= 0) {
              self.serialPoller.start();
            }
          } else if (err.code && (err.code === "EBADF" || err.code === 'ENXIO' || (err.errno===-1 || err.code === 'UNKNOWN'))) {    // handle edge case were mac/unix doesn't clearly know the error.
            self.disconnected();
          } else {
            self.fd = null;
            // console.log("afterRead");
            self.emit('error', err);
            self.readable = false;
          }
        } else {
          // Since we will often not read the number of bytes requested,
          // let's mark the ones we didn't need as available again.
          self.pool.used -= bytesRequested - bytesRead;

          if (bytesRead === 0) {
            if (self.fd >= 0) {
              self.serialPoller.start();
            }
          } else {
            var b = self.pool.slice(start, start + bytesRead);

            // do not emit events if the stream is paused
            if (self.paused) {
              self.buffer = Buffer.concat([self.buffer, b]);
              return;
            } else {
              self._emitData(b);
            }

            // do not emit events anymore after we declared the stream unreadable
            if (!self.readable) {
              return;
            }
            self._read();
          }
        }

      }

      fs.read(self.fd, self.pool, self.pool.used, toRead, null, function (err, bytesRead) {
        var readPool = self.pool;
        var bytesRequested = toRead;
        afterRead(err, bytesRead, readPool, bytesRequested);
      });

      self.pool.used += toRead;
    };


    SerialPort.prototype._emitData = function (data) {
      this.options.dataCallback(data);
    };

    SerialPort.prototype.pause = function () {
      var self = this;
      self.paused = true;
    };

    SerialPort.prototype.resume = function () {
      var self = this;
      self.paused = false;

      if (self.buffer) {
        var buffer = self.buffer;
        self.buffer = null;
        self._emitData(buffer);
      }

      // No longer open?
      if (null === self.fd) {
        return;
      }

      self._read();
    };

  } // if !'win32'


  SerialPort.prototype.disconnected = function (callback) {
    var self = this;
    var fd = self.fd;

    // send notification of disconnect
    if (self.options.disconnectedCallback) {
      self.options.disconnectedCallback();
    } else {
      self.emit("disconnect");
    }
    self.paused = true;
    self.closing = true;

    self.emit("close");

    // clean up all other items
    fd = self.fd;

    try {
      factory.SerialPortBinding.close(fd, function (err) {
      });
    } catch (e) {
      //handle silently as we are just cleaning up the OS.
    }

    self.removeAllListeners();
    self.closing = false;
    self.fd = 0;

    if (process.platform !== 'win32') {
      self.readable = false;
      self.serialPoller.close();
    }

    if (callback) {
      callback();
    }
  };


  SerialPort.prototype.close = function (callback) {
    var self = this;

    var fd = self.fd;

    if (self.closing) {
      return;
    }
    if (!fd) {
      var err = new Error("Serialport not open.");
      if (callback) {
        callback(err);
      } else {
        // console.log("sp not open");
        self.emit('error', err);
      }
      return;
    }

    self.closing = true;
    try {
      factory.SerialPortBinding.close(fd, function (err) {

        if (err) {
          if (callback) {
            callback(err);
          } else {
            // console.log("doclose");
            self.emit('error', err);
          }
          return;
        }

        self.emit('close');
        self.removeAllListeners();
        self.closing = false;
        self.fd = 0;

        if (process.platform !== 'win32') {
          self.readable = false;
          self.serialPoller.close();
        }

        if (callback) {
          callback();
        }
      });
    } catch (ex) {
      self.closing = false;
      if (callback) {
        callback(ex);
      } else {
        self.emit('error', ex);
      }
    }
  };

  function listUnix(callback) {
    fs.readdir("/dev/serial/by-id", function (err, files) {
      if (err) {
        // if this directory is not found this could just be because it's not plugged in
        if (err.errno === 34) {
          return callback(null, []);
        }

        if (callback) {
          callback(err);
        } else {
          factory.emit('error', err);
        }
        return;
      }

      var dirName = "/dev/serial/by-id";
      async.map(files, function (file, callback) {
        var fileName = path.join(dirName, file);
        fs.readlink(fileName, function (err, link) {
          if (err) {
            if (callback) {
              callback(err);
            } else {
              factory.emit('error', err);
            }
            return;
          }

          link = path.resolve(dirName, link);
          callback(null, {
            comName: link,
            manufacturer: undefined,
            pnpId: file
          });
        });
      }, callback);
    });
  }

  SerialPort.prototype.flush = function (callback) {
    var self = this;
    var fd = self.fd;

    if (!fd) {
      var err = new Error("Serialport not open.");
      if (callback) {
        callback(err);
      } else {
        self.emit('error', err);
      }
      return;
    }

    factory.SerialPortBinding.flush(fd, function (err, result) {
      if (err) {
        if (callback) {
          callback(err, result);
        } else {
          self.emit('error', err);
        }
      } else {
        callback(err, result);
      }
    });
  };

  SerialPort.prototype.drain = function (callback) {
    var self = this;
    var fd = this.fd;

    if (!fd) {
      var err = new Error("Serialport not open.");
      if (callback) {
        callback(err);
      } else {
        self.emit('error', err);
      }
      return;
    }

    factory.SerialPortBinding.drain(fd, function (err, result) {
      if (err) {
        if (callback) {
          callback(err, result);
        } else {
          self.emit('error', err);
        }
      } else {
        callback(err, result);
      }
    });
  };

  factory.SerialPort = SerialPort;
  factory.parsers = parsers;
  factory.SerialPortBinding = SerialPortBinding;

  if (process.platform === 'win32') {
    factory.list = SerialPortBinding.list;
  } else if (process.platform === 'darwin') {
    factory.list = SerialPortBinding.list;
  } else {
    factory.list = listUnix;
  }

}

util.inherits(SerialPortFactory, EventEmitter);

module.exports = new SerialPortFactory();

}).call(this,require('_process'),require("buffer").Buffer,"/node_modules/cylon-firmata/node_modules/firmata/node_modules/serialport")
},{"./parsers":20,"_process":131,"async":7,"buffer":104,"events":122,"fs":101,"node-pre-gyp":8,"path":130,"stream":147,"util":151}],22:[function(require,module,exports){
/*
 * Analog Sensor driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require('cylon');

var AnalogSensor = module.exports = function AnalogSensor(opts) {
  AnalogSensor.__super__.constructor.apply(this, arguments);
  var extraParams = opts.extraParams || {};

  this.pin = this.device.pin;
  this.upperLimit = extraParams.upperLimit || 256;
  this.lowerLimit = extraParams.lowerLimit || 0;
  this.analogVal = null;

  this.commands = {
    analog_read: this.analogRead
  };
};

Cylon.Utils.subclass(AnalogSensor, Cylon.Driver);

AnalogSensor.prototype.analogRead = function() {
  return this.analogVal;
};

// Public: Starts the driver
//
// callback - params
//
// Returns null.
AnalogSensor.prototype.start = function(callback) {
  this.connection.analogRead(this.pin, function(err, readVal) {
    this.analogVal = readVal;
    this.device.emit('analogRead', readVal);

    if (readVal >= this.upperLimit) {
      this.device.emit('upperLimit', readVal);
    } else if (readVal <= this.lowerLimit) {
      this.device.emit('lowerLimit', readVal);
    }
  }.bind(this));

  callback();
};

AnalogSensor.prototype.halt = function(callback) {
  callback();
};

},{"cylon":46}],23:[function(require,module,exports){
/*
 * Cylon button driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require('cylon');

var Button = module.exports = function Button() {
  Button.__super__.constructor.apply(this, arguments);

  this.pin = this.device.pin;
  this.pressed = false;
  this.prevState = 0;

  this.commands = {
    is_pressed: this.isPressed
  };
};

Cylon.Utils.subclass(Button, Cylon.Driver);

Button.prototype.isPressed = function() {
  return this.pressed;
};

// Public: Starts the driver
//
// callback - params
//
// Returns null.
Button.prototype.start = function(callback) {
  this.connection.digitalRead(this.pin, function(err, data) {
    var event = (data === 1) ? 'press' : 'release';

    if (data === 0) {
      if (this.prevState === 1) {
        this.device.emit('push');
      }
    }

    this.prevState = data;
    this.pressed = (data === 1);

    this.device.emit(event);
  }.bind(this));

  callback();
};

Button.prototype.halt = function(callback) {
  callback();
};

},{"cylon":46}],24:[function(require,module,exports){
/*
 * Continuous Servo driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require('cylon');

var ContinuousServo = module.exports = function ContinuousServo() {
  ContinuousServo.__super__.constructor.apply(this, arguments);
  this.pin = this.device.pin;
  this.angleValue = 0;

  this.commands = {
    clockwise: this.clockwise,
    counter_clockwise: this.counterClockwise,
    stop: this.stop
  };
};

Cylon.Utils.subclass(ContinuousServo, Cylon.Driver);

ContinuousServo.prototype.start = function(callback) {
  callback();
};

ContinuousServo.prototype.halt = function(callback) {
  callback();
};

// Public: Stops the driver
//
// Returns null.
ContinuousServo.prototype.stop = function() {
  return this.connection.servoWrite(this.pin, 90);
};

// Public: Turns the servo to go clockwise, if the driver is continuous.
//
// Returns true | nil.
ContinuousServo.prototype.clockwise = function() {
  Cylon.Logger.debug("Servo on pin " + this.pin + " turning clockwise");
  return this.connection.servoWrite(this.pin, 180);
};

// Public: Turns the servo to go counter clockwise, if the driver is continuous.
//
// Returns true | nil.
ContinuousServo.prototype.counterClockwise = function() {
  Cylon.Logger.debug("Servo on pin " + this.pin + " turning counter clockwise");
  return this.connection.servoWrite(this.pin, 89);
};

},{"cylon":46}],25:[function(require,module,exports){
/*
 * DirectPin driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require('cylon');

var DirectPin = module.exports = function DirectPin() {
  DirectPin.__super__.constructor.apply(this, arguments);

  this.pin = this.device.pin;
  this.dReadSet = false;
  this.aReadSet = false;
  this.high = false;

  this.commands = {
    digital_read: this.digitalRead,
    digital_write: this.digitalWrite,

    analog_read: this.analogRead,
    analog_write: this.analogWrite,

    pwm_write: this.pwmWrite,
    servo_write: this.servoWrite,
  };
};

Cylon.Utils.subclass(DirectPin, Cylon.Driver);

DirectPin.prototype.start = function(callback) {
  callback();
};

DirectPin.prototype.halt = function(callback) {
  callback();
};

// Public: DigitalWrite
//
// Returns null.
DirectPin.prototype.digitalWrite = function(value) {
  this.connection.digitalWrite(this.pin, value);
};

// Public: DigitalRead
// params:
//  callback: to be executed upon reading the pin state.
//
// Returns null.
DirectPin.prototype.digitalRead = function(callback) {
  if (!this.dReadSet) {
    this.connection.digitalRead(this.pin, callback);
  }
  this.dReadSet = true;
};

// Public: AnalogWrite
//
// Returns null.
DirectPin.prototype.analogWrite = function(value) {
  this.connection.analogWrite(this.pin, value);
};

// Public: AnalogRead
// params:
//  callback: to be executed upon reading the pin state.
//
// Returns null.
DirectPin.prototype.analogRead = function(callback) {
  if (!this.aReadSet) {
    this.connection.analogRead(this.pin, callback);
  }
  this.aReadSet = true;
};
// Public: ServoWrite

//
// Returns null.
DirectPin.prototype.servoWrite = function(angle) {
  return this.connection.servoWrite(this.pin, angle);
};

// Public: PwmWrite
//
// Returns null.
DirectPin.prototype.pwmWrite = function(value) {
  return this.connection.pwmWrite(this.pin, value);
};

},{"cylon":46}],26:[function(require,module,exports){
(function (__dirname){
/*
 * SHARP IR Range Sensor driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require('cylon');
var path = require('path');

var IrRangeSensor = module.exports = function IrRangeSensor(opts) {
  IrRangeSensor.__super__.constructor.apply(this, arguments);

  if (opts.extraParams.model) {
    this.rangeTable = require(path.join(__dirname, './ir_range_tables/' + opts.extraParams.model.toLowerCase() + '.js'));
  } else {
    this.rangeTable = {};
    Cylon.Logger.info("IRSensor CANNOT calculate distance (range and rangecm) without IR model number.");
    Cylon.Logger.info("Only analogRead() values will be available.");
    Cylon.Logger.info("On how to generate a distance range table check ./node_modules/cylon-gpio/utilities/generate-ir-rage-sensor-table.js.");
    Cylon.Logger.info("Try Passing model number as a device parameter.");
  }

  this.analogVal = 0;
  this.distanceCm = 0;
  this.distanceIn = 0;

  IrRangeSensor.__super__.constructor.apply(this, arguments);

  this.commands = {
    analog_read: this.analogRead,
    range_cm: this.rangeCm,
    range: this.range
  };
};

Cylon.Utils.subclass(IrRangeSensor, Cylon.Driver);

// Public: Starts the driver
//
// Returns null.
IrRangeSensor.prototype.start = function(callback) {
  this.device.connection.analogRead(this.device.pin, function(err, readVal) {
    this._calcDistances(readVal);
    this.device.emit('range', this.distanceIn);
    this.device.emit('rangeCm', this.distanceCm);
  }.bind(this));

  callback();
};

IrRangeSensor.prototype.halt = function(callback) {
  callback();
};

IrRangeSensor.prototype._calcDistances = function(analogVal) {
  var distance = 0,
      tmpRange = 0;

  for (var range in this.rangeTable.rangeDistances){
    tmpRange = parseInt(range);
    if ((analogVal <= tmpRange) && (analogVal + 5 > tmpRange)){
      distance = this.rangeTable.rangeDistances[range].dist;
      break;
    }
  }

  this.analogVal = analogVal;
  this.distanceCm = distance;
  this.distanceIn = distance / 2.54;
};

IrRangeSensor.prototype.analogRead = function() {
  return this.analogVal || 0;
};

IrRangeSensor.prototype.rangeCm = function() {
  return this.distanceCm;
};

IrRangeSensor.prototype.range = function() {
  return this.distanceIn;
};

}).call(this,"/node_modules/cylon-gpio/lib")
},{"cylon":46,"path":130}],27:[function(require,module,exports){
/*
 * LED driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

var Led = module.exports = function Led(opts) {
  Led.__super__.constructor.apply(this, arguments);

  this.pin = this.device.pin;
  this.freq = opts.extraParams.freq || null;
  this.isHigh = false;
  this.brightnessValue = 0;
  this.pwmScale = opts.extraParams.pwmScale || { bottom: 0, top: 255 };


  this.commands = {
    is_on: this.isOn,

    turn_on: this.turnOn,
    turn_off: this.turnOff,
    toggle: this.toggle,

    brightness: this.brightness,
    current_brightness: this.currentBrightness
  };
};

Cylon.Utils.subclass(Led, Cylon.Driver);

Led.prototype.start = function(callback) {
  callback();
};

Led.prototype.halt = function(callback) {
  callback();
};

// Public: Turns LED on.
//
// Returns null.
Led.prototype.turnOn = function() {
  this.isHigh = true;
  this.connection.digitalWrite(this.pin, 1);
};

// Public: Turns LED off.
//
// Returns null.
Led.prototype.turnOff = function() {
  this.isHigh = false;
  this.connection.digitalWrite(this.pin, 0);
};

// Public: Turns the LED on, or off, depending on if it is already off, or
// on, respectively.
//
// Returns null.
Led.prototype.toggle = function() {
  if (this.isHigh) {
    this.turnOff();
  } else {
    this.turnOn();
  }
};

Led.prototype.currentBrightness = function() {
  return this.brightnessValue;
};

// Public: Sets brightness of the led to the specified brightness value
// passed to brightness(brightness_int) using PWM, brightness can be any
// integer value between 0 and 255.
//
// value - params, The brightness level
//
// Returns null.
Led.prototype.brightness = function(value) {
  var scaledDuty = (value).fromScale(this.pwmScale.bottom, this.pwmScale.top);

  this.connection.pwmWrite(this.pin, scaledDuty, this.freq);
  this.brightnessValue = value;
};

Led.prototype.isOn = function(){
  return this.isHigh;
};

},{"cylon":46}],28:[function(require,module,exports){
/*
 * Cylon Makey Button driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require('cylon');

var MakeyButton = module.exports = function MakeyButton() {
  MakeyButton.__super__.constructor.apply(this, arguments);

  this.pin = this.device.pin;
  this.isPressed = false;
  this.currentValue = 0;
  this.data = [];
};

Cylon.Utils.subclass(MakeyButton, Cylon.Driver);

// Public: Starts the driver
//
// callback - params
//
// Returns null.
MakeyButton.prototype.start = function(callback) {
  this.connection.digitalRead(this.pin, function(err, data) {
    this.currentValue = data;
  }.bind(this));

  Cylon.Utils.every(50, function() {
    this.data.push(this.currentValue);
    if (this.data.length > 5) {
      this.data.shift();
    }

    if (this.averageData() <= 0.5 && !this.isPressed) {
      this.isPressed = true;
      this.device.emit('push');
    } else if (this.averageData() > 0.5 && this.isPressed) {
      this.isPressed = false;
      this.device.emit('release');
    }
  }.bind(this));

  callback();
};

MakeyButton.prototype.halt = function(callback) {
  callback();
};

MakeyButton.prototype.averageData = function() {
  var result = 0;

  if (this.data.length > 0) {
    this.data.forEach(function(n) { result += n; });
    result = result / this.data.length;
  }

  return result;
};

},{"cylon":46}],29:[function(require,module,exports){
/*
 * Maxbotix ultrasonic rangefinder driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require('cylon');

var Maxbotix = module.exports = function Maxbotix() {
  Maxbotix.__super__.constructor.apply(this, arguments);

  this.pin = this.device.pin;
  this.analogValue = 0;

  this.commands = {
    range: this.range,
    rangeCm: this.rangeCm
  };
};

Cylon.Utils.subclass(Maxbotix, Cylon.Driver);

// Public: Stops the driver
//
// Returns null.
Maxbotix.prototype.start = function(callback) {
  Cylon.Logger.debug("Maxbotix on pin " + this.pin + " started");

  this.device.connection.analogRead(this.pin, function(err, readVal) {
    this.analogValue = readVal;
    this.device.emit('range', this.range());
    this.device.emit('rangeCm', this.rangeCm());
  }.bind(this));

  callback();
};

Maxbotix.prototype.halt = function(callback) {
  callback();
};

// Public: Returns the distance measured by the sonar in inches.
//
// Returns number.
Maxbotix.prototype.range = function() {
  return (254.0 / 1024.0) * 2.0 * this.analogValue;
};

// Public: Returns the distance measured by the sonar in cm.
//
// Returns number.
Maxbotix.prototype.rangeCm = function() {
  return (this.analogValue / 2.0) * 2.54;
};

},{"cylon":46}],30:[function(require,module,exports){
/*
 * Motor driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require('cylon');

var Motor = module.exports = function Motor(opts) {
  Motor.__super__.constructor.apply(this, arguments);

  this.pin = this.device.pin;
  this.freq = opts.extraParams.freq || null;
  this.speedValue = 0;
  this.isOn = false;
  this.pwmScale = opts.extraParams.pwmScale || { bottom: 0, top: 255 };

  this.commands = {
    turn_on: this.turnOn,
    turn_off: this.turnOff,
    toggle: this.toggle,
    speed: this.speed,
    current_speed: this.currentSpeed
  };
};

Cylon.Utils.subclass(Motor, Cylon.Driver);

Motor.prototype.start = function(callback) {
  callback();
};

Motor.prototype.halt = function(callback) {
  callback();
};

// Public: Starts the motor.
//
// Returns nil.
Motor.prototype.turnOn = function() {
  this.isOn = true;
  this.connection.digitalWrite(this.pin, 1);
};

// Public: Stops the motor.
//
// Returns nil.
Motor.prototype.turnOff = function() {
  this.isOn = false;
  this.connection.digitalWrite(this.pin, 0);
};

// Public: Sets the state of the motor to the oposite of the current state,
// if motor is on then sets it to off.
//
// Returns true | nil.
Motor.prototype.toggle = function() {
  if (this.isOn) {
    this.turnOff();
  } else {
    this.turnOn();
  }
};

// Public: Returns the current speed of the motor as an integer between 0 and 255.
//
// Returns integer.
Motor.prototype.currentSpeed = function() {
  return this.speedValue;
};

// Public: Sets the speed of the motor to the value provided in the
// speed param, speed value must be an integer between 0 and 255.
//
// value- params
//
// Returns integer.
Motor.prototype.speed = function(value) {
  var scaledDuty = (value).fromScale(this.pwmScale.bottom, this.pwmScale.top);

  this.connection.pwmWrite(this.pin, scaledDuty, this.freq);
  this.speedValue = value;
  this.isOn = this.speedValue > 0;
};

},{"cylon":46}],31:[function(require,module,exports){
/*
 * Servo driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require('cylon');

var Servo = module.exports = function Servo(opts) {
  Servo.__super__.constructor.apply(this, arguments);

  this.pin = this.device.pin;
  this.angleValue = 0;

  this.angleRange = opts.extraParams.range || { min: 20, max: 160 };
  this.freq = opts.extraParams.freq || null;
  this.pulseWidth = opts.extraParams.pulseWidth || { min: 500, max: 2400 };
  this.pwmScale = opts.extraParams.pwmScale || { bottom: 0, top: 180 };

  this.commands = {
    angle: this.angle,
    current_angle: this.currentAngle
  };
};

Cylon.Utils.subclass(Servo, Cylon.Driver);

Servo.prototype.start = function(callback) {
  callback();
};

Servo.prototype.halt = function(callback) {
  callback();
};

// Public: Returns the current angle of the servo, an integer value
// between 0 and 180.
//
// Returns an integer.
Servo.prototype.currentAngle = function() {
  return this.angleValue;
};

// Public: Moves the servo to the specified angle, angle must be an
// integer value between 0 and 180.
//
// value - params
//
// Returns null.
Servo.prototype.angle = function(value) {
  var scaledDuty = (this.safeAngle(value)).fromScale(this.pwmScale.bottom, this.pwmScale.top);

  this.connection.servoWrite(this.pin, scaledDuty, this.freq, this.pulseWidth);
  this.angleValue = value;
};

// Public: Saves an specified angle, angle must be an
// integer value between 0 and 180.
//
// value - params
//
// Returns null.
Servo.prototype.safeAngle = function(value) {
  if (value < this.angleRange.min) {
      value = this.angleRange.min;
  } else {
    if (value > this.angleRange.max) {
      value = this.angleRange.max;
    }
  }
  return value;
};

},{"cylon":46}],32:[function(require,module,exports){
/*
 * BlinkM driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var Cylon = require('cylon');
var TO_RGB = 0x6e,
    FADE_TO_RGB = 0x63,
    FADE_TO_HSB = 0x68,
    FADE_TO_RND_RGB = 0x43,
    FADE_TO_RND_HSB = 0x48,
    PLAY_LIGHT_SCRIPT = 0x70,
    STOP_SCRIPT = 0x6f,
    SET_FADE = 0x66,
    SET_TIME = 0x74,
    GET_RGB = 0x67,
    GET_ADDRESS = 0x61,
    SET_ADDRESS = 0x41,
    GET_FIRMWARE = 0x5a;

var BlinkM = module.exports = function BlinkM() {
  BlinkM.__super__.constructor.apply(this, arguments);
  this.address = 0x09;

  this.setupCommands([
    'goToRGB', 'fadeToRGB', 'fadeToHSB', 'fadeToRandomRGB',
    'fadeToRandomHSB', 'playLightScript', 'stopScript', 'setFadeSpeed',
    'setTimeAdjust', 'getRGBColor', 'setAddress', 'getAddress', 'getFirmware'
  ]);
};

Cylon.Utils.subclass(BlinkM, Cylon.Driver);

// Public: Starts the driver.
//
// Returns null.
BlinkM.prototype.start = function(callback) {
  callback();
};

BlinkM.prototype.halt = function(callback) {
  callback();
};

// Public: Sets the color of the BlinkM RGB LED to the specified
// combination of RGB color provided.
// (red, green and blue values should be between 0 and 255)
//
// r- params, Red value
// g - params, Green value
// b - params,  Blue value
// cb - params, cb value
//
// Returns true | false.
BlinkM.prototype.goToRGB = function(r, g, b, cb) {
  this.connection.i2cWrite(this.address, TO_RGB, [r, g, b], cb);
};

// Public: Fades the color of the BlinkM RGB LED to the specified
// combination of RGB color provided.
// (red, green and blue values should be between 0 and 255)
//
// r- params, Red value
// g - params, Green value
// b - params,  Blue value
// cb - params, cb value
//
// Returns true | false.
BlinkM.prototype.fadeToRGB = function(r, g, b, cb) {
  this.connection.i2cWrite(this.address, FADE_TO_RGB, [r, g, b], cb);
};

// Public: Fades the color of the BlinkM RGB LED to the specified
// combination of HSB provided.
//
// h - params, Hue value
// s - params, Saturation value
// b - params,  Brightness value
// cb - params, cb value
//
// Returns true | false.
BlinkM.prototype.fadeToHSB = function(h, s, b, cb) {
  this.connection.i2cWrite(this.address, FADE_TO_HSB, [h, s, b], cb);
};

// Public: Fades the color of the BlinkM RGB LED to a random
//combination of RGB color.
// (red, green and blue values should be between 0 and 255)
//
// r- params, Red value
// g - params, Green value
// b - params,  Blue value
// cb - params, cb value
//
// Returns null.
BlinkM.prototype.fadeToRandomRGB = function(r, g, b, cb) {
  this.connection.i2cWrite(this.address, FADE_TO_RND_RGB, [r, g, b], cb);
};

// Public: Fades the color of the BlinkM RGB LED to a random
// combination of HSB .
//
// h - params, Hue value
// s - params, Saturation value
// b - params,  Brightness value
// cb - params, cb value
//
// Returns null.
BlinkM.prototype.fadeToRandomHSB = function(h, s, b, cb) {
  this.connection.i2cWrite(this.address, FADE_TO_RND_HSB, [h, s, b], cb);
};

// A repeat value of 0 causes the script to execute until receiving the stopScript command.
// light script ids available in the blinkM datasheet.

// Public: Plays a light script for the BlinkM RGB LED.
//
// id - params
// repeats - params
// startAtLine - params
// cb - params, cb value
//
// Returns null.
BlinkM.prototype.playLightScript = function(id, repeats, startAtLine, cb) {
  this.connection.i2cWrite(this.address, PLAY_LIGHT_SCRIPT, [id, repeats, startAtLine], cb);
};

// Public: Stops an specific script for the BlinkM RGB LED.
//
// Returns null.
BlinkM.prototype.stopScript = function(cb) {
  this.connection.i2cWrite(this.address, STOP_SCRIPT, [], cb);
};

// Speed must be an integer from 1 to 255
// Public: Sets a fade to an specific speed for the BlinkM RGB LED.
//
// speed - params
// cb - params (callback function)
//
// Returns null.
BlinkM.prototype.setFadeSpeed = function(speed, cb) {
  this.connection.i2cWrite(this.address, SET_FADE, [speed], cb);
};

// Time must be an integer betweeb -128 and 127, 0 resets the time.
// This affects the duration of the scripts being played.
// Public: Sets a time adjust for the BlinkM RGB LED.
//
// time - params
// cb - params (callback function)
//
// Returns null.
BlinkM.prototype.setTimeAdjust = function(time, cb) {
  this.connection.i2cWrite(this.address, SET_TIME, [time], cb);
};

// Public: Returns an array containing the RGB values for the current color.
// (all integer between 0 and 255)
//
// Returns [r,g,b]
BlinkM.prototype.getRGBColor = function(cb) {
  return this.connection.i2cRead(this.address, GET_RGB, 3, cb);
};

// Public: Returns an string describing the I2C addresss being used.
//
// Returns String
BlinkM.prototype.getAddress = function(cb) {
  return this.connection.i2cRead(this.address, GET_ADDRESS, 1, cb);
};

// Public: Sets an address to the driver.
//
// address - params
// cb - params (callback function)
//
// Returns null.
BlinkM.prototype.setAddress = function(address, cb) {
  this.connection.i2cWrite(this.address, SET_ADDRESS, [address, 0xd0, 0x0d, address], cb);
  this.address = address;
};

// Public: Returns an sring describing the I2C firmware version being used.
//
// cb - params (callback function)
//
// Returns String
BlinkM.prototype.getFirmware = function(cb) {
  return this.connection.i2cRead(this.address, GET_FIRMWARE, 1, cb);
};

},{"cylon":46}],33:[function(require,module,exports){
/*
 * MPL115A2 I2C Barometric Pressure + Temperature sensor driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-14 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var Cylon = require('cylon');
var BMP180_REGISTER_CALIBRATION = 0xAA,
    BMP180_REGISTER_CONTROL = 0xF4,
    BMP180_REGISTER_TEMPDATA = 0xF6,
    BMP180_REGISTER_PRESSUREDATA = 0xF6,
    BMP180_REGISTER_READTEMPCMD = 0x2E,
    BMP180_REGISTER_READPRESSURECMD = 0x34;

function toUShort(b1, b2) {
  return (b1 << 8) | b2;
}

function toSShort(b1, b2) {
  return ((((b1 << 8) | b2) << 16) >> 16);
}

var Bmp180 = module.exports = function Bmp180() {
  Bmp180.__super__.constructor.apply(this, arguments);

  this.address = 0x77;

  this.commands = {
    get_pressure: this.getPressure,
    get_temperature: this.getTemperature,
    get_altitude: this.getAltitude
  };
};

Cylon.Utils.subclass(Bmp180, Cylon.Driver);

Bmp180.prototype.start = function(callback) {
  this.readCoefficients(callback);
};

Bmp180.prototype.halt = function(callback) {
  callback();
};

Bmp180.prototype.getPressure = function(mode, callback) {
  var self = this;
  // need temperature for calibration
  var x1 = 0,
      x2 = 0,
      x3 = 0,
      b3 = 0,
      b5 = 0,
      b6 = 0,
      p = 0,
      b4 = 0,
      b7 = 0,
      temp = 0.0;

  this.getRawTemp(function(err, rawTemp) {
    if (err) {
      callback(err, null);
    } else {
      x1 = ((rawTemp - self.ac6) * self.ac5) >> 15;
      x2 = Math.ceil((self.mc << 11) / (x1 + self.md));
      b5 = x1 + x2;
      temp = ((b5 + 8) >> 4) / 10.0;

      self.getRawPressure(mode, function(err, rawPress) {
          if (err) {
            callback(err, null);
          } else {
            var modeVal = parseInt(mode);

            b6 = b5 - 4000;
            x1 = (self.b2 * (b6 * b6) >> 12) >> 11;
            x2 = (self.ac2 * b6) >> 11;
            x3 = x1 + x2;
            b3 = Math.ceil((((self.ac1 * 4 + x3) << modeVal) + 2) / 4);

            x1 = (self.ac3 * b6) >> 13;
            x2 = (self.b1 * ((b6 * b6) >> 12)) >> 16;
            x3 = ((x1 + x2) + 2) >> 2;
            b4 = (self.ac4 * (x3 + 32768)) >> 15;
            b7 = (rawPress - b3) * (50000 >> modeVal);

            if (b7 < 0x80000000) {
                p = Math.ceil((b7 * 2) / b4);
            } else {
                p = Math.ceil((b7 / b4) * 2);
            }

            x1 = (p >> 8) * (p >> 8);
            x1 = (x1 * 3038) >> 16;
            x2 = (-7357 * p) >> 16;

            p = p + ((x1 + x2 + 3791) >> 4);

            callback(err, { temp: temp, press:p });
          }
      });
    }
  });
};

Bmp180.prototype.getTemperature = function(callback) {
  var self = this;

  var x1 = 0,
      x2 = 0,
      b5 = 0,
      temp = 0.0;

  this.getRawTemp(function(err, rawTemp) {
      if (err) {
        callback(err, null);
      } else {
        x1 = ((rawTemp - self.ac6) * self.ac5) >> 15;
        x2 = Math.ceil((self.mc << 11) / (x1 + self.md));
        b5 = x1 + x2;
        temp = ((b5 + 8) >> 4) / 10.0;

        callback(err, { temp:temp });
      }
  });
};

Bmp180.prototype.getAltitude = function(mode, seaLevelPressure, callback) {
  if (seaLevelPressure == null) { seaLevelPressure = 101325; }

  this.getPressure(mode, function(err, values) {
      if (err) {
        callback(err, null);
      } else {
        var altitude = 44330.0 * (1.0 - Math.pow(values.press / seaLevelPressure, 0.1903));
        callback(err, { temp: values.temp, press: values.press, alt: altitude });
      }
  });
};

Bmp180.prototype.readCoefficients = function(callback) {
    var self = this;

    this.connection.i2cRead(this.address, BMP180_REGISTER_CALIBRATION, 22, function(err, data) {
        if (err) {
          callback(err, null);
        } else {
          self.ac1 = toSShort(data[0],  data[1]);
          self.ac2 = toSShort(data[2],  data[3]);
          self.ac3 = toSShort(data[4],  data[5]);
          self.ac4 = toUShort(data[6],  data[7]);
          self.ac5 = toUShort(data[8],  data[9]);
          self.ac6 = toUShort(data[10], data[11]);

          self.b1 = toSShort(data[12], data[13]);
          self.b2 = toSShort(data[14], data[15]);

          self.mb = toSShort(data[16], data[17]);
          self.mc = toSShort(data[18], data[19]);
          self.md = toSShort(data[20], data[21]);

          callback(err, data);
          self.device.emit('start');
        }
    });
};

Bmp180.prototype.getRawTemp = function(callback) {
  var self = this;

  this.connection.i2cWrite(self.address, BMP180_REGISTER_CONTROL, [BMP180_REGISTER_READTEMPCMD], function(err) {
      if (err) {
        callback(err, null);
      } else {
        setTimeout(function() {
          self.connection.i2cRead(self.address, BMP180_REGISTER_TEMPDATA, 2, function(err, data) {
            if (err) {
              callback(err, null);
            } else {
              var rawTemp = toUShort(data[0], data[1]);
              callback(null, rawTemp);
            }
          });
        }, 5);
      }
  });
};

Bmp180.prototype.getRawPressure = function(mode, callback) {
    var self = this;

    var modeVal = parseInt(mode);

    if (isNaN(modeVal) || modeVal < 0 || modeVal > 3) {
      callback(new Error("Invalid pressure sensing mode."));
    }

    this.connection.i2cWrite(self.address, BMP180_REGISTER_CONTROL, [BMP180_REGISTER_READPRESSURECMD], function(err) {
        if (err) {
          callback(err, null);
        } else {
          var waitTime;
          switch(modeVal) {
            case 0:
              waitTime = 5;
              break;
            case 1:
              waitTime = 8;
              break;
            case 2:
              waitTime = 14;
              break;
            case 3:
              waitTime = 26;
              break;
            default:
              waitTime = 8;
              break;
          }
          setTimeout(function() {
            self.connection.i2cRead(self.address, BMP180_REGISTER_PRESSUREDATA, 3, function(err, data) {
              if (err) {
                callback(err, null);
              } else {
                var msb = data[0];
                var lsb = data[1];
                var xlsb = data[2];
                var rawPress = ((msb << 16) + (lsb << 8) + xlsb) >> (8-modeVal);
                callback(null, rawPress);
              }
            });
          }, waitTime);
        }
    });
};

},{"cylon":46}],34:[function(require,module,exports){
(function (Buffer){
/*
 * HMC6352 Digital Compass driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var Cylon = require('cylon');

var Hmc6352 = module.exports = function Hmc6352() {
  Hmc6352.__super__.constructor.apply(this, arguments);
  this.address = 0x42 >> 1; // to accomodate the 7-bit device addressing
  this.commands = {
    heading: this.heading
  };
};

Cylon.Utils.subclass(Hmc6352, Cylon.Driver);

// Public: Starts the driver.
//
// Returns null.
Hmc6352.prototype.start = function(callback) {
  this.connection.i2cWrite(this.address, this.commandBytes('A'));
  callback();
};

Hmc6352.prototype.halt = function(callback) {
  callback();
};

// Public: Returns the heading data for the compass
//
// callback - params
//
// Returns null.
Hmc6352.prototype.heading = function(callback) {
  this.connection.i2cRead(this.address, this.commandBytes('A'), 2, function(err, data) {
    if ('function' === typeof(callback)) { callback(err, this.parseHeading(data)); }
  }.bind(this));
};

// Public: commandBytes
//
// s - params
//
// Returns null.
Hmc6352.prototype.commandBytes = function(s) {
  return new Buffer(s, 'ascii');
};

// Public: parseHeading
//
// val - params
//
// Returns a number representing the current heading
Hmc6352.prototype.parseHeading = function(val) {
  return (val[1] + val[0] * 256) / 10.0;
};

}).call(this,require("buffer").Buffer)
},{"buffer":104,"cylon":46}],35:[function(require,module,exports){
/*
 * LCD display driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var Cylon = require('cylon');

// i2c commands
var CLEARDISPLAY = 0x01,
    RETURNHOME = 0x02,
    ENTRYMODESET = 0x04,
    DISPLAYCONTROL = 0x08,
    CURSORSHIFT = 0x10,
    FUNCTIONSET = 0x20,
    SETCGRAMADDR = 0x40,
    SETDDRAMADDR = 0x80;

// flags for display entry mode
var ENTRYRIGHT = 0x00,
    ENTRYLEFT = 0x02,
    ENTRYSHIFTINCREMENT = 0x01,
    ENTRYSHIFTDECREMENT = 0x00;

// flags for display on/off control
var DISPLAYON = 0x04,
    DISPLAYOFF = 0x00,
    CURSORON = 0x02,
    CURSOROFF = 0x00,
    BLINKON = 0x01,
    BLINKOFF = 0x00;

// flags for display/cursor shift
var DISPLAYMOVE = 0x08,
    CURSORMOVE = 0x00,
    MOVERIGHT = 0x04,
    MOVELEFT = 0x00;

// flags for function set
var EIGHTBITMODE = 0x10,
    FOURBITMODE = 0x00,
    TWOLINE = 0x08,
    ONELINE = 0x00,
    FIVExTENDOTS = 0x04,
    FIVExEIGHTDOTS = 0x00;

// flags for backlight control
var BACKLIGHT = 0x08,
    NOBACKLIGHT = 0x00;

var En = 0x04, // Enable bit
    Rw = 0x02, // Read/Write bit
    Rs = 0x01; // Register select bit

var LCD = module.exports = function LCD() {
  LCD.__super__.constructor.apply(this, arguments);

  this.address = 0x27;
  this._backlightVal = NOBACKLIGHT;
  this._displayfunction = FOURBITMODE | TWOLINE | FIVExEIGHTDOTS;
  this._displaycontrol = DISPLAYON | CURSOROFF | BLINKOFF;
  this._displaymode = ENTRYLEFT | ENTRYSHIFTDECREMENT;

  this.setupCommands([
    'clear', 'home', 'setCursor', 'displayOff', 'displayOn',
    'cursorOff', 'cursorOn', 'blinkOff', 'blinkOn', 'backlightOff',
    'backlightOn', 'print'
  ]);
};

Cylon.Utils.subclass(LCD, Cylon.Driver);

LCD.prototype.start = function(callback) {
  Cylon.Utils.sleep(50);

  this._expanderWrite(this._backlightVal);
  Cylon.Utils.sleep(100);

  this._write4bits(0x03 << 4);
  Cylon.Utils.sleep(4);

  this._write4bits(0x03 << 4);
  Cylon.Utils.sleep(4);

  this._write4bits(0x03 << 4);
  this._write4bits(0x02 << 4);
  this._sendCommand(FUNCTIONSET | this._displayfunction);

  this.displayOn();
  this.clear();

  // Initialize to default text direction (for roman languages) & set the entry mode
  this._sendCommand(ENTRYMODESET | this._displaymode);
  this.home();

  every(0, function() {
    this._expanderWrite(this._backlightVal);
  }.bind(this));

  callback();
};

LCD.prototype.halt = function(callback) {
  callback();
};

// clear display
LCD.prototype.clear = function() {
  this._sendCommand(CLEARDISPLAY);
  Cylon.Utils.sleep(2);
};

// move display cursor to home
LCD.prototype.home = function() {
  this._sendCommand(RETURNHOME);
  Cylon.Utils.sleep(2);
};

// move display cursor to col, row
LCD.prototype.setCursor = function(col, row) {
  var row_offsets = [0x00, 0x40, 0x14, 0x54];
  this._sendCommand(SETDDRAMADDR | (col + row_offsets[row]));
};

LCD.prototype.displayOff = function() {
  this._displaycontrol &= ~DISPLAYON;
  this._sendCommand(DISPLAYCONTROL | this._displaycontrol);
};

LCD.prototype.displayOn = function() {
  this._displaycontrol |= DISPLAYON;
  this._sendCommand(DISPLAYCONTROL | this._displaycontrol);
};

LCD.prototype.cursorOff = function() {
  this._displaycontrol &= ~CURSORON;
  this._sendCommand(DISPLAYCONTROL | this._displaycontrol);
};

LCD.prototype.cursorOn = function() {
  this._displaycontrol |= CURSORON;
  this._sendCommand(DISPLAYCONTROL | this._displaycontrol);
};

LCD.prototype.blinkOff = function() {
  this._displaycontrol &= ~BLINKON;
  this._sendCommand(DISPLAYCONTROL | this._displaycontrol);
};

LCD.prototype.blinkOn = function() {
  this._displaycontrol |= BLINKON;
  this._sendCommand(DISPLAYCONTROL | this._displaycontrol);
};

LCD.prototype.backlightOff = function() {
  this._backlightVal = NOBACKLIGHT;
  this._expanderWrite(0);
};

LCD.prototype.backlightOn = function() {
  this._backlightVal = BACKLIGHT;
  this._expanderWrite(0);
};

LCD.prototype.print = function(str) {
  var chars = str.split('');

  for (var i = 0; i < chars.length; i++) {
    this._writeData(chars[i].charCodeAt(0));
  }
};

LCD.prototype._write4bits = function(val) {
  this._expanderWrite(val);
  this._pulseEnable(val);
};

LCD.prototype._expanderWrite = function(data) {
  this.connection.i2cWrite(this.address, (data | this._backlightVal) & 0xFF);
};

LCD.prototype._pulseEnable = function(data) {
  this._expanderWrite(data | En);
  Cylon.Utils.sleep(0.0001);
  this._expanderWrite(data & ~En);
  Cylon.Utils.sleep(0.05);
};

LCD.prototype._sendCommand = function(value) {
  this._sendData(value, 0);
};

LCD.prototype._writeData = function(value) {
  this._sendData(value, Rs);
};

LCD.prototype._sendData = function(val, mode) {
  var highnib = val & 0xf0,
      lownib = (val << 4) & 0xf0;

  this._write4bits(highnib | mode);
  this._write4bits(lownib | mode);
};

},{"cylon":46}],36:[function(require,module,exports){
"use strict";

var Cylon = require('cylon');

var WHO_AM_I_G = 0x0F,
    CTRL_REG1_G = 0x20,
    CTRL_REG2_G = 0x21,
    CTRL_REG3_G = 0x22,
    CTRL_REG4_G = 0x23,
    CTRL_REG5_G = 0x24,
    REFERENCE_G = 0x25,
    STATUS_REG_G = 0x27,
    OUT_X_L_G = 0x28,
    OUT_X_H_G = 0x29,
    OUT_Y_L_G = 0x2A,
    OUT_Y_H_G = 0x2B,
    OUT_Z_L_G = 0x2C,
    OUT_Z_H_G  = 0x2D,
    FIFO_CTRL_REG_G = 0x2E,
    FIFO_SRC_REG_G = 0x2F,
    INT1_CFG_G = 0x30,
    INT1_SRC_G = 0x31,
    INT1_THS_XH_G = 0x32,
    INT1_THS_XL_G = 0x33,
    INT1_THS_YH_G = 0x34,
    INT1_THS_YL_G = 0x35,
    INT1_THS_ZH_G = 0x36,
    INT1_THS_ZL_G = 0x37,
    INT1_DURATION_G = 0x38;

var G_SCALE_245DPS = 0,  //  245 degrees per second
    G_SCALE_500DPS = 1,     // 500 dps
    G_SCALE_2000DPS = 2;    // 2000 dps

var G_ODR_95_BW_125  = 0x0, //   95         12.5
    G_ODR_95_BW_25   = 0x1, //   95          25
    // 0x2 and 0x3 define the same data rate and bandwidth
    G_ODR_190_BW_125 = 0x4, //   190        12.5
    G_ODR_190_BW_25  = 0x5, //   190         25
    G_ODR_190_BW_50  = 0x6, //   190         50
    G_ODR_190_BW_70  = 0x7, //   190         70
    G_ODR_380_BW_20  = 0x8, //   380         20
    G_ODR_380_BW_25  = 0x9, //   380         25
    G_ODR_380_BW_50  = 0xA, //   380         50
    G_ODR_380_BW_100 = 0xB, //   380         100
    G_ODR_760_BW_30  = 0xC, //   760         30
    G_ODR_760_BW_35  = 0xD, //   760         35
    G_ODR_760_BW_50  = 0xE, //   760         50
    G_ODR_760_BW_100 = 0xF; //   760         100

var LSM9DS0G = module.exports = function LSM9DS0G(opts) {
  LSM9DS0G.__super__.constructor.apply(this, arguments);
  var extraParams = opts.extraParams || {};
  this.address = 0x6b;

  this.scale = extraParams.scale || G_SCALE_245DPS;
  this.odr = extraParams.odr || G_ODR_95_BW_125;

  this.commands = {
    getGyro: this.getGyro
  };
};

Cylon.Utils.subclass(LSM9DS0G, Cylon.Driver);

LSM9DS0G.prototype.start = function(callback) {
  this._initGyro();
  callback();
};

LSM9DS0G.prototype.halt = function(callback) {
  callback();
};

LSM9DS0G.prototype.getGyro = function(callback) {
  var self = this;

  self.connection.i2cRead(self.address, OUT_X_L_G, 6, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      var result = {};
      result['x'] = (data[1] << 8) | data[0]; // Store x-axis values into gx
      result['y'] = (data[3] << 8) | data[2]; // Store y-axis values into gy
      result['z'] = (data[5] << 8) | data[4]; // Store z-axis values into gz
      callback(null, result);
    }
  });
};

LSM9DS0G.prototype._initGyro = function() {
  /* CTRL_REG1_G sets output data rate, bandwidth, power-down and enables
  Bits[7:0]: DR1 DR0 BW1 BW0 PD Zen Xen Yen
  DR[1:0] - Output data rate selection
    00=95Hz, 01=190Hz, 10=380Hz, 11=760Hz
  BW[1:0] - Bandwidth selection (sets cutoff frequency)
     Value depends on ODR. See datasheet table 21.
  PD - Power down enable (0=power down mode, 1=normal or sleep mode)
  Zen, Xen, Yen - Axis enable (o=disabled, 1=enabled) */
  this.connection.i2cWrite(this.address, CTRL_REG1_G, 0x0F); // Normal mode, enable all axes

  /* CTRL_REG2_G sets up the HPF
  Bits[7:0]: 0 0 HPM1 HPM0 HPCF3 HPCF2 HPCF1 HPCF0
  HPM[1:0] - High pass filter mode selection
    00=normal (reset reading HP_RESET_FILTER, 01=ref signal for filtering,
    10=normal, 11=autoreset on interrupt
  HPCF[3:0] - High pass filter cutoff frequency
    Value depends on data rate. See datasheet table 26.
  */
  this.connection.i2cWrite(this.address, CTRL_REG2_G, 0x00); // Normal mode, high cutoff frequency

  /* CTRL_REG3_G sets up interrupt and DRDY_G pins
  Bits[7:0]: I1_IINT1 I1_BOOT H_LACTIVE PP_OD I2_DRDY I2_WTM I2_ORUN I2_EMPTY
  I1_INT1 - Interrupt enable on INT_G pin (0=disable, 1=enable)
  I1_BOOT - Boot status available on INT_G (0=disable, 1=enable)
  H_LACTIVE - Interrupt active configuration on INT_G (0:high, 1:low)
  PP_OD - Push-pull/open-drain (0=push-pull, 1=open-drain)
  I2_DRDY - Data ready on DRDY_G (0=disable, 1=enable)
  I2_WTM - FIFO watermark interrupt on DRDY_G (0=disable 1=enable)
  I2_ORUN - FIFO overrun interrupt on DRDY_G (0=disable 1=enable)
  I2_EMPTY - FIFO empty interrupt on DRDY_G (0=disable 1=enable) */
  this.connection.i2cWrite(this.address, CTRL_REG3_G, 0x88); // Int1 enabled (pp, active low), data read on DRDY_G:

  /* CTRL_REG4_G sets the scale, update mode
  Bits[7:0] - BDU BLE FS1 FS0 - ST1 ST0 SIM
  BDU - Block data update (0=continuous, 1=output not updated until read
  BLE - Big/little endian (0=data LSB @ lower address, 1=LSB @ higher add)
  FS[1:0] - Full-scale selection
    00=245dps, 01=500dps, 10=2000dps, 11=2000dps
  ST[1:0] - Self-test enable
    00=disabled, 01=st 0 (x+, y-, z-), 10=undefined, 11=st 1 (x-, y+, z+)
  SIM - SPI serial interface mode select
    0=4 wire, 1=3 wire */
  this.connection.i2cWrite(this.address, CTRL_REG4_G, 0x00); // Set scale to 245 dps

  /* CTRL_REG5_G sets up the FIFO, HPF, and INT1
  Bits[7:0] - BOOT FIFO_EN - HPen INT1_Sel1 INT1_Sel0 Out_Sel1 Out_Sel0
  BOOT - Reboot memory content (0=normal, 1=reboot)
  FIFO_EN - FIFO enable (0=disable, 1=enable)
  HPen - HPF enable (0=disable, 1=enable)
  INT1_Sel[1:0] - Int 1 selection configuration
  Out_Sel[1:0] - Out selection configuration */
  this.connection.i2cWrite(this.address, CTRL_REG5_G, 0x00);
}

},{"cylon":46}],37:[function(require,module,exports){
"use strict";

var Cylon = require('cylon');

var OUT_TEMP_L_XM = 0x05,
    OUT_TEMP_H_XM = 0x06,
    STATUS_REG_M = 0x07,
    OUT_X_L_M = 0x08,
    OUT_X_H_M = 0x09,
    OUT_Y_L_M = 0x0A,
    OUT_Y_H_M = 0x0B,
    OUT_Z_L_M = 0x0C,
    OUT_Z_H_M = 0x0D,
    WHO_AM_I_XM = 0x0F,
    INT_CTRL_REG_M = 0x12,
    INT_SRC_REG_M = 0x13,
    INT_THS_L_M = 0x14,
    INT_THS_H_M = 0x15,
    OFFSET_X_L_M = 0x16,
    OFFSET_X_H_M = 0x17,
    OFFSET_Y_L_M = 0x18,
    OFFSET_Y_H_M = 0x19,
    OFFSET_Z_L_M = 0x1A,
    OFFSET_Z_H_M = 0x1B,
    REFERENCE_X = 0x1C,
    REFERENCE_Y = 0x1D,
    REFERENCE_Z = 0x1E,
    CTRL_REG0_XM = 0x1F,
    CTRL_REG1_XM = 0x20,
    CTRL_REG2_XM = 0x21,
    CTRL_REG3_XM = 0x22,
    CTRL_REG4_XM = 0x23,
    CTRL_REG5_XM = 0x24,
    CTRL_REG6_XM = 0x25,
    CTRL_REG7_XM = 0x26,
    STATUS_REG_A = 0x27,
    OUT_X_L_A = 0x28,
    OUT_X_H_A = 0x29,
    OUT_Y_L_A = 0x2A,
    OUT_Y_H_A = 0x2B,
    OUT_Z_L_A = 0x2C,
    OUT_Z_H_A = 0x2D,
    FIFO_CTRL_REG = 0x2E,
    FIFO_SRC_REG = 0x2F,
    INT_GEN_1_REG = 0x30,
    INT_GEN_1_SRC = 0x31,
    INT_GEN_1_THS = 0x32,
    INT_GEN_1_DURATION = 0x33,
    INT_GEN_2_REG = 0x34,
    INT_GEN_2_SRC = 0x35,
    INT_GEN_2_THS = 0x36,
    INT_GEN_2_DURATION = 0x37,
    CLICK_CFG = 0x38,
    CLICK_SRC = 0x39,
    CLICK_THS = 0x3A,
    TIME_LIMIT = 0x3B,
    TIME_LATENCY = 0x3C,
    TIME_WINDOW = 0x3D,
    ACT_THS = 0x3E,
    ACT_DUR = 0x3F;

var LSM9DS0XM = module.exports = function LSM9DS0XM(opts) {
  LSM9DS0XM.__super__.constructor.apply(this, arguments);
  var extraParams = opts.extraParams || {};
  this.address = 0x1d;

  this.commands = {
    getAccel: this.getAccel,
    getMag: this.getMag
  };
};

Cylon.Utils.subclass(LSM9DS0XM, Cylon.Driver);

LSM9DS0XM.prototype.start = function(callback) {
  this._initAccel();
  this._initMag();
  callback();
};

LSM9DS0XM.prototype.halt = function(callback) {
  callback();
};

LSM9DS0XM.prototype.getAccel = function(callback) {
  var self = this;

  self.connection.i2cRead(self.address, OUT_X_L_A, 6, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      var result = {};
      result['x'] = (data[1] << 8) | data[0]; // Store x-axis values into gx
      result['y'] = (data[3] << 8) | data[2]; // Store y-axis values into gy
      result['z'] = (data[5] << 8) | data[4]; // Store z-axis values into gz
      callback(null, result);
    }
  });
};

LSM9DS0XM.prototype.getMag = function(callback) {
  var self = this;

  self.connection.i2cRead(self.address, OUT_X_L_M, 6, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      var result = {};
      result['x'] = (data[1] << 8) | data[0]; // Store x-axis values into gx
      result['y'] = (data[3] << 8) | data[2]; // Store y-axis values into gy
      result['z'] = (data[5] << 8) | data[4]; // Store z-axis values into gz
      callback(null, result);
    }
  });
};

LSM9DS0XM.prototype._initAccel = function() {
  /* CTRL_REG0_XM (0x1F) (Default value: 0x00)
  Bits (7-0): BOOT FIFO_EN WTM_EN 0 0 HP_CLICK HPIS1 HPIS2
  BOOT - Reboot memory content (0: normal, 1: reboot)
  FIFO_EN - Fifo enable (0: disable, 1: enable)
  WTM_EN - FIFO watermark enable (0: disable, 1: enable)
  HP_CLICK - HPF enabled for click (0: filter bypassed, 1: enabled)
  HPIS1 - HPF enabled for interrupt generator 1 (0: bypassed, 1: enabled)
  HPIS2 - HPF enabled for interrupt generator 2 (0: bypassed, 1 enabled)   */
  this.connection.i2cWrite(this.address, CTRL_REG0_XM, 0x00);
  
  /* CTRL_REG1_XM (0x20) (Default value: 0x07)
  Bits (7-0): AODR3 AODR2 AODR1 AODR0 BDU AZEN AYEN AXEN
  AODR[3:0] - select the acceleration data rate:
    0000=power down, 0001=3.125Hz, 0010=6.25Hz, 0011=12.5Hz, 
    0100=25Hz, 0101=50Hz, 0110=100Hz, 0111=200Hz, 1000=400Hz,
    1001=800Hz, 1010=1600Hz, (remaining combinations undefined).
  BDU - block data update for accel AND mag
    0: Continuous update
    1: Output registers aren't updated until MSB and LSB have been read.
  AZEN, AYEN, and AXEN - Acceleration x/y/z-axis enabled.
    0: Axis disabled, 1: Axis enabled                  */ 
  this.connection.i2cWrite(this.address, CTRL_REG1_XM, 0x57); // 100Hz data rate, x/y/z all enabled
  
  /* CTRL_REG2_XM (0x21) (Default value: 0x00)
  Bits (7-0): ABW1 ABW0 AFS2 AFS1 AFS0 AST1 AST0 SIM
  ABW[1:0] - Accelerometer anti-alias filter bandwidth
    00=773Hz, 01=194Hz, 10=362Hz, 11=50Hz
  AFS[2:0] - Accel full-scale selection
    000=+/-2g, 001=+/-4g, 010=+/-6g, 011=+/-8g, 100=+/-16g
  AST[1:0] - Accel self-test enable
    00=normal (no self-test), 01=positive st, 10=negative st, 11=not allowed
  SIM - SPI mode selection
    0=4-wire, 1=3-wire                           */
  this.connection.i2cWrite(this.address, CTRL_REG2_XM, 0x00); // Set scale to 2g
  
  /* CTRL_REG3_XM is used to set interrupt generators on INT1_XM
  Bits (7-0): P1_BOOT P1_TAP P1_INT1 P1_INT2 P1_INTM P1_DRDYA P1_DRDYM P1_EMPTY
  */
  this.connection.i2cWrite(this.address, CTRL_REG3_XM, 0x04); // Accelerometer data ready on INT1_XM (0x04)
};

LSM9DS0XM.prototype._initMag = function() {
  /* CTRL_REG5_XM enables temp sensor, sets mag resolution and data rate
  Bits (7-0): TEMP_EN M_RES1 M_RES0 M_ODR2 M_ODR1 M_ODR0 LIR2 LIR1
  TEMP_EN - Enable temperature sensor (0=disabled, 1=enabled)
  M_RES[1:0] - Magnetometer resolution select (0=low, 3=high)
  M_ODR[2:0] - Magnetometer data rate select
    000=3.125Hz, 001=6.25Hz, 010=12.5Hz, 011=25Hz, 100=50Hz, 101=100Hz
  LIR2 - Latch interrupt request on INT2_SRC (cleared by reading INT2_SRC)
    0=interrupt request not latched, 1=interrupt request latched
  LIR1 - Latch interrupt request on INT1_SRC (cleared by readging INT1_SRC)
    0=irq not latched, 1=irq latched                   */
  this.connection.i2cWrite(this.address, CTRL_REG5_XM, 0x94); // Mag data rate - 100 Hz, enable temperature sensor
  
  /* CTRL_REG6_XM sets the magnetometer full-scale
  Bits (7-0): 0 MFS1 MFS0 0 0 0 0 0
  MFS[1:0] - Magnetic full-scale selection
  00:+/-2Gauss, 01:+/-4Gs, 10:+/-8Gs, 11:+/-12Gs               */
  this.connection.i2cWrite(this.address, CTRL_REG6_XM, 0x00); // Mag scale to +/- 2GS
  
  /* CTRL_REG7_XM sets magnetic sensor mode, low power mode, and filters
  AHPM1 AHPM0 AFDS 0 0 MLP MD1 MD0
  AHPM[1:0] - HPF mode selection
    00=normal (resets reference registers), 01=reference signal for filtering, 
    10=normal, 11=autoreset on interrupt event
  AFDS - Filtered acceleration data selection
    0=internal filter bypassed, 1=data from internal filter sent to FIFO
  MLP - Magnetic data low-power mode
    0=data rate is set by M_ODR bits in CTRL_REG5
    1=data rate is set to 3.125Hz
  MD[1:0] - Magnetic sensor mode selection (default 10)
    00=continuous-conversion, 01=single-conversion, 10 and 11=power-down */
  this.connection.i2cWrite(this.address, CTRL_REG7_XM, 0x00); // Continuous conversion mode
  
  /* CTRL_REG4_XM is used to set interrupt generators on INT2_XM
  Bits (7-0): P2_TAP P2_INT1 P2_INT2 P2_INTM P2_DRDYA P2_DRDYM P2_Overrun P2_WTM
  */
  this.connection.i2cWrite(this.address, CTRL_REG4_XM, 0x04); // Magnetometer data ready on INT2_XM (0x08)
  
  /* INT_CTRL_REG_M to set push-pull/open drain, and active-low/high
  Bits[7:0] - XMIEN YMIEN ZMIEN PP_OD IEA IEL 4D MIEN
  XMIEN, YMIEN, ZMIEN - Enable interrupt recognition on axis for mag data
  PP_OD - Push-pull/open-drain interrupt configuration (0=push-pull, 1=od)
  IEA - Interrupt polarity for accel and magneto
    0=active-low, 1=active-high
  IEL - Latch interrupt request for accel and magneto
    0=irq not latched, 1=irq latched
  4D - 4D enable. 4D detection is enabled when 6D bit in INT_GEN1_REG is set
  MIEN - Enable interrupt generation for magnetic data
    0=disable, 1=enable) */
  this.connection.i2cWrite(this.address, INT_CTRL_REG_M, 0x09); // Enable interrupts for mag, active-low, push-pull
};

},{"cylon":46}],38:[function(require,module,exports){
/*
 * MPL115A2 I2C Barometric Pressure + Temperature sensor driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-14 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var Cylon = require('cylon');

var MPL115A2_REGISTER_PRESSURE_MSB = 0x00,
    MPL115A2_REGISTER_PRESSURE_LSB = 0x01,
    MPL115A2_REGISTER_TEMP_MSB = 0x02,
    MPL115A2_REGISTER_TEMP_LSB = 0x03,
    MPL115A2_REGISTER_A0_COEFF_MSB = 0x04,
    MPL115A2_REGISTER_A0_COEFF_LSB = 0x05,
    MPL115A2_REGISTER_B1_COEFF_MSB = 0x06,
    MPL115A2_REGISTER_B1_COEFF_LSB = 0x07,
    MPL115A2_REGISTER_B2_COEFF_MSB = 0x08,
    MPL115A2_REGISTER_B2_COEFF_LSB = 0x09,
    MPL115A2_REGISTER_C12_COEFF_MSB = 0x0A,
    MPL115A2_REGISTER_C12_COEFF_LSB = 0x0B,
    MPL115A2_REGISTER_STARTCONVERSION = 0x12;

var Mpl115A2 = module.exports = function Mpl115A2() {
  Mpl115A2.__super__.constructor.apply(this, arguments);
  this.address = 0x60;
  this.commands = {
    get_pressure: this.getPressure,
    get_temperature: this.getTemperature
  };
};

Cylon.Utils.subclass(Mpl115A2, Cylon.Driver);

Mpl115A2.prototype.start = function(callback) {
  this.readCoefficients(callback);
};

Mpl115A2.prototype.halt = function(callback) {
  callback();
};

Mpl115A2.prototype.readCoefficients = function(callback) {
  var self = this;

  this.connection.i2cRead(this.address, MPL115A2_REGISTER_A0_COEFF_MSB, 8, function(err, data) {
    var a0coeff = (data[0] << 8) | data[1],
        b1coeff = (data[2] << 8) | data[3],
        b2coeff = (data[4] << 8) | data[5],
        c12coeff = ((data[6] << 8) | data[7]) >> 2;

    self.a0 = a0coeff / 8;
    self.b1 = b1coeff / 8192;
    self.b2 = b2coeff / 16384;
    self.c12 = c12coeff / 4194304.0;

    callback(err, data);
    self.device.emit('start');
  });
};

Mpl115A2.prototype.getPT = function(callback) {
  var self = this;

  this.connection.i2cWrite(this.address, MPL115A2_REGISTER_STARTCONVERSION);
  this.connection.i2cWrite(this.address, 0x00);

  Cylon.Utils.sleep(5);

  this.connection.i2cRead(this.address, MPL115A2_REGISTER_PRESSURE_MSB, 4, function(err, data) {
    var pressure, pressureComp, temp;
    pressure = ((data[0] << 8) | data[1]) >> 6;
    temp = ((data[2] << 8) | data[3]) >> 6;
    pressureComp = self.a0 + (self.b1 + self.c12 * temp) * pressure + self.b2 * temp;
    self.pressure = ((65.0 / 1023.0) * pressureComp) + 50.0;
    self.temperature = ((temp - 498.0) / -5.35) + 25.0;
    var values = {
      'pressure': self.pressure,
      'temperature': self.temperature
    };

    callback(err, values);
  });
};

Mpl115A2.prototype.getPressure = Mpl115A2.prototype.getPT;
Mpl115A2.prototype.getTemperature = Mpl115A2.prototype.getPT;

},{"cylon":46}],39:[function(require,module,exports){
/*
 * MPU6050 I2C Barometric Pressure + Temperature sensor driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-14 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var Cylon = require('cylon');

var MPU6050_RA_ACCEL_XOUT_H = 0x3B,
    MPU6050_RA_PWR_MGMT_1 = 0x6B,
    MPU6050_PWR1_CLKSEL_BIT = 2,
    MPU6050_PWR1_CLKSEL_LENGTH = 3,
    MPU6050_CLOCK_PLL_XGYRO = 0x01,

    MPU6050_GYRO_FS_250 = 0x00,
    MPU6050_RA_GYRO_CONFIG = 0x1B,
    MPU6050_GCONFIG_FS_SEL_LENGTH = 2,
    MPU6050_GCONFIG_FS_SEL_BIT = 4,

    MPU6050_RA_ACCEL_CONFIG = 0x1C,
    MPU6050_ACONFIG_AFS_SEL_BIT = 4,
    MPU6050_ACONFIG_AFS_SEL_LENGTH = 2,
    MPU6050_ACCEL_FS_2 = 0x00,

    MPU6050_RA_PWR_MGMT_1 = 0x6B,
    MPU6050_PWR1_SLEEP_BIT = 6;

var Mpu6050 = module.exports = function Mpu6050() {
  Mpu6050.__super__.constructor.apply(this, arguments);
  this.address = 0x68; // DataSheet
  this.commands = {
    get_angular_velocity: this.getAngularVelocity,
    get_acceleration: this.getAcceleration,
    get_motion_and_temp: this.getMotionAndTemp
  };
};

Cylon.Utils.subclass(Mpu6050, Cylon.Driver);

Mpu6050.prototype.start = function(callback) {
  // setClockSource
  this.connection.i2cWrite(this.address, MPU6050_RA_PWR_MGMT_1);
  this.connection.i2cWrite(this.address, MPU6050_PWR1_CLKSEL_BIT);
  this.connection.i2cWrite(this.address, MPU6050_PWR1_CLKSEL_LENGTH);
  this.connection.i2cWrite(this.address, MPU6050_CLOCK_PLL_XGYRO);

  // setFullScaleGyroRange
  this.connection.i2cWrite(this.address, MPU6050_GYRO_FS_250);
  this.connection.i2cWrite(this.address, MPU6050_RA_GYRO_CONFIG);
  this.connection.i2cWrite(this.address, MPU6050_GCONFIG_FS_SEL_LENGTH);
  this.connection.i2cWrite(this.address, MPU6050_GCONFIG_FS_SEL_BIT);

  // setFullScaleAccelRange
  this.connection.i2cWrite(this.address, MPU6050_RA_ACCEL_CONFIG);
  this.connection.i2cWrite(this.address, MPU6050_ACONFIG_AFS_SEL_BIT);
  this.connection.i2cWrite(this.address, MPU6050_ACONFIG_AFS_SEL_LENGTH);
  this.connection.i2cWrite(this.address, MPU6050_ACCEL_FS_2);

  // setSleepEnabled
  this.connection.i2cWrite(this.address, MPU6050_RA_PWR_MGMT_1);
  this.connection.i2cWrite(this.address, MPU6050_PWR1_SLEEP_BIT);
  this.connection.i2cWrite(this.address, 0);

  callback();
  this.device.emit('start');
};

Mpu6050.prototype.halt = function(callback) {
  callback();
};

Mpu6050.prototype.getAngularVelocity = function(callback) {
  this.getMotionAndTemp(callback);
};

Mpu6050.prototype.getAcceleration = function(callback) {
  this.getMotionAndTemp(callback);
};

Mpu6050.prototype.getMotionAndTemp = function(callback) {
  this.connection.i2cRead(this.address, MPU6050_RA_ACCEL_XOUT_H, 14, function(err, data) {
    var ax = this.makeSignedInteger(data[0], data[1]),
        ay = this.makeSignedInteger(data[2], data[3]),
        az = this.makeSignedInteger(data[4], data[5]);

    var temp = this.makeSignedInteger(data[6], data[7]);

    var gx = this.makeSignedInteger(data[8], data[9]),
        gy = this.makeSignedInteger(data[10], data[11]),
        gz = this.makeSignedInteger(data[12], data[13]);

    var values = {
      'a': [ax,ay,az],
      'g': [gx,gy,gz],
      't': this.convertToCelsius(temp)
    };

    callback(err, values);
  }.bind(this));
};

// The temperature sensor is -40 to +85 degrees Celsius.
// It is a signed integer.
// According to the datasheet:
//   340 per degrees Celsius, -512 at 35 degrees.
// At 0 degrees: -512 - (340 * 35) = -12412
Mpu6050.prototype.convertToCelsius = function (temp) {
  return (temp + 12412.0) / 340.0;
};

// we have high and low bits for a signed 16bit integer
// so it has to be converted into signed 32bit integer
Mpu6050.prototype.makeSignedInteger = function (highBits, lowBits) {
  var minusBits = 128;
  var leadingOnes = 4294901760;

  var value = (highBits << 8) | lowBits;

  if ((highBits & minusBits) === minusBits) {
    // first bit is 1, so the value has to be minus

    return value | leadingOnes;
  }

  return value;
};

},{"cylon":46}],40:[function(require,module,exports){
/*
 * adaptor
 * cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Basestar = require('./basestar'),
    Logger = require('./logger'),
    Utils = require('./utils');

// Public: Creates a new Adaptor
//
// opts - hash of acceptable params
//   name - name of the Adaptor, used when printing to console
//   connection - Connection the adaptor will use to proxy commands/events
//
// Returns a new Adaptor
var Adaptor = module.exports = function Adaptor(opts) {
  opts = opts || {};

  this.name = opts.name;
  this.connection = opts.connection;
};

Utils.subclass(Adaptor, Basestar);

},{"./basestar":43,"./logger":51,"./utils":55}],41:[function(require,module,exports){
(function (__dirname){
/*
 * Cylon API
 * cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var fs = require('fs'),
    path = require('path');

var express = require('express'),
    bodyParser = require('body-parser');

var Logger = require('./logger');

var API = module.exports = function API(opts) {
  if (opts == null) {
    opts = {};
  }

  for (var d in this.defaults) {
    this[d] = opts.hasOwnProperty(d) ? opts[d] : this.defaults[d];
  }

  this.createServer();

  this.express.set('title', 'Cylon API Server');

  this.express.use(this.setupAuth());
  this.express.use(bodyParser());
  this.express.use(express["static"](__dirname + "/../node_modules/robeaux/"));

  // set CORS headers for API requests
  this.express.use(function(req, res, next) {
    res.set("Access-Control-Allow-Origin", this.CORS || "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set('Content-Type', 'application/json');
    return next();
  }.bind(this));

  // extracts command params from request
  this.express.use(function(req, res, next) {
    req.commandParams = [];

    for (var p in req.body) {
      req.commandParams.push(req.body[p]);
    }

    return next();
  });

  // load route definitions
  this.express.use('/api', require('./api/routes'));

  // error handling
  this.express.use(function(err, req, res, next) {
    res.json(500, { error: err.message || "An error occured."})
  });
};

API.prototype.defaults = {
  host: '127.0.0.1',
  port: '3000',
  auth: false,
  CORS: '',
  ssl: {
    key: path.normalize(__dirname + "/api/ssl/server.key"),
    cert: path.normalize(__dirname + "/api/ssl/server.crt")
  }
};

API.prototype.createServer = function createServer() {
  this.express = express();

  //configure ssl if requested
  if (this.ssl && typeof(this.ssl) === 'object') {
    var https = require('https');

    this.server = https.createServer({
      key:  fs.readFileSync(this.ssl.key),
      cert: fs.readFileSync(this.ssl.cert)
    }, this.express);
  } else {
    Logger.warn("API using insecure connection. We recommend using an SSL certificate with Cylon.");
    this.server = this.express;
  }
};

API.prototype.setupAuth = function setupAuth() {
  var authfn = function auth(req, res, next) { next(); };

  if (!!this.auth && typeof(this.auth) === 'object' && this.auth.type) {
    var type = this.auth.type,
        module = "./api/auth/" + type,
        filename = path.normalize(__dirname + "/" + module + ".js"),
        exists = fs.existsSync(filename);

    if (exists) {
      authfn = require(filename)(this.auth);
    }
  };

  return authfn;
};

API.prototype.listen = function() {
  this.server.listen(this.port, this.host, null, function() {
    var title    = this.express.get('title');
    var protocol = this.ssl ? "https" : "http";

    Logger.info(title + " is now online.");
    Logger.info("Listening at " + protocol + "://" + this.host + ":" + this.port);
  }.bind(this));
};

}).call(this,"/node_modules/cylon/lib")
},{"./api/routes":42,"./logger":51,"body-parser":57,"express":63,"fs":101,"https":127,"path":130}],42:[function(require,module,exports){
/*
 * Cylon API - Route Definitions
 * cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

var Cylon = require('../cylon');

var router = module.exports = require('express').Router();

// Loads up the appropriate Robot/Device/Connection instances, if they are
// present in the route params.
var load = function load(req, res, next) {
  var robot = req.params.robot,
      device = req.params.device,
      connection = req.params.connection;

  if (robot) {
    req.robot = Cylon.robots[robot];
    if (!req.robot) {
      return res.json(404, { error: "No Robot found with the name " + robot });
    }
  }

  if (device) {
    req.device = req.robot.devices[device];
    if (!req.device) {
      return res.json(404, { error: "No device found with the name " + device });
    }
  }

  if (connection) {
    req.connection = req.robot.connections[connection];
    if (!req.connection) {
      return res.json(404, { error: "No connection found with the name " + connection });
    }
  }

  next();
};

router.get("/", function(req, res) {
  res.json({ MCP: Cylon });
});

router.get("/commands", function(req, res) {
  res.json({ commands: Object.keys(Cylon.commands) });
});

router.post("/commands/:command", function(req, res) {
  var command = req.params.command;
  var result = Cylon.commands[command].apply(Cylon, req.commandParams);
  res.json({ result: result });
});

router.get("/robots", function(req, res) {
  res.json({ robots: Cylon.toJSON().robots });
});

router.get("/robots/:robot", load, function(req, res) {
  res.json({ robot: req.robot });
});

router.get("/robots/:robot/commands", load, function(req, res) {
  res.json({ commands: Object.keys(req.robot.commands) });
});

router.all("/robots/:robot/commands/:command", load, function(req, res) {
  var command = req.robot.commands[req.params.command];
  var result = command.apply(req.robot, req.commandParams);
  res.json({ result: result });
});

router.get("/robots/:robot/devices", load, function(req, res) {
  res.json({ devices: req.robot.toJSON().devices });
});

router.get("/robots/:robot/devices/:device", load, function(req, res) {
  res.json({ device: req.device });
});

router.get("/robots/:robot/devices/:device/events/:event", load, function(req, res) {
  var event = req.params.event;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  });

  var writeData = function(data) {
    res.write("data: " + JSON.stringify(data) + "\n\n");
  };

  req.device.on(event, writeData);

  res.on('close', function() {
    req.device.removeListener(event, writeData);
  });
});

router.get("/robots/:robot/devices/:device/commands", load, function(req, res) {
  res.json({ commands: Object.keys(req.device.driver.commands) });
});

router.all("/robots/:robot/devices/:device/commands/:command", load, function(req, res) {
  var command = req.device.driver.commands[req.params.command];
  var result = command.apply(req.device.driver, req.commandParams);
  res.json({ result: result });
});

router.get("/robots/:robot/connections", load, function(req, res) {
  res.json({ connections: req.robot.toJSON().connections });
});

router.get("/robots/:robot/connections/:connection", load, function(req, res) {
  res.json({ connection: req.connection });
});

},{"../cylon":46,"express":63}],43:[function(require,module,exports){
/*
 * basestar
 * cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var EventEmitter = require('events').EventEmitter;

var Utils = require('./utils');

// Basestar is a base class to be used when writing external Cylon adaptors and
// drivers. It provides some useful base methods and functionality
//
// It also extends EventEmitter, so child classes are capable of emitting events
// for other parts of the system to handle.
var Basestar = module.exports = function Basestar() {
};

Utils.subclass(Basestar, EventEmitter);

// Public: Proxies calls from all methods in the object to a target object
//
// methods - array of methods to proxy
// target - object to proxy methods to
// source - object to proxy methods from
// force - whether or not to overwrite existing method definitions
//
// Returns the klass where the methods have been proxied
Basestar.prototype.proxyMethods = function(methods, target, source, force) {
  if (force == null) {
    force = false;
  }

  return Utils.proxyFunctionsToObject(methods, target, source, force);
};

// Public: Defines an event handler that proxies events from a source object
// to a target object
//
// opts - object containing options:
//   - targetEventName or eventName - event that should be emitted from the
//                                    target
//   - target - object to proxy event to
//   - source - object to proxy event from
//   - sendUpdate - whether or not to send an 'update' event
//
// Returns the source
Basestar.prototype.defineEvent = function(opts) {
  opts.sendUpdate = opts.sendUpdate || false;
  opts.targetEventName = opts.targetEventName || opts.eventName;

  opts.source.on(opts.eventName, function() {
    var args = arguments.length >= 1 ? [].slice.call(arguments, 0) : [];
    args.unshift(opts.targetEventName);
    opts.target.emit.apply(opts.target, args);

    if (opts.sendUpdate) {
      args.unshift('update');
      opts.target.emit.apply(opts.target, args);
    }
  });

  return opts.source;
};

// Public: Creates an event handler that proxies events from an adaptor's
// 'connector' (reference to whatever module is actually talking to the hw)
// to the adaptor's associated connection.
//
// opts - hash of opts to be passed to defineEvent()
//
// Returns this.connector
Basestar.prototype.defineAdaptorEvent = function(opts) {
  if (typeof opts === 'string') {
    opts = { eventName: opts };
  }

  opts['source'] = this.connector;
  opts['target'] = this.connection;

  return this.defineEvent(opts);
};

// Public: Creates an event handler that proxies events from an device's
// 'connector' (reference to whatever module is actually talking to the hw)
// to the device's associated connection.
//
// opts - hash of opts to be passed to defineEvent()
//
// Returns this.connection
Basestar.prototype.defineDriverEvent = function(opts) {
  if (typeof opts === 'string') {
    opts = { eventName: opts };
  }

  opts['source'] = this.connection;
  opts['target'] = this.device;

  return this.defineEvent(opts);
};

},{"./utils":55,"events":122}],44:[function(require,module,exports){
/*
 * Cylon - Internal Configuration
 * cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

module.exports = {};

},{}],45:[function(require,module,exports){
/*
 * connection
 * cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var EventEmitter = require('events').EventEmitter;

var Logger = require('./logger'),
    Utils = require('./utils');

// Public: Creates a new Connection
//
// opts - hash of acceptable params:
//   robot - Robot the Connection belongs to
//   name - name for the connection
//   adaptor - string module name of the adaptor to be set up
//   port - string port to use for the Connection
//
// Returns the newly set-up connection
var Connection = module.exports = function Connection(opts) {
  opts = opts || {};

  this.connect = this.connect.bind(this);

  this.robot = opts.robot;
  this.name = opts.name;
  this.port = opts.port;
  this.adaptor = this.initAdaptor(opts);

  this.details = {};

  for (var opt in opts) {
    if (['robot', 'name', 'adaptor'].indexOf(opt) < 0) {
      this.details[opt] = opts[opt];
    }
  }
};

Utils.subclass(Connection, EventEmitter);

// Public: Expresses the Connection in JSON format
//
// Returns an Object containing Connection data
Connection.prototype.toJSON = function() {
  return {
    name: this.name,
    adaptor: this.adaptor.constructor.name || this.adaptor.name,
    details: this.details
  };
};

// Public: Connect the adaptor's connection
//
// callback - callback function to run when the adaptor is connected
//
// Returns nothing
Connection.prototype.connect = function(callback) {
  var msg = this._logstring("Connecting to");
  Logger.info(msg);
  this.adaptor.connect(function() {
    for (var opt in this.adaptor) {
      if (!this[opt] && typeof this.adaptor[opt] === 'function') {
        this[opt] = this.adaptor[opt].bind(this.adaptor);
      }
    }

    callback.apply(this, arguments);
  }.bind(this));
};

// Public: Disconnect the adaptor's connection
//
// callback - function to be triggered then the adaptor has disconnected
//
// Returns nothing
Connection.prototype.disconnect = function(callback) {
  var msg = this._logstring("Disconnecting from");
  Logger.info(msg);
  this.removeAllListeners();
  this.adaptor.disconnect(callback);
};

// Public: sets up adaptor with @robot
//
// opts - options for adaptor being initialized
//   adaptor - name of the adaptor
//
// Returns the set-up adaptor
Connection.prototype.initAdaptor = function(opts) {
  Logger.debug("Loading adaptor '" + opts.adaptor + "'.");
  return this.robot.initAdaptor(opts.adaptor, this, opts);
};

Connection.prototype._logstring = function _logstring(action) {
  var msg = action + " '" + this.name + "'";

  if (this.port != null) {
    msg += " on port " + this.port;
  }

  msg += ".";

  return msg;
};

},{"./logger":51,"./utils":55,"events":122}],46:[function(require,module,exports){
(function (process){
/*
 * cylon
 * cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Async = require('async');

var Logger = require('./logger'),
    Robot = require('./robot'),
    Config = require('./config'),
    Utils = require('./utils');

Logger.setup();

var Cylon = module.exports = {
  Logger: Logger,
  Driver: require('./driver'),
  Adaptor: require('./adaptor'),
  Utils: Utils,

  IO: {
    DigitalPin: require('./io/digital-pin'),
    Utils: require('./io/utils')
  },

  api_instance: null,

  robots: {},
  commands: {}
};

// Public: Creates a new Robot
//
// opts - hash of Robot attributes
//
// Returns a shiny new Robot
// Examples:
//   Cylon.robot
//     connection: { name: 'arduino', adaptor: 'firmata' }
//     device: { name: 'led', driver: 'led', pin: 13 }
//
//     work: (me) ->
//       me.led.toggle()
Cylon.robot = function robot(opts) {
  // check if a robot with the same name exists already
  if (opts.name && this.robots[opts.name]) {
    var original = opts.name;
    opts.name = Utils.makeUnique(original, Object.keys(this.robots));
    Logger.warn("Robot names must be unique. Renaming '" + original + "' to '" + opts.name + "'");
  }

  var robot = new Robot(opts);
  this.robots[robot.name] = robot;
  return robot;
};

// Public: Creates a new API based on passed options
//
// Returns nothing
Cylon.api = function api() {
  var API = require('./api');

  var config = Utils.fetch(Config, 'api', {});

  this.api_instance = new API(config);
  this.api_instance.listen();
};

// Public: Starts up the API and the robots
//
// Returns nothing
Cylon.start = function start() {
  for (var bot in this.robots) {
    this.robots[bot].start();
  }
};

// Public: Sets the internal configuration, based on passed options
//
// opts - object containing configuration key/value pairs
//
// Returns the current config
Cylon.config = function(opts) {
  if (opts && typeof(opts) === 'object' && !Array.isArray(opts)) {
    for (var o in opts) {
      Config[o] = opts[o];
    }
  }

  return Config;
};

// Public: Halts the API and the robots
//
// callback - callback to be triggered when Cylon is ready to shutdown
//
// Returns nothing
Cylon.halt = function halt(callback) {
  callback = callback || function() {}
  // if robots can't shut down quickly enough, forcefully self-terminate
  var timeout = Config.haltTimeout || 3000
  Utils.after(timeout, callback);

  var fns = [];

  for (var bot in this.robots) {
    var robot = this.robots[bot];
    fns.push(robot.halt.bind(robot));
  }

  Async.parallel(fns, callback);
};

Cylon.toJSON = function() {
  var robots = [];

  for (var bot in this.robots) {
    robots.push(this.robots[bot]);
  }

  return {
    robots: robots,
    commands: Object.keys(this.commands)
  }
};

if (process.platform === "win32") {
  var readline = require("readline"),
      io = { input: process.stdin, output: process.stdout };

  readline.createInterface(io).on("SIGINT", function() {
    process.emit("SIGINT");
  });
}

process.on("SIGINT", function() {
  Cylon.halt(function() {
    process.kill(process.pid);
  });
});

}).call(this,require('_process'))
},{"./adaptor":40,"./api":41,"./config":44,"./driver":48,"./io/digital-pin":49,"./io/utils":50,"./logger":51,"./robot":54,"./utils":55,"_process":131,"async":56,"readline":101}],47:[function(require,module,exports){
/*
 * device
 * cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var EventEmitter = require('events').EventEmitter;

var Logger = require('./logger'),
    Utils = require('./utils');

// Public: Creates a new Device
//
// opts - object containing Device params
//   name - string name of the device
//   pin - string pin of the device
//   robot - parent Robot to the device
//   connection - connection to the device
//   driver - string name of the module the device driver logic lives in
//
// Returns a new Device
var Device = module.exports = function Device(opts) {
  if (opts == null) {
    opts = {};
  }

  this.halt = this.halt.bind(this);
  this.start = this.start.bind(this);

  this.robot = opts.robot;
  this.name = opts.name;
  this.pin = opts.pin;
  this.connection = this.determineConnection(opts.connection) || this.defaultConnection();
  this.driver = this.initDriver(opts);

  this.details = {};

  for (var opt in opts) {
    if (['robot', 'name', 'connection', 'driver'].indexOf(opt) < 0) {
      this.details[opt] = opts[opt];
    }
  }
};

Utils.subclass(Device, EventEmitter);

// Public: Starts the device driver
//
// callback - callback function to be executed by the driver start
//
// Returns nothing
Device.prototype.start = function(callback) {
  var msg = "Starting device '" + this.name + "'";

  if (this.pin != null) {
    msg += " on pin " + this.pin;
  }

  msg += ".";

  Logger.info(msg);
  this.driver.start(function() {
    for (var opt in this.driver) {
      if (!this[opt] && typeof this.driver[opt] === 'function') {
        this[opt] = this.driver[opt].bind(this.driver);
      }
    }

    callback.apply(this, arguments);
  }.bind(this));
};

// Public: Halt the device driver
//
// callback - function to trigger when the device has been halted
//
// Returns nothing
Device.prototype.halt = function(callback) {
  Logger.info("Halting device '" + this.name + "'.");
  this.removeAllListeners();
  this.driver.halt(callback);
};

// Public: Expresses the Device in JSON format
//
// Returns an Object containing Connection data
Device.prototype.toJSON = function() {
  return {
    name: this.name,
    driver: this.driver.constructor.name || this.driver.name,
    connection: this.connection.name,
    commands: Object.keys(this.driver.commands),
    details: this.details
  };
};

// Public: Retrieves the connections from the parent Robot instances
//
// conn - name of the connection to fetch
//
// Returns a Connection instance
Device.prototype.determineConnection = function(conn) {
  return this.robot.connections[conn];
};

// Public: Returns a default Connection to use
//
// Returns a Connection instance
Device.prototype.defaultConnection = function() {
  var first = 0;

  for (var c in this.robot.connections) {
    var connection = this.robot.connections[c];
    first || (first = connection);
  }

  return first;
};

// Public: sets up driver with @robot
//
// opts - object containing options when initializing driver
//   driver - name of the driver to intt()
//
// Returns the set-up driver
Device.prototype.initDriver = function(opts) {
  if (opts == null) {
    opts = {};
  }

  Logger.debug("Loading driver '" + opts.driver + "'.");
  return this.robot.initDriver(opts.driver, this, opts);
};

},{"./logger":51,"./utils":55,"events":122}],48:[function(require,module,exports){
/*
 * driver
 * cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var Basestar = require('./basestar'),
    Logger = require('./logger'),
    Utils = require('./utils');

// Public: Creates a new Driver
//
// opts - hash of acceptable params
//   name - name of the Driver, used when printing to console
//   device - Device the driver will use to proxy commands/events
//
// Returns a new Driver
var Driver = module.exports = function Driver(opts) {
  opts = opts || {};
  var extraParams = opts.extraParams || {}

  this.name = opts.name;
  this.device = opts.device;
  this.connection = this.device.connection;
  this.adaptor = this.connection.adaptor;
  this.interval = extraParams.interval || 10;

  this.commands = {};
};

Utils.subclass(Driver, Basestar);

Driver.prototype.setupCommands = function(commands, proxy) {
  if (proxy == null) {
    proxy = this.connection;
  }

  this.proxyMethods(commands, proxy, this);

  for (var i = 0; i < commands.length; i++) {
    var command = commands[i];

    var snake_case = command.replace(/[A-Z]+/g, function(match) {
      if (match.length > 1) {
        match = match.replace(/[A-Z]$/, function(m) {
          return "_" + m.toLowerCase();
        });
      }

      return "_" + match.toLowerCase();
    }).replace(/^_/, '');

    this.commands[snake_case] = this[command];
  }
}

},{"./basestar":43,"./logger":51,"./utils":55}],49:[function(require,module,exports){
/*
 * Linux IO DigitalPin
 * cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var FS = require('fs'),
    EventEmitter = require('events').EventEmitter;

var Utils = require('../utils');

var GPIO_PATH = "/sys/class/gpio";

var GPIO_READ = "in";
var GPIO_WRITE = "out";

var HIGH = 1;
var LOW = 0;

// DigitalPin class offers an interface with the Linux GPIO system present in
// single-board computers such as a Raspberry Pi, or a BeagleBone
var DigitalPin = module.exports = function DigitalPin(opts) {
  this.pinNum = opts.pin.toString();
  this.status = 'low';
  this.ready = false;
  this.mode = opts.mode;
};

Utils.subclass(DigitalPin, EventEmitter);

DigitalPin.prototype.connect = function(mode) {
  if (this.mode == null) {
    this.mode = mode;
  }

  FS.exists(this._pinPath(), function(exists) {
    exists ? this._openPin() : this._createGPIOPin();
  }.bind(this));
};

DigitalPin.prototype.close = function() {
  FS.writeFile(this._unexportPath(), this.pinNum, function(err) {
    this._closeCallback(err);
  }.bind(this));
};

DigitalPin.prototype.closeSync = function() {
  FS.writeFileSync(this._unexportPath(), this.pinNum);
  this._closeCallback(false);
};

DigitalPin.prototype.digitalWrite = function(value) {
  if (this.mode !== 'w') {
    this._setMode('w');
  }

  this.status = value === 1 ? 'high' : 'low';

  FS.writeFile(this._valuePath(), value, function(err) {
    if (err) {
      this.emit('error', "Error occurred while writing value " + value + " to pin " + this.pinNum);
    } else {
      this.emit('digitalWrite', value);
    }
  }.bind(this));

  return value;
};

// Public: Reads the digial pin's value periodicly on a supplied interval,
// and emits the result or an error
//
// interval - time (in milliseconds) to read from the pin at
//
// Returns the defined interval
DigitalPin.prototype.digitalRead = function(interval) {
  if (this.mode !== 'r') { this._setMode('r'); }

  Utils.every(interval, function() {
    FS.readFile(this._valuePath(), function(err, data) {
      if (err) {
        var error = "Error occurred while reading from pin " + this.pinNum;
        this.emit('error', error);
      } else {
        var readData = parseInt(data.toString());
        this.emit('digitalRead', readData);
      }
    }.bind(this));
  }.bind(this));
};

DigitalPin.prototype.setHigh = function() {
  return this.digitalWrite(1);
};

DigitalPin.prototype.setLow = function() {
  return this.digitalWrite(0);
};

DigitalPin.prototype.toggle = function() {
  return (this.status === 'low') ? this.setHigh() : this.setLow();
};

// Creates the GPIO file to read/write from
DigitalPin.prototype._createGPIOPin = function() {
  FS.writeFile(this._exportPath(), this.pinNum, function(err) {
    if (err) {
      this.emit('error', 'Error while creating pin files');
    } else {
      this._openPin();
    }
  }.bind(this));
};

DigitalPin.prototype._openPin = function() {
  this._setMode(this.mode, true);
  this.emit('open');
};

DigitalPin.prototype._closeCallback = function(err) {
  if (err) {
    this.emit('error', 'Error while closing pin files');
  } else {
    this.emit('close', this.pinNum);
  }
};

// Sets the mode for the GPIO pin by writing the correct values to the pin reference files
DigitalPin.prototype._setMode = function(mode, emitConnect) {
  if (emitConnect == null) { emitConnect = false; }

  this.mode = mode;

  var data = (mode === 'w') ? GPIO_WRITE : GPIO_READ;

  FS.writeFile(this._directionPath(), data, function(err) {
    this._setModeCallback(err, emitConnect);
  }.bind(this));
};

DigitalPin.prototype._setModeCallback = function(err, emitConnect) {
  if (err) {
    return this.emit('error', "Setting up pin direction failed");
  }

  this.ready = true;

  if (emitConnect) {
    this.emit('connect', this.mode);
  }
};

DigitalPin.prototype._directionPath = function() {
  return this._pinPath() + "/direction";
};

DigitalPin.prototype._valuePath = function() {
  return this._pinPath() + "/value";
};

DigitalPin.prototype._pinPath = function() {
  return GPIO_PATH + "/gpio" + this.pinNum;
};

DigitalPin.prototype._exportPath = function() {
  return GPIO_PATH + "/export";
};

DigitalPin.prototype._unexportPath = function() {
  return GPIO_PATH + "/unexport";
};

},{"../utils":55,"events":122,"fs":101}],50:[function(require,module,exports){
Utils = {
  // Returns { period: int, duty: int }
  // Calculated based on params value, freq, pulseWidth = { min: int, max: int }
  // pulseWidth min and max need to be specified in microseconds
  periodAndDuty: function(scaledDuty, freq, pulseWidth, polarity) {
    var period, duty, maxDuty;

    polarity = polarity || 'high';
    period = Math.round(1.0e9 / freq);

    if (pulseWidth != null) {
      var pulseWidthMin = pulseWidth.min * 1000,
          pulseWidthMax = pulseWidth.max * 1000;

      maxDuty =  pulseWidthMax - pulseWidthMin;
      duty = Math.round(pulseWidthMin + (maxDuty * scaledDuty));
    } else {
      duty = Math.round(period * scaledDuty);
    }

    if (polarity == 'low') {
      duty = period - duty;
    }

    return { period: period, duty: duty };
  }
};

module.exports = Utils;

},{}],51:[function(require,module,exports){
/*
 * logger
 * cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var getArgs = function(args) {
  return args.length >= 1 ? [].slice.call(args, 0) : [];
};

var BasicLogger = require('./logger/basic_logger'),
    NullLogger = require('./logger/null_logger');

// The Logger is a global object to facilitate logging stuff to the console (or
// other output) easily and consistently. It's available anywhere in Cylon, as
// well as in external modules that are loaded into Cylon
var Logger = module.exports = {};

// Public: Creates a Logger instance and assigns it to @logger
//
// logger - logger object to use. Defaults to a BasicLogger, or a NullLogger if
// false is supplied
//
// Returns the new logger instance
Logger.setup = function setup(logger) {
  if (logger == null) { logger = new BasicLogger(); }

  if (logger === false) {
    this.logger = new NullLogger();
  } else {
    this.logger = logger;
  }

  return this.logger;
};

Logger.toString = function() {
  return this.logger.toString();
};

Logger.debug = function() {
  var args = getArgs(arguments);
  return this.logger.debug.apply(this.logger, args);
};

Logger.info = function() {
  var args = getArgs(arguments);
  return this.logger.info.apply(this.logger, args);
};

Logger.warn = function() {
  var args = getArgs(arguments);
  return this.logger.warn.apply(this.logger, args);
};

Logger.error = function() {
  var args = getArgs(arguments);
  return this.logger.error.apply(this.logger, args);
};

Logger.fatal = function() {
  var args = getArgs(arguments);
  return this.logger.fatal.apply(this.logger, args);
};

},{"./logger/basic_logger":52,"./logger/null_logger":53}],52:[function(require,module,exports){
'use strict';

// The BasicLogger pushes stuff to console.log. Nothing more, nothing less.
var BasicLogger = module.exports = function BasicLogger() {};

BasicLogger.prototype.toString = function() {
  return "BasicLogger";
};

var getArgs = function(args) {
  return args.length >= 1 ? [].slice.call(args, 0) : [];
};

var logString = function(type) {
  var upcase = String(type).toUpperCase(),
      time = new Date().toISOString();

  var padded = String("     " + upcase).slice(-5);

  return upcase[0] + ", [" + time + "] " + padded + " -- :";
};


['debug', 'info', 'warn', 'error', 'fatal'].forEach(function(type) {
  BasicLogger.prototype[type] = function() {
    var args = getArgs(arguments);
    return console.log.apply(console, [].concat(logString(type), args));
  };
});

},{}],53:[function(require,module,exports){
// The NullLogger is designed for cases where you want absolutely nothing to
// print to anywhere. Every proxied method from the Logger returns a noop.
var NullLogger = module.exports = function NullLogger() {};

NullLogger.prototype.toString = function() {
  return "NullLogger";
};

NullLogger.prototype.debug = function() {};
NullLogger.prototype.info = function() {};
NullLogger.prototype.warn = function() {};
NullLogger.prototype.error = function() {};
NullLogger.prototype.fatal = function() {};

},{}],54:[function(require,module,exports){
(function (process){
/*
 * robot
 * cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var Connection = require("./connection"),
    Device = require("./device"),
    Logger = require('./logger'),
    Utils = require('./utils'),
    Config = require('./config');

var Async = require("async"),
    EventEmitter = require('events').EventEmitter;

var missingModuleError = function(module) {
  var string = "Cannot find the '" + module + "' module. ";
  string += "Please install it with 'npm install " + module + "' and try again.";

  console.log(string);

  process.emit('SIGINT');
};

// Public: Creates a new Robot
//
// opts - object containing Robot options
//   name - optional, string name of the robot
//   connection/connections - object connections to connect to
//   device/devices - object devices to connect to
//   work - work to be performed when the Robot is started
//
// Returns a new Robot
// Example (CoffeeScript):
//    Cylon.robot
//      name: "Spherobot!"
//
//      connection:
//        name: 'sphero', adaptor: 'sphero', port: '/dev/rfcomm0'
//
//      device:
//        name: 'sphero', driver: 'sphero'
//
//      work: (me) ->
//        Utils.every 1.second(), ->
//          me.sphero.roll 60, Math.floor(Math.random() * 360//
var Robot = module.exports = function Robot(opts) {
  opts = opts || {};

  var methods = [
    "toString",
    "registerDriver",
    "requireDriver",
    "registerAdaptor",
    "requireAdaptor",
    "halt",
    "startDevices",
    "startConnections",
    "start",
    "initDevices",
    "initConnections"
  ];

  methods.forEach(function(method) {
    this[method] = this[method].bind(this);
  }.bind(this));

  this.name = opts.name || Robot.randomName();
  this.connections = {};
  this.devices = {};
  this.adaptors = {};
  this.drivers = {};
  this.commands = {};
  this.running = false;
  this.work = opts.work || opts.play;

  if (!this.work) {
    this.work =  function() { Logger.debug("No work yet."); }
  }

  this.registerDefaults();

  this.initConnections(opts.connection || opts.connections);
  this.initDevices(opts.device || opts.devices);

  var hasDevices = !!Object.keys(this.devices).length,
      hasConnections = !!Object.keys(this.connections).length;

  if (hasDevices && !hasConnections) {
    throw new Error("No connections specified");
  }

  for (var n in opts) {
    var opt = opts[n],
        reserved = ['connection', 'connections', 'device', 'devices', 'work', 'commands'];

    if (reserved.indexOf(n) < 0) {
      this[n] = opt;

      if (opts.commands == null && typeof(opt) === 'function') {
        this.commands[n] = opt;
      }
    }
  }

  if (typeof opts.commands === 'function') {
    var result = opts.commands.call(this, this);
    if (typeof result === 'object' && !Array.isArray(result)) {
      this.commands = result;
    } else {
      throw new Error("commands must be an object or a function that returns an object");
    }
  }

  if (typeof opts.commands === 'object') {
    this.commands = opts.commands;
  }

  var mode = Utils.fetch(Config, 'mode', 'manual');

  if (mode === 'auto') {
    // run on the next tick, to allow for 'work' event handlers to be set up
    setTimeout(this.start, 0);
  }
};

Utils.subclass(Robot, EventEmitter);

// Public: Registers the default Drivers and Adaptors with Cylon.
//
// Returns nothing.
Robot.prototype.registerDefaults = function registerDefaults() {
  this.registerAdaptor("./test/loopback", "loopback");
  this.registerAdaptor("./test/test-adaptor", "test");

  this.registerDriver("./test/ping", "ping");
  this.registerDriver("./test/test-driver", "test");
};

// Public: Generates a random name for a Robot.
//
// Returns a string name
Robot.randomName = function() {
  return "Robot " + (Math.floor(Math.random() * 100000));
};

// Public: Expresses the Robot in a JSON-serializable format
//
// Returns an Object containing Robot data
Robot.prototype.toJSON = function() {
  var devices = [],
      connections = [];

  for (var n in this.connections) {
    connections.push(this.connections[n]);
  }

  for (var n in this.devices) {
    devices.push(this.devices[n]);
  }

  return {
    name: this.name,
    connections: connections,
    devices: devices,
    commands: Object.keys(this.commands)
  };
};

// Public: Initializes all connections for the robot
//
// connections - connections to initialize
//
// Returns initialized connections
Robot.prototype.initConnections = function(connections) {
  Logger.info("Initializing connections.");

  if (connections == null) {
    return;
  }

  connections = [].concat(connections);

  connections.forEach(function(conn) {
    if (this.connections[conn.name]) {
      var original = conn.name;
      conn.name = Utils.makeUnique(original, Object.keys(this.connections));
      Logger.warn("Connection names must be unique. Renaming '" + original + "' to '" + conn.name + "'");
    }

    Logger.info("Initializing connection '" + conn.name + "'.");
    conn['robot'] = this;
    this.connections[conn.name] = new Connection(conn);
  }.bind(this));

  return this.connections;
};

// Public: Initializes all devices for the robot
//
// devices - devices to initialize
//
// Returns initialized devices
Robot.prototype.initDevices = function(devices) {
  Logger.info("Initializing devices.");

  if (devices == null) {
    return;
  }

  devices = [].concat(devices);

  devices.forEach(function(device) {
    if (this.devices[device.name]) {
      var original = device.name;
      device.name = Utils.makeUnique(original, Object.keys(this.devices));
      Logger.warn("Device names must be unique. Renaming '" + original + "' to '" + device.name + "'");
    }

    Logger.info("Initializing device '" + device.name + "'.");
    device['robot'] = this;
    this.devices[device.name] = new Device(device);
  }.bind(this));

  return this.devices;
};

// Public: Starts the Robot working.
//
// Starts the connections, devices, and work.
//
// Returns the result of the work
Robot.prototype.start = function() {
  if (this.running) {
    return this;
  }

  var begin = function(callback) {
    Logger.info('Working.');

    this.emit('ready', this);
    this.work.call(this, this);
    this.running = true;

    callback(null, true);
  }.bind(this);

  Async.series([
    this.startConnections,
    this.startDevices,
    begin
  ], function(err) {
    if (!!err) {
      Logger.fatal("An error occured while trying to start the robot:");
      Logger.fatal(err);
      if (typoef(this.error) === 'function') {
        this.error.call(this, err);
      }
      this.emit('error', err);
    }
  }.bind(this));

  return this;
};

// Public: Starts the Robot's connections and triggers a callback
//
// callback - callback function to be triggered
//
// Returns nothing
Robot.prototype.startConnections = function(callback) {
  var starters = {};

  Logger.info("Starting connections.");

  for (var n in this.connections) {
    var connection = this.connections[n];
    this[n] = connection;
    starters[n] = connection.connect;
  }

  return Async.parallel(starters, callback);
};

// Public: Starts the Robot's devices and triggers a callback
//
// callback - callback function to be triggered
//
// Returns nothing
Robot.prototype.startDevices = function(callback) {
  var starters = {};

  Logger.info("Starting devices.");

  for (var n in this.devices) {
    var device = this.devices[n];
    this[n] = device;
    starters[n] = device.start;
  }

  return Async.parallel(starters, callback);
};

// Public: Halts the Robot.
//
// Halts the devices, disconnects the connections.
//
// callback - callback to be triggered when the Robot is stopped
//
// Returns nothing
Robot.prototype.halt = function(callback) {
  callback = callback || function() {};

  var fns = [];

  for (var d in this.devices) {
    var device = this.devices[d];

    fns.push(function(callback) {
      device.halt.call(device, callback);
    });
  }

  Async.parallel(fns, function() {
    var fns = [];

    for (var c in this.connections) {
      var connection = this.connections[c];

      fns.push(function(callback) {
        connection.disconnect.call(connection, callback);
      });
    }

    Async.parallel(fns, callback);
  }.bind(this));

  this.running = false;
};

// Public: Initialize an adaptor and adds it to @robot.adaptors
//
// adaptorName - module name of adaptor to require
// connection - the Connection that requested the adaptor be required
//
// Returns the adaptor
Robot.prototype.initAdaptor = function(adaptorName, connection, opts) {
  if (opts == null) {
    opts = {};
  }

  var adaptor = this.requireAdaptor(adaptorName, opts).adaptor({
    name: adaptorName,
    connection: connection,
    extraParams: opts
  });

  if (process.env.NODE_ENV === 'test' && !CYLON_TEST) {
    var testAdaptor = this.requireAdaptor('test').adaptor({
      name: adaptorName,
      connection: connection,
      extraParams: opts
    });

    return Utils.proxyTestStubs(adaptor.commands, testAdaptor);

    for (var prop in adaptor) {
      if (typeof adaptor[prop] === 'function' && !testAdaptor[prop]) {
        testAdaptor[prop] = function() { return true; }
      }
    }

    return testAdaptor;
  } else {
    return adaptor;
  }
};

// Public: Requires a hardware adaptor and adds it to @robot.adaptors
//
// adaptorName - module name of adaptor to require
//
// Returns the module for the adaptor
Robot.prototype.requireAdaptor = function(adaptorName, opts) {
  if (this.adaptors[adaptorName] == null) {
    var moduleName = opts.module || adaptorName;
    this.registerAdaptor("cylon-" + moduleName, adaptorName);
    this.adaptors[adaptorName].register(this);
  }
  return this.adaptors[adaptorName];
};

// Public: Registers an Adaptor with the Robot
//
// moduleName - name of the Node module to require
// adaptorName - name of the adaptor to register the moduleName under
//
// Returns the registered module name
Robot.prototype.registerAdaptor = function(moduleName, adaptorName) {
  if (this.adaptors[adaptorName] == null) {
    try {
      return this.adaptors[adaptorName] = require(moduleName);
    } catch (e) {
      if (e.code === "MODULE_NOT_FOUND") {
        missingModuleError(moduleName);
      } else {
        throw e;
      }
    }
  }
};

// Public: Init a hardware driver
//
// driverName - driver name
// device - the Device that requested the driver be initialized
// opts - object containing options when initializing driver
//
// Returns the new driver
Robot.prototype.initDriver = function(driverName, device, opts) {
  if (opts == null) {
    opts = {};
  }

  var driver = this.requireDriver(driverName).driver({
    name: driverName,
    device: device,
    extraParams: opts
  });

  if (process.env.NODE_ENV === 'test' && !CYLON_TEST) {
    var testDriver = this.requireDriver('test').driver({
      name: driverName,
      device: device,
      extraParams: opts
    });

    return Utils.proxyTestStubs(driver.commands, testDriver);
  } else {
    return driver;
  }
};

// Public: Requires module for a driver and adds it to @robot.drivers
//
// driverName - module name of driver to require
//
// Returns the module for driver
Robot.prototype.requireDriver = function(driverName) {
  if (this.drivers[driverName] == null) {
    this.registerDriver("cylon-" + driverName, driverName);
    this.drivers[driverName].register(this);
  }
  return this.drivers[driverName];
};

// Public: Registers an Driver with the Robot
//
// moduleName - name of the Node module to require
// driverName - name of the driver to register the moduleName under
//
// Returns the registered module name
Robot.prototype.registerDriver = function(moduleName, driverName) {
  if (this.drivers[driverName] == null) {
    try {
      return this.drivers[driverName] = require(moduleName);
    } catch (e) {
      if (e.code === "MODULE_NOT_FOUND") {
        missingModuleError(moduleName);
      } else {
        throw e;
      }
    }
  }
};

// Public: Returns basic info about the robot as a String
//
// Returns a String
Robot.prototype.toString = function() {
  return "[Robot name='" + this.name + "']";
};

}).call(this,require('_process'))
},{"./config":44,"./connection":45,"./device":47,"./logger":51,"./utils":55,"_process":131,"async":56,"events":122}],55:[function(require,module,exports){
(function (global){
/*
 * Cylon - Utils
 * cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

var Utils = module.exports = {
  // Public: Alias to setInterval, combined with Number monkeypatches below to
  // create an artoo-like syntax.
  //
  // interval - interval to run action on
  // action - action to perform at interval
  //
  // Examples
  //
  //   every((5).seconds(), function() {
  //     console.log('Hello world (and again in 5 seconds)!');
  //   });
  //
  // Returns an interval
  every: function every(interval, action) {
    return setInterval(action, interval);
  },

  // Public: Alias to setTimeout, combined with Number monkeypatches below to
  // create an artoo-like syntax.
  //
  // interval - interval to run action on
  // action - action to perform at interval
  //
  // Examples
  //
  //   after((10).seconds(), function() {
  //     console.log('Hello world from ten seconds ago!');
  //   });
  //
  // Returns an interval
  after: function after(delay, action) {
    return setTimeout(action, delay);
  },

  // Public: Alias to the `every` function, but passing 0
  // Examples
  //
  //   constantly(function() {
  //     console.log('hello world (and again and again)!');
  //   });
  //
  // Returns an interval
  constantly: function constantly(action) {
    return every(0, action);
  },

  // Public: Sleep - do nothing for some duration of time.
  //
  // ms - number of ms to sleep for
  //
  // Examples
  //
  //   sleep((1).second());
  //
  // Returns a function
  sleep: function sleep(ms) {
    var start = Date.now();

    while(Date.now() < start + ms) {
      var i = 0;
    }
  },

  // Public: Function to use for class inheritance. Copy of a CoffeeScript helper
  // function.
  //
  // Example
  //
  //    var Sphero = function Sphero() {};
  //
  //    subclass(Sphero, ParentClass);
  //
  //    // Sphero is now a subclass of Parent, and can access parent methods
  //    // through Sphero.__super__
  //
  // Returns subclass
  subclass: function subclass(child, parent) {
    var ctor = function() {
      this.constructor = child;
    };

    for (var key in parent) {
      if (Object.hasOwnProperty.call(parent, key)) {
        child[key] = parent[key];
      }
    }

    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.__super__ = parent.prototype;
    return child;
  },

  // Public: Proxies a list of methods from one object to another. It will not
  // overwrite existing methods unless told to.
  //
  // methods - array of functions to proxy
  // target - object to proxy the functions to
  // base - (optional) object that proxied functions will be declared on. Defaults
  //       to this
  // force - (optional) boolean - whether or not to force method assignment
  //
  // Returns base
  proxyFunctionsToObject: function proxyFunctionsToObject(methods, target, base, force) {
    if (base == null) {
      base = this;
    }

    if (force == null) {
      force = false;
    }

    var proxy = function(method) {
      return base[method] = function() {
        return target[method].apply(target, arguments);
      };
    };

    for (var i = 0; i < methods.length; i++) {
      var method = methods[i];

      if (!force && typeof(base[method]) === 'function') {
        continue;
      }

      proxy(method);
    }
    return base;
  },

  // Public: Analogue to Ruby's Hash#fetch method for looking up object
  // properties.
  //
  // obj - object to do property lookup on
  // property - string property name to attempt to look up
  // fallback - either:
  //    - a fallback value to return if `property` can't be found
  //    - a function to be executed if `property` can't be found. The function
  //    will be passed `property` as an argument.
  //
  //  Examples
  //
  //    var object = { property: "hello world" };
  //    fetch(object, "property");
  //    //=> "hello world"
  //
  //    fetch(object, "notaproperty", "default value");
  //    //=> "default value"
  //
  //    var notFound = function(prop) { return prop + " not found!" };
  //    fetch(object, "notaproperty", notFound)
  //    // "notaproperty not found!"
  //
  //    var badFallback = function(prop) { prop + " not found!" };
  //    fetch(object, "notaproperty", badFallback)
  //    // Error: no return value from provided callback function
  //
  //    fetch(object, "notaproperty");
  //    // Error: key not found: "notaproperty"
  //
  // Returns the value of obj[property], a fallback value, or the results of
  // running 'fallback'. If the property isn't found, and 'fallback' hasn't been
  // provided, will throw an error.
  fetch: function(obj, property, fallback) {
    if (obj.hasOwnProperty(property)) {
      return obj[property];
    }

    if (fallback === void 0) {
      throw new Error('key not found: "' + property + '"');
    }

    if (typeof(fallback) === 'function') {
      var value = fallback(property);

      if (value === void 0) {
        throw new Error('no return value from provided fallback function');
      }

      return value;
    }

    return fallback;
  },

  // Public: Given a name, and an array of existing names, returns a unique
  // name.
  //
  // name - name that's colliding with existing names
  // arr - array of existing names
  //
  // Returns the new name as a string
  makeUnique: function(name, arr) {
    var newName;

    if (!~arr.indexOf(name)) {
      return name;
    }

    for (var n = 1; ; n++) {
      newName = name + "-" + n;
      if (!~arr.indexOf(newName)) {
        return newName;
      }
    }
  },

  // Public: Adds necessary utils to global namespace, along with base class
  // extensions.
  //
  // Examples
  //
  //    Number.prototype.seconds // undefined
  //    after                    // undefined
  //
  //    Utils.bootstrap();
  //
  //    Number.prototype.seconds // [function]
  //    (after === Utils.after)  // true
  //
  // Returns Cylon.Utils
  bootstrap: function bootstrap() {
    global.every = this.every;
    global.after = this.after;
    global.constantly = this.constantly;

    addCoreExtensions();

    return this;
  }
};

var addCoreExtensions = function addCoreExtensions() {
  // Public: Monkey-patches Number to have Rails-like //seconds() function.
  // Warning, due to the way the Javascript parser works, applying functions on
  // numbers is kind of weird. See examples for details.
  //
  // Examples
  //
  //   2.seconds()
  //   //=> SyntaxError: Unexpected token ILLEGAL
  //
  //   10..seconds()
  //   //=> 10000
  //
  //   (5).seconds()
  //   //=> 5000
  //   // This is the preferred way to represent numbers when calling these
  //   // methods on them
  //
  // Returns an integer representing time in milliseconds
  Number.prototype.seconds = function() {
    return this * 1000;
  };

  // Public: Alias for Number::seconds, see comments for that method
  //
  // Examples
  //
  //   1.second()
  //   //=> 1000
  //
  // Returns an integer representing time in milliseconds
  Number.prototype.second = function() {
    return this.seconds(this);
  };

  // Public: Convert value from old scale (start, end) to (0..1) scale
  //
  // start - low point of scale to convert value from
  // end - high point of scale to convert value from
  //
  // Examples
  //
  //   (5).fromScale(0, 10)
  //   //=> 0.5
  //
  // Returns an integer representing the scaled value
  Number.prototype.fromScale = function(start, end) {
    var val = (this - Math.min(start, end)) / (Math.max(start, end) - Math.min(start, end));

    if (val > 1) {
      return 1;
    }

    if (val < 0){
      return 0;
    }

    return val;
  };

  // Public: Convert value from (0..1) scale to new (start, end) scale
  //
  // start - low point of scale to convert value to
  // end - high point of scale to convert value to
  //
  // Examples
  //
  //   (0.5).toScale(0, 10)
  //   //=> 5
  //
  // Returns an integer representing the scaled value
  Number.prototype.toScale = function(start, end) {
    var i = this * (Math.max(start, end) - Math.min(start, end)) + Math.min(start, end);

    if (i < start) {
      return start;
    }

    if (i > end) {
      return end;
    }

    return i;
  };
};

Utils.bootstrap();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],56:[function(require,module,exports){
(function (process){
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'))
},{"_process":131}],57:[function(require,module,exports){

var bytes = require('bytes');
var getBody = require('raw-body');
var typeis = require('type-is');
var http = require('http');
var qs = require('qs');
var querystring = require('querystring');

var firstcharRegExp = /^\s*(.)/

exports = module.exports = bodyParser;
exports.json = json;
exports.urlencoded = urlencoded;

function bodyParser(options){
  var opts = {}

  options = options || {}

  // exclude type option
  for (var prop in options) {
    if ('type' !== prop) {
      opts[prop] = options[prop]
    }
  }

  var _urlencoded = urlencoded(opts)
  var _json = json(opts)

  return function bodyParser(req, res, next) {
    _json(req, res, function(err){
      if (err) return next(err);
      _urlencoded(req, res, next);
    });
  }
}

function json(options){
  options = options || {};

  var limit = typeof options.limit !== 'number'
    ? bytes(options.limit || '100kb')
    : options.limit;
  var reviver = options.reviver
  var strict = options.strict !== false;
  var type = options.type || 'json';
  var verify = options.verify || false

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  function parse(str) {
    if (0 === str.length) {
      throw new Error('invalid json, empty body')
    }
    if (strict) {
      var first = firstchar(str)

      if (first !== '{' && first !== '[') {
        throw new Error('invalid json')
      }
    }

    return JSON.parse(str, reviver)
  }

  return function jsonParser(req, res, next) {
    if (req._body) return next();
    req.body = req.body || {}

    if (!typeis(req, type)) return next();

    // read
    read(req, res, next, parse, {
      limit: limit,
      verify: verify
    })
  }
}

function urlencoded(options){
  options = options || {};

  var extended = options.extended !== false
  var limit = typeof options.limit !== 'number'
    ? bytes(options.limit || '100kb')
    : options.limit;
  var type = options.type || 'urlencoded';
  var verify = options.verify || false;

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  var queryparse = extended
    ? qs.parse
    : querystring.parse

  function parse(str) {
    return str.length
      ? queryparse(str)
      : {}
  }

  return function urlencodedParser(req, res, next) {
    if (req._body) return next();
    req.body = req.body || {}

    if (!typeis(req, type)) return next();

    // read
    read(req, res, next, parse, {
      limit: limit,
      verify: verify
    })
  }
}

function firstchar(str) {
  if (!str) return ''
  var match = firstcharRegExp.exec(str)
  return match ? match[1] : ''
}

function read(req, res, next, parse, options) {
  var length = req.headers['content-length']
  var waitend = true

  // flag as parsed
  req._body = true

  options = options || {}
  options.length = length

  var encoding = options.encoding || 'utf-8'
  var verify = options.verify

  options.encoding = verify
    ? null
    : encoding

  req.on('aborted', cleanup)
  req.on('end', cleanup)
  req.on('error', cleanup)

  // read body
  getBody(req, options, function (err, body) {
    if (err && waitend && req.readable) {
      // read off entire request
      req.resume()
      req.once('end', function onEnd() {
        next(err)
      })
      return
    }

    if (err) {
      next(err)
      return
    }

    var str

    // verify
    if (verify) {
      try {
        verify(req, res, body, encoding)
      } catch (err) {
        if (!err.status) err.status = 403
        return next(err)
      }
    }

    // parse
    try {
      str = typeof body !== 'string'
        ? body.toString(encoding)
        : body
      req.body = parse(str)
    } catch (err){
      err.body = str
      err.status = 400
      return next(err)
    }

    next()
  })

  function cleanup() {
    waitend = false
    req.removeListener('aborted', cleanup)
    req.removeListener('end', cleanup)
    req.removeListener('error', cleanup)
  }
}

},{"bytes":58,"http":123,"qs":59,"querystring":135,"raw-body":60,"type-is":61}],58:[function(require,module,exports){

/**
 * Parse byte `size` string.
 *
 * @param {String} size
 * @return {Number}
 * @api public
 */

module.exports = function(size) {
  if ('number' == typeof size) return convert(size);
  var parts = size.match(/^(\d+(?:\.\d+)?) *(kb|mb|gb|tb)$/)
    , n = parseFloat(parts[1])
    , type = parts[2];

  var map = {
      kb: 1 << 10
    , mb: 1 << 20
    , gb: 1 << 30
    , tb: ((1 << 30) * 1024)
  };

  return map[type] * n;
};

/**
 * convert bytes into string.
 *
 * @param {Number} b - bytes to convert
 * @return {String}
 * @api public
 */

function convert (b) {
  var tb = ((1 << 30) * 1024), gb = 1 << 30, mb = 1 << 20, kb = 1 << 10, abs = Math.abs(b);
  if (abs >= tb) return (Math.round(b / tb * 100) / 100) + 'tb';
  if (abs >= gb) return (Math.round(b / gb * 100) / 100) + 'gb';
  if (abs >= mb) return (Math.round(b / mb * 100) / 100) + 'mb';
  if (abs >= kb) return (Math.round(b / kb * 100) / 100) + 'kb';
  return b + 'b';
}

},{}],59:[function(require,module,exports){
/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Object#hasOwnProperty ref
 */

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Array#indexOf shim.
 */

var indexOf = typeof Array.prototype.indexOf === 'function'
  ? function(arr, el) { return arr.indexOf(el); }
  : function(arr, el) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] === el) return i;
      }
      return -1;
    };

/**
 * Array.isArray shim.
 */

var isArray = Array.isArray || function(arr) {
  return toString.call(arr) == '[object Array]';
};

/**
 * Object.keys shim.
 */

var objectKeys = Object.keys || function(obj) {
  var ret = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      ret.push(key);
    }
  }
  return ret;
};

/**
 * Array#forEach shim.
 */

var forEach = typeof Array.prototype.forEach === 'function'
  ? function(arr, fn) { return arr.forEach(fn); }
  : function(arr, fn) {
      for (var i = 0; i < arr.length; i++) fn(arr[i]);
    };

/**
 * Array#reduce shim.
 */

var reduce = function(arr, fn, initial) {
  if (typeof arr.reduce === 'function') return arr.reduce(fn, initial);
  var res = initial;
  for (var i = 0; i < arr.length; i++) res = fn(res, arr[i]);
  return res;
};

/**
 * Cache non-integer test regexp.
 */

var isint = /^[0-9]+$/;

function promote(parent, key) {
  if (parent[key].length == 0) return parent[key] = {}
  var t = {};
  for (var i in parent[key]) {
    if (hasOwnProperty.call(parent[key], i)) {
      t[i] = parent[key][i];
    }
  }
  parent[key] = t;
  return t;
}

function parse(parts, parent, key, val) {
  var part = parts.shift();
  
  // illegal
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;
  
  // end
  if (!part) {
    if (isArray(parent[key])) {
      parent[key].push(val);
    } else if ('object' == typeof parent[key]) {
      parent[key] = val;
    } else if ('undefined' == typeof parent[key]) {
      parent[key] = val;
    } else {
      parent[key] = [parent[key], val];
    }
    // array
  } else {
    var obj = parent[key] = parent[key] || [];
    if (']' == part) {
      if (isArray(obj)) {
        if ('' != val) obj.push(val);
      } else if ('object' == typeof obj) {
        obj[objectKeys(obj).length] = val;
      } else {
        obj = parent[key] = [parent[key], val];
      }
      // prop
    } else if (~indexOf(part, ']')) {
      part = part.substr(0, part.length - 1);
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
      // key
    } else {
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
    }
  }
}

/**
 * Merge parent key/val pair.
 */

function merge(parent, key, val){
  if (~indexOf(key, ']')) {
    var parts = key.split('[')
      , len = parts.length
      , last = len - 1;
    parse(parts, parent, 'base', val);
    // optimize
  } else {
    if (!isint.test(key) && isArray(parent.base)) {
      var t = {};
      for (var k in parent.base) t[k] = parent.base[k];
      parent.base = t;
    }
    set(parent.base, key, val);
  }

  return parent;
}

/**
 * Compact sparse arrays.
 */

function compact(obj) {
  if ('object' != typeof obj) return obj;

  if (isArray(obj)) {
    var ret = [];

    for (var i in obj) {
      if (hasOwnProperty.call(obj, i)) {
        ret.push(obj[i]);
      }
    }

    return ret;
  }

  for (var key in obj) {
    obj[key] = compact(obj[key]);
  }

  return obj;
}

/**
 * Parse the given obj.
 */

function parseObject(obj){
  var ret = { base: {} };

  forEach(objectKeys(obj), function(name){
    merge(ret, name, obj[name]);
  });

  return compact(ret.base);
}

/**
 * Parse the given str.
 */

function parseString(str){
  var ret = reduce(String(str).split('&'), function(ret, pair){
    var eql = indexOf(pair, '=')
      , brace = lastBraceInKey(pair)
      , key = pair.substr(0, brace || eql)
      , val = pair.substr(brace || eql, pair.length)
      , val = val.substr(indexOf(val, '=') + 1, val.length);

    // ?foo
    if ('' == key) key = pair, val = '';
    if ('' == key) return ret;

    return merge(ret, decode(key), decode(val));
  }, { base: {} }).base;

  return compact(ret);
}

/**
 * Parse the given query `str` or `obj`, returning an object.
 *
 * @param {String} str | {Object} obj
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};
  return 'object' == typeof str
    ? parseObject(str)
    : parseString(str);
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix + '=' + encodeURIComponent(String(obj));
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[' + i + ']'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = objectKeys(obj)
    , key;

  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    if ('' == key) continue;
    if (null == obj[key]) {
      ret.push(encodeURIComponent(key) + '=');
    } else {
      ret.push(stringify(obj[key], prefix
        ? prefix + '[' + encodeURIComponent(key) + ']'
        : encodeURIComponent(key)));
    }
  }

  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}

/**
 * Decode `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function decode(str) {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch (err) {
    return str;
  }
}

},{}],60:[function(require,module,exports){
(function (process,Buffer){
var StringDecoder = require('string_decoder').StringDecoder
var bytes = require('bytes')

module.exports = function (stream, options, done) {
  if (typeof options === 'function') {
    done = options
    options = {}
  } else if (!options) {
    options = {}
  } else if (options === true) {
    options = {
      encoding: 'utf8'
    }
  }

  // convert the limit to an integer
  var limit = null
  if (typeof options.limit === 'number')
    limit = options.limit
  if (typeof options.limit === 'string')
    limit = bytes(options.limit)

  // convert the expected length to an integer
  var length = null
  if (options.length != null && !isNaN(options.length))
    length = parseInt(options.length, 10)

  // check the length and limit options.
  // note: we intentionally leave the stream paused,
  // so users should handle the stream themselves.
  if (limit !== null && length !== null && length > limit) {
    if (typeof stream.pause === 'function')
      stream.pause()

    process.nextTick(function () {
      var err = makeError('request entity too large', 'entity.too.large')
      err.status = err.statusCode = 413
      err.length = err.expected = length
      err.limit = limit
      done(err)
    })
    return defer
  }

  // streams1: assert request encoding is buffer.
  // streams2+: assert the stream encoding is buffer.
  //   stream._decoder: streams1
  //   state.encoding: streams2
  //   state.decoder: streams2, specifically < 0.10.6
  var state = stream._readableState
  if (stream._decoder || (state && (state.encoding || state.decoder))) {
    if (typeof stream.pause === 'function')
      stream.pause()

    process.nextTick(function () {
      var err = makeError('stream encoding should not be set',
        'stream.encoding.set')
      // developer error
      err.status = err.statusCode = 500
      done(err)
    })
    return defer
  }

  var received = 0
  // note: we delegate any invalid encodings to the constructor
  var decoder = options.encoding
    ? new StringDecoder(options.encoding === true ? 'utf8' : options.encoding)
    : null
  var buffer = decoder
    ? ''
    : []

  stream.on('data', onData)
  stream.once('end', onEnd)
  stream.once('error', onEnd)
  stream.once('close', cleanup)

  return defer

  // yieldable support
  function defer(fn) {
    done = fn
  }

  function onData(chunk) {
    received += chunk.length
    decoder
      ? buffer += decoder.write(chunk)
      : buffer.push(chunk)

    if (limit !== null && received > limit) {
      if (typeof stream.pause === 'function')
        stream.pause()
      var err = makeError('request entity too large', 'entity.too.large')
      err.status = err.statusCode = 413
      err.received = received
      err.limit = limit
      done(err)
      cleanup()
    }
  }

  function onEnd(err) {
    if (err) {
      if (typeof stream.pause === 'function')
        stream.pause()
      done(err)
    } else if (length !== null && received !== length) {
      err = makeError('request size did not match content length',
        'request.size.invalid')
      err.status = err.statusCode = 400
      err.received = received
      err.length = err.expected = length
      done(err)
    } else {
      done(null, decoder
        ? buffer + endStringDecoder(decoder)
        : Buffer.concat(buffer)
      )
    }

    cleanup()
  }

  function cleanup() {
    received = buffer = null

    stream.removeListener('data', onData)
    stream.removeListener('end', onEnd)
    stream.removeListener('error', onEnd)
    stream.removeListener('close', cleanup)
  }
}

// to create serializable errors you must re-set message so
// that it is enumerable and you must re configure the type
// property so that is writable and enumerable
function makeError(message, type) {
  var error = new Error()
  error.message = message
  Object.defineProperty(error, 'type', {
    value: type,
    enumerable: true,
    writable: true,
    configurable: true
  })
  return error
}

// https://github.com/Raynos/body/blob/2512ced39e31776e5a2f7492b907330badac3a40/index.js#L72
// bug fix for missing `StringDecoder.end` in v0.8.x
function endStringDecoder(decoder) {
    if (decoder.end) {
        return decoder.end()
    }

    var res = ""

    if (decoder.charReceived) {
        var cr = decoder.charReceived
        var buf = decoder.charBuffer
        var enc = decoder.encoding
        res += buf.slice(0, cr).toString(enc)
    }

    return res
}

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":131,"buffer":104,"bytes":58,"string_decoder":148}],61:[function(require,module,exports){

var mime = require('mime');

var slice = [].slice;

module.exports = typeofrequest;
typeofrequest.is = typeis;
typeofrequest.hasBody = hasbody;
typeofrequest.normalize = normalize;
typeofrequest.match = mimeMatch;

/**
 * Compare a `value` content-type with `types`.
 * Each `type` can be an extension like `html`,
 * a special shortcut like `multipart` or `urlencoded`,
 * or a mime type.
 *
 * If no types match, `false` is returned.
 * Otherwise, the first `type` that matches is returned.
 *
 * @param {String} value
 * @param {Array} types
 * @return String
 */

function typeis(value, types) {
  if (!value) return false;
  if (types && !Array.isArray(types)) types = slice.call(arguments, 1);

  // remove stuff like charsets
  var index = value.indexOf(';')
  value = ~index ? value.slice(0, index) : value

  // no types, return the content type
  if (!types || !types.length) return value;

  var type;
  for (var i = 0; i < types.length; i++) {
    if (mimeMatch(normalize(type = types[i]), value)) {
      return type[0] === '+' || ~type.indexOf('*')
        ? value
        : type
    }
  }

  // no matches
  return false;
}

/**
 * Check if a request has a request body.
 * A request with a body __must__ either have `transfer-encoding`
 * or `content-length` headers set.
 * http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.3
 *
 * @param {Object} request
 * @return {Boolean}
 * @api public
 */

function hasbody(req) {
  var headers = req.headers;
  if ('transfer-encoding' in headers) return true;
  var length = headers['content-length'];
  if (!length) return false;
  // no idea when this would happen, but `isNaN(null) === false`
  if (isNaN(length)) return false;
  return !!parseInt(length, 10);
}

/**
 * Check if the incoming request contains the "Content-Type"
 * header field, and it contains any of the give mime `type`s.
 * If there is no request body, `null` is returned.
 * If there is no content type, `false` is returned.
 * Otherwise, it returns the first `type` that matches.
 *
 * Examples:
 *
 *     // With Content-Type: text/html; charset=utf-8
 *     this.is('html'); // => 'html'
 *     this.is('text/html'); // => 'text/html'
 *     this.is('text/*', 'application/json'); // => 'text/html'
 *
 *     // When Content-Type is application/json
 *     this.is('json', 'urlencoded'); // => 'json'
 *     this.is('application/json'); // => 'application/json'
 *     this.is('html', 'application/*'); // => 'application/json'
 *
 *     this.is('html'); // => false
 *
 * @param {String|Array} types...
 * @return {String|false|null}
 * @api public
 */

function typeofrequest(req, types) {
  if (!hasbody(req)) return null;
  if (types && !Array.isArray(types)) types = slice.call(arguments, 1);
  return typeis(req.headers['content-type'], types);
}

/**
 * Normalize a mime type.
 * If it's a shorthand, expand it to a valid mime type.
 *
 * In general, you probably want:
 *
 *   var type = is(req, ['urlencoded', 'json', 'multipart']);
 *
 * Then use the appropriate body parsers.
 * These three are the most common request body types
 * and are thus ensured to work.
 *
 * @param {String} type
 * @api private
 */

function normalize(type) {
  switch (type) {
    case 'urlencoded': return 'application/x-www-form-urlencoded';
    case 'multipart':
      type = 'multipart/*';
      break;
  }

  return type[0] === '+' || ~type.indexOf('/')
    ? type
    : mime.lookup(type)
}

/**
 * Check if `exected` mime type
 * matches `actual` mime type with
 * wildcard and +suffix support.
 *
 * @param {String} expected
 * @param {String} actual
 * @return {Boolean}
 * @api private
 */

function mimeMatch(expected, actual) {
  if (expected === actual) return true;

  actual = actual.split('/');

  if (expected[0] === '+') {
    // support +suffix
    return Boolean(actual[1])
      && expected.length <= actual[1].length
      && expected === actual[1].substr(0 - expected.length)
  }

  if (!~expected.indexOf('*')) return false;

  expected = expected.split('/');

  if (expected[0] === '*') {
    // support */yyy
    return expected[1] === actual[1]
  }

  if (expected[1] === '*') {
    // support xxx/*
    return expected[0] === actual[0]
  }

  if (expected[1][0] === '*' && expected[1][1] === '+') {
    // support xxx/*+zzz
    return expected[0] === actual[0]
      && expected[1].length <= actual[1].length + 1
      && expected[1].substr(1) === actual[1].substr(1 - expected[1].length)
  }

  return false
}

},{"mime":62}],62:[function(require,module,exports){
(function (process,__dirname){
var path = require('path');
var fs = require('fs');

function Mime() {
  // Map of extension -> mime type
  this.types = Object.create(null);

  // Map of mime type -> extension
  this.extensions = Object.create(null);
}

/**
 * Define mimetype -> extension mappings.  Each key is a mime-type that maps
 * to an array of extensions associated with the type.  The first extension is
 * used as the default extension for the type.
 *
 * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
 *
 * @param map (Object) type definitions
 */
Mime.prototype.define = function (map) {
  for (var type in map) {
    var exts = map[type];

    for (var i = 0; i < exts.length; i++) {
      if (process.env.DEBUG_MIME && this.types[exts]) {
        console.warn(this._loading.replace(/.*\//, ''), 'changes "' + exts[i] + '" extension type from ' +
          this.types[exts] + ' to ' + type);
      }

      this.types[exts[i]] = type;
    }

    // Default extension is the first one we encounter
    if (!this.extensions[type]) {
      this.extensions[type] = exts[0];
    }
  }
};

/**
 * Load an Apache2-style ".types" file
 *
 * This may be called multiple times (it's expected).  Where files declare
 * overlapping types/extensions, the last file wins.
 *
 * @param file (String) path of file to load.
 */
Mime.prototype.load = function(file) {

  this._loading = file;
  // Read file and split into lines
  var map = {},
      content = fs.readFileSync(file, 'ascii'),
      lines = content.split(/[\r\n]+/);

  lines.forEach(function(line) {
    // Clean up whitespace/comments, and split into fields
    var fields = line.replace(/\s*#.*|^\s*|\s*$/g, '').split(/\s+/);
    map[fields.shift()] = fields;
  });

  this.define(map);

  this._loading = null;
};

/**
 * Lookup a mime type based on extension
 */
Mime.prototype.lookup = function(path, fallback) {
  var ext = path.replace(/.*[\.\/\\]/, '').toLowerCase();

  return this.types[ext] || fallback || this.default_type;
};

/**
 * Return file extension associated with a mime type
 */
Mime.prototype.extension = function(mimeType) {
  var type = mimeType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase();
  return this.extensions[type];
};

// Default instance
var mime = new Mime();

// Load local copy of
// http://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types
mime.load(path.join(__dirname, 'types/mime.types'));

// Load additional types from node.js community
mime.load(path.join(__dirname, 'types/node.types'));

// Default type
mime.default_type = mime.lookup('bin');

//
// Additional API specific to the default instance
//

mime.Mime = Mime;

/**
 * Lookup a charset based on mime type.
 */
mime.charsets = {
  lookup: function(mimeType, fallback) {
    // Assume text types are utf8
    return (/^text\//).test(mimeType) ? 'UTF-8' : fallback;
  }
};

module.exports = mime;

}).call(this,require('_process'),"/node_modules/cylon/node_modules/body-parser/node_modules/type-is/node_modules/mime")
},{"_process":131,"fs":101,"path":130}],63:[function(require,module,exports){

module.exports = require('./lib/express');

},{"./lib/express":65}],64:[function(require,module,exports){
(function (process,Buffer){
/**
 * Module dependencies.
 */

var mixin = require('utils-merge');
var escapeHtml = require('escape-html');
var Router = require('./router');
var methods = require('methods');
var middleware = require('./middleware/init');
var query = require('./middleware/query');
var debug = require('debug')('express:application');
var View = require('./view');
var http = require('http');
var compileETag = require('./utils').compileETag;
var compileTrust = require('./utils').compileTrust;
var deprecate = require('./utils').deprecate;

/**
 * Application prototype.
 */

var app = exports = module.exports = {};

/**
 * Initialize the server.
 *
 *   - setup default configuration
 *   - setup default middleware
 *   - setup route reflection methods
 *
 * @api private
 */

app.init = function(){
  this.cache = {};
  this.settings = {};
  this.engines = {};
  this.defaultConfiguration();
};

/**
 * Initialize application configuration.
 *
 * @api private
 */

app.defaultConfiguration = function(){
  // default settings
  this.enable('x-powered-by');
  this.set('etag', 'weak');
  var env = process.env.NODE_ENV || 'development';
  this.set('env', env);
  this.set('subdomain offset', 2);
  this.set('trust proxy', false);

  debug('booting in %s mode', env);

  // inherit protos
  this.on('mount', function(parent){
    this.request.__proto__ = parent.request;
    this.response.__proto__ = parent.response;
    this.engines.__proto__ = parent.engines;
    this.settings.__proto__ = parent.settings;
  });

  // setup locals
  this.locals = Object.create(null);

  // top-most app is mounted at /
  this.mountpath = '/';

  // default locals
  this.locals.settings = this.settings;

  // default configuration
  this.set('view', View);
  this.set('views', process.cwd() + '/views');
  this.set('jsonp callback name', 'callback');

  if (env === 'production') {
    this.enable('view cache');
  }

  Object.defineProperty(this, 'router', {
    get: function() {
      throw new Error('\'app.router\' is deprecated!\nPlease see the 3.x to 4.x migration guide for details on how to update your app.');
    }
  });
};

/**
 * lazily adds the base router if it has not yet been added.
 *
 * We cannot add the base router in the defaultConfiguration because
 * it reads app settings which might be set after that has run.
 *
 * @api private
 */
app.lazyrouter = function() {
  if (!this._router) {
    this._router = new Router({
      caseSensitive: this.enabled('case sensitive routing'),
      strict: this.enabled('strict routing')
    });

    this._router.use(query());
    this._router.use(middleware.init(this));
  }
};

/**
 * Dispatch a req, res pair into the application. Starts pipeline processing.
 *
 * If no _done_ callback is provided, then default error handlers will respond
 * in the event of an error bubbling through the stack.
 *
 * @api private
 */

app.handle = function(req, res, done) {
  var env = this.get('env');

  this._router.handle(req, res, function(err) {
    if (done) {
      return done(err);
    }

    // unhandled error
    if (err) {
      // default to 500
      if (res.statusCode < 400) res.statusCode = 500;
      debug('default %s', res.statusCode);

      // respect err.status
      if (err.status) res.statusCode = err.status;

      // production gets a basic error message
      var msg = 'production' == env
        ? http.STATUS_CODES[res.statusCode]
        : err.stack || err.toString();
      msg = escapeHtml(msg);

      // log to stderr in a non-test env
      if ('test' != env) console.error(err.stack || err.toString());
      if (res.headersSent) return req.socket.destroy();
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Length', Buffer.byteLength(msg));
      if ('HEAD' == req.method) return res.end();
      res.end(msg);
      return;
    }

    // 404
    debug('default 404');
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html');
    if ('HEAD' == req.method) return res.end();
    res.end('Cannot ' + escapeHtml(req.method) + ' ' + escapeHtml(req.originalUrl) + '\n');
  });
};

/**
 * Proxy `Router#use()` to add middleware to the app router.
 * See Router#use() documentation for details.
 *
 * If the _fn_ parameter is an express app, then it will be
 * mounted at the _route_ specified.
 *
 * @api public
 */

app.use = function(route, fn){
  var mount_app;

  // default route to '/'
  if ('string' != typeof route) fn = route, route = '/';

  // express app
  if (fn.handle && fn.set) mount_app = fn;

  // restore .app property on req and res
  if (mount_app) {
    debug('.use app under %s', route);
    mount_app.mountpath = route;
    fn = function(req, res, next) {
      var orig = req.app;
      mount_app.handle(req, res, function(err) {
        req.__proto__ = orig.request;
        res.__proto__ = orig.response;
        next(err);
      });
    };
  }

  this.lazyrouter();
  this._router.use(route, fn);

  // mounted an app
  if (mount_app) {
    mount_app.parent = this;
    mount_app.emit('mount', this);
  }

  return this;
};

/**
 * Proxy to the app `Router#route()`
 * Returns a new `Route` instance for the _path_.
 *
 * Routes are isolated middleware stacks for specific paths.
 * See the Route api docs for details.
 *
 * @api public
 */

app.route = function(path){
  this.lazyrouter();
  return this._router.route(path);
};

/**
 * Register the given template engine callback `fn`
 * as `ext`.
 *
 * By default will `require()` the engine based on the
 * file extension. For example if you try to render
 * a "foo.jade" file Express will invoke the following internally:
 *
 *     app.engine('jade', require('jade').__express);
 *
 * For engines that do not provide `.__express` out of the box,
 * or if you wish to "map" a different extension to the template engine
 * you may use this method. For example mapping the EJS template engine to
 * ".html" files:
 *
 *     app.engine('html', require('ejs').renderFile);
 *
 * In this case EJS provides a `.renderFile()` method with
 * the same signature that Express expects: `(path, options, callback)`,
 * though note that it aliases this method as `ejs.__express` internally
 * so if you're using ".ejs" extensions you dont need to do anything.
 *
 * Some template engines do not follow this convention, the
 * [Consolidate.js](https://github.com/visionmedia/consolidate.js)
 * library was created to map all of node's popular template
 * engines to follow this convention, thus allowing them to
 * work seamlessly within Express.
 *
 * @param {String} ext
 * @param {Function} fn
 * @return {app} for chaining
 * @api public
 */

app.engine = function(ext, fn){
  if ('function' != typeof fn) throw new Error('callback function required');
  if ('.' != ext[0]) ext = '.' + ext;
  this.engines[ext] = fn;
  return this;
};

/**
 * Proxy to `Router#param()` with one added api feature. The _name_ parameter
 * can be an array of names.
 *
 * See the Router#param() docs for more details.
 *
 * @param {String|Array} name
 * @param {Function} fn
 * @return {app} for chaining
 * @api public
 */

app.param = function(name, fn){
  var self = this;
  self.lazyrouter();

  if (Array.isArray(name)) {
    name.forEach(function(key) {
      self.param(key, fn);
    });
    return this;
  }

  self._router.param(name, fn);
  return this;
};

/**
 * Assign `setting` to `val`, or return `setting`'s value.
 *
 *    app.set('foo', 'bar');
 *    app.get('foo');
 *    // => "bar"
 *
 * Mounted servers inherit their parent server's settings.
 *
 * @param {String} setting
 * @param {*} [val]
 * @return {Server} for chaining
 * @api public
 */

app.set = function(setting, val){
  if (arguments.length === 1) {
    // app.get(setting)
    return this.settings[setting];
  }

  // set value
  this.settings[setting] = val;

  // trigger matched settings
  switch (setting) {
    case 'etag':
      debug('compile etag %s', val);
      this.set('etag fn', compileETag(val));
      break;
    case 'trust proxy':
      debug('compile trust proxy %s', val);
      this.set('trust proxy fn', compileTrust(val));
      break;
  }

  return this;
};

/**
 * Return the app's absolute pathname
 * based on the parent(s) that have
 * mounted it.
 *
 * For example if the application was
 * mounted as "/admin", which itself
 * was mounted as "/blog" then the
 * return value would be "/blog/admin".
 *
 * @return {String}
 * @api private
 */

app.path = function(){
  return this.parent
    ? this.parent.path() + this.mountpath
    : '';
};

/**
 * Check if `setting` is enabled (truthy).
 *
 *    app.enabled('foo')
 *    // => false
 *
 *    app.enable('foo')
 *    app.enabled('foo')
 *    // => true
 *
 * @param {String} setting
 * @return {Boolean}
 * @api public
 */

app.enabled = function(setting){
  return !!this.set(setting);
};

/**
 * Check if `setting` is disabled.
 *
 *    app.disabled('foo')
 *    // => true
 *
 *    app.enable('foo')
 *    app.disabled('foo')
 *    // => false
 *
 * @param {String} setting
 * @return {Boolean}
 * @api public
 */

app.disabled = function(setting){
  return !this.set(setting);
};

/**
 * Enable `setting`.
 *
 * @param {String} setting
 * @return {app} for chaining
 * @api public
 */

app.enable = function(setting){
  return this.set(setting, true);
};

/**
 * Disable `setting`.
 *
 * @param {String} setting
 * @return {app} for chaining
 * @api public
 */

app.disable = function(setting){
  return this.set(setting, false);
};

/**
 * Delegate `.VERB(...)` calls to `router.VERB(...)`.
 */

methods.forEach(function(method){
  app[method] = function(path){
    if ('get' == method && 1 == arguments.length) return this.set(path);

    this.lazyrouter();

    var route = this._router.route(path);
    route[method].apply(route, [].slice.call(arguments, 1));
    return this;
  };
});

/**
 * Special-cased "all" method, applying the given route `path`,
 * middleware, and callback to _every_ HTTP method.
 *
 * @param {String} path
 * @param {Function} ...
 * @return {app} for chaining
 * @api public
 */

app.all = function(path){
  this.lazyrouter();

  var route = this._router.route(path);
  var args = [].slice.call(arguments, 1);
  methods.forEach(function(method){
    route[method].apply(route, args);
  });

  return this;
};

// del -> delete alias

app.del = deprecate(app.delete, 'app.del: Use app.delete instead');

/**
 * Render the given view `name` name with `options`
 * and a callback accepting an error and the
 * rendered template string.
 *
 * Example:
 *
 *    app.render('email', { name: 'Tobi' }, function(err, html){
 *      // ...
 *    })
 *
 * @param {String} name
 * @param {String|Function} options or fn
 * @param {Function} fn
 * @api public
 */

app.render = function(name, options, fn){
  var opts = {};
  var cache = this.cache;
  var engines = this.engines;
  var view;

  // support callback function as second arg
  if ('function' == typeof options) {
    fn = options, options = {};
  }

  // merge app.locals
  mixin(opts, this.locals);

  // merge options._locals
  if (options._locals) mixin(opts, options._locals);

  // merge options
  mixin(opts, options);

  // set .cache unless explicitly provided
  opts.cache = null == opts.cache
    ? this.enabled('view cache')
    : opts.cache;

  // primed cache
  if (opts.cache) view = cache[name];

  // view
  if (!view) {
    view = new (this.get('view'))(name, {
      defaultEngine: this.get('view engine'),
      root: this.get('views'),
      engines: engines
    });

    if (!view.path) {
      var err = new Error('Failed to lookup view "' + name + '" in views directory "' + view.root + '"');
      err.view = view;
      return fn(err);
    }

    // prime the cache
    if (opts.cache) cache[name] = view;
  }

  // render
  try {
    view.render(opts, fn);
  } catch (err) {
    fn(err);
  }
};

/**
 * Listen for connections.
 *
 * A node `http.Server` is returned, with this
 * application (which is a `Function`) as its
 * callback. If you wish to create both an HTTP
 * and HTTPS server you may do so with the "http"
 * and "https" modules as shown here:
 *
 *    var http = require('http')
 *      , https = require('https')
 *      , express = require('express')
 *      , app = express();
 *
 *    http.createServer(app).listen(80);
 *    https.createServer({ ... }, app).listen(443);
 *
 * @return {http.Server}
 * @api public
 */

app.listen = function(){
  var server = http.createServer(this);
  return server.listen.apply(server, arguments);
};

}).call(this,require('_process'),require("buffer").Buffer)
},{"./middleware/init":66,"./middleware/query":67,"./router":70,"./utils":73,"./view":74,"_process":131,"buffer":104,"debug":81,"escape-html":82,"http":123,"methods":84,"utils-merge":99}],65:[function(require,module,exports){
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var mixin = require('utils-merge');
var proto = require('./application');
var Route = require('./router/route');
var Router = require('./router');
var req = require('./request');
var res = require('./response');

/**
 * Expose `createApplication()`.
 */

exports = module.exports = createApplication;

/**
 * Create an express application.
 *
 * @return {Function}
 * @api public
 */

function createApplication() {
  var app = function(req, res, next) {
    app.handle(req, res, next);
  };

  mixin(app, proto);
  mixin(app, EventEmitter.prototype);

  app.request = { __proto__: req, app: app };
  app.response = { __proto__: res, app: app };
  app.init();
  return app;
}

/**
 * Expose the prototypes.
 */

exports.application = proto;
exports.request = req;
exports.response = res;

/**
 * Expose constructors.
 */

exports.Route = Route;
exports.Router = Router;

/**
 * Expose middleware
 */

exports.query = require('./middleware/query');
exports.static = require('serve-static');

/**
 * Replace removed middleware with an appropriate error message.
 */

[
  'json',
  'urlencoded',
  'bodyParser',
  'compress',
  'cookieSession',
  'session',
  'logger',
  'cookieParser',
  'favicon',
  'responseTime',
  'errorHandler',
  'timeout',
  'methodOverride',
  'vhost',
  'csrf',
  'directory',
  'limit',
  'multipart',
  'staticCache',
].forEach(function (name) {
  Object.defineProperty(exports, name, {
    get: function () {
      throw new Error('Most middleware (like ' + name + ') is no longer bundled with Express and must be installed separately. Please see https://github.com/senchalabs/connect#middleware.');
    },
    configurable: true
  });
});

},{"./application":64,"./middleware/query":67,"./request":68,"./response":69,"./router":70,"./router/route":72,"events":122,"serve-static":96,"utils-merge":99}],66:[function(require,module,exports){
/**
 * Initialization middleware, exposing the
 * request and response to eachother, as well
 * as defaulting the X-Powered-By header field.
 *
 * @param {Function} app
 * @return {Function}
 * @api private
 */

exports.init = function(app){
  return function expressInit(req, res, next){
    if (app.enabled('x-powered-by')) res.setHeader('X-Powered-By', 'Express');
    req.res = res;
    res.req = req;
    req.next = next;

    req.__proto__ = app.request;
    res.__proto__ = app.response;

    res.locals = res.locals || Object.create(null);

    next();
  };
};


},{}],67:[function(require,module,exports){
/**
 * Module dependencies.
 */

var qs = require('qs');
var parseUrl = require('parseurl');

/**
 * Query:
 *
 * Automatically parse the query-string when available,
 * populating the `req.query` object using
 * [qs](https://github.com/visionmedia/node-querystring).
 *
 * Examples:
 *
 *       .use(connect.query())
 *       .use(function(req, res){
 *         res.end(JSON.stringify(req.query));
 *       });
 *
 *  The `options` passed are provided to qs.parse function.
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = function query(options){
  return function query(req, res, next){
    if (!req.query) {
      req.query = ~req.url.indexOf('?')
        ? qs.parse(parseUrl(req).query, options)
        : {};
    }

    next();
  };
};

},{"parseurl":85,"qs":89}],68:[function(require,module,exports){
/**
 * Module dependencies.
 */

var accepts = require('accepts');
var typeis = require('type-is');
var http = require('http');
var fresh = require('fresh');
var parseRange = require('range-parser');
var parse = require('parseurl');
var proxyaddr = require('proxy-addr');

/**
 * Request prototype.
 */

var req = exports = module.exports = {
  __proto__: http.IncomingMessage.prototype
};

/**
 * Return request header.
 *
 * The `Referrer` header field is special-cased,
 * both `Referrer` and `Referer` are interchangeable.
 *
 * Examples:
 *
 *     req.get('Content-Type');
 *     // => "text/plain"
 *
 *     req.get('content-type');
 *     // => "text/plain"
 *
 *     req.get('Something');
 *     // => undefined
 *
 * Aliased as `req.header()`.
 *
 * @param {String} name
 * @return {String}
 * @api public
 */

req.get =
req.header = function(name){
  switch (name = name.toLowerCase()) {
    case 'referer':
    case 'referrer':
      return this.headers.referrer
        || this.headers.referer;
    default:
      return this.headers[name];
  }
};

/**
 * To do: update docs.
 *
 * Check if the given `type(s)` is acceptable, returning
 * the best match when true, otherwise `undefined`, in which
 * case you should respond with 406 "Not Acceptable".
 *
 * The `type` value may be a single mime type string
 * such as "application/json", the extension name
 * such as "json", a comma-delimted list such as "json, html, text/plain",
 * an argument list such as `"json", "html", "text/plain"`,
 * or an array `["json", "html", "text/plain"]`. When a list
 * or array is given the _best_ match, if any is returned.
 *
 * Examples:
 *
 *     // Accept: text/html
 *     req.accepts('html');
 *     // => "html"
 *
 *     // Accept: text/*, application/json
 *     req.accepts('html');
 *     // => "html"
 *     req.accepts('text/html');
 *     // => "text/html"
 *     req.accepts('json, text');
 *     // => "json"
 *     req.accepts('application/json');
 *     // => "application/json"
 *
 *     // Accept: text/*, application/json
 *     req.accepts('image/png');
 *     req.accepts('png');
 *     // => undefined
 *
 *     // Accept: text/*;q=.5, application/json
 *     req.accepts(['html', 'json']);
 *     req.accepts('html', 'json');
 *     req.accepts('html, json');
 *     // => "json"
 *
 * @param {String|Array} type(s)
 * @return {String}
 * @api public
 */

req.accepts = function(){
  var accept = accepts(this);
  return accept.types.apply(accept, arguments);
};

/**
 * Check if the given `encoding` is accepted.
 *
 * @param {String} encoding
 * @return {Boolean}
 * @api public
 */

req.acceptsEncoding = // backwards compatibility
req.acceptsEncodings = function(){
  var accept = accepts(this);
  return accept.encodings.apply(accept, arguments);
};

/**
 * To do: update docs.
 *
 * Check if the given `charset` is acceptable,
 * otherwise you should respond with 406 "Not Acceptable".
 *
 * @param {String} charset
 * @return {Boolean}
 * @api public
 */

req.acceptsCharset = // backwards compatibility
req.acceptsCharsets = function(){
  var accept = accepts(this);
  return accept.charsets.apply(accept, arguments);
};

/**
 * To do: update docs.
 *
 * Check if the given `lang` is acceptable,
 * otherwise you should respond with 406 "Not Acceptable".
 *
 * @param {String} lang
 * @return {Boolean}
 * @api public
 */

req.acceptsLanguage = // backwards compatibility
req.acceptsLanguages = function(){
  var accept = accepts(this);
  return accept.languages.apply(accept, arguments);
};

/**
 * Parse Range header field,
 * capping to the given `size`.
 *
 * Unspecified ranges such as "0-" require
 * knowledge of your resource length. In
 * the case of a byte range this is of course
 * the total number of bytes. If the Range
 * header field is not given `null` is returned,
 * `-1` when unsatisfiable, `-2` when syntactically invalid.
 *
 * NOTE: remember that ranges are inclusive, so
 * for example "Range: users=0-3" should respond
 * with 4 users when available, not 3.
 *
 * @param {Number} size
 * @return {Array}
 * @api public
 */

req.range = function(size){
  var range = this.get('Range');
  if (!range) return;
  return parseRange(size, range);
};

/**
 * Return the value of param `name` when present or `defaultValue`.
 *
 *  - Checks route placeholders, ex: _/user/:id_
 *  - Checks body params, ex: id=12, {"id":12}
 *  - Checks query string params, ex: ?id=12
 *
 * To utilize request bodies, `req.body`
 * should be an object. This can be done by using
 * the `bodyParser()` middleware.
 *
 * @param {String} name
 * @param {Mixed} [defaultValue]
 * @return {String}
 * @api public
 */

req.param = function(name, defaultValue){
  var params = this.params || {};
  var body = this.body || {};
  var query = this.query || {};
  if (null != params[name] && params.hasOwnProperty(name)) return params[name];
  if (null != body[name]) return body[name];
  if (null != query[name]) return query[name];
  return defaultValue;
};

/**
 * Check if the incoming request contains the "Content-Type"
 * header field, and it contains the give mime `type`.
 *
 * Examples:
 *
 *      // With Content-Type: text/html; charset=utf-8
 *      req.is('html');
 *      req.is('text/html');
 *      req.is('text/*');
 *      // => true
 *
 *      // When Content-Type is application/json
 *      req.is('json');
 *      req.is('application/json');
 *      req.is('application/*');
 *      // => true
 *
 *      req.is('html');
 *      // => false
 *
 * @param {String} type
 * @return {Boolean}
 * @api public
 */

req.is = function(types){
  if (!Array.isArray(types)) types = [].slice.call(arguments);
  return typeis(this, types);
};

/**
 * Return the protocol string "http" or "https"
 * when requested with TLS. When the "trust proxy"
 * setting trusts the socket address, the
 * "X-Forwarded-Proto" header field will be trusted.
 * If you're running behind a reverse proxy that
 * supplies https for you this may be enabled.
 *
 * @return {String}
 * @api public
 */

req.__defineGetter__('protocol', function(){
  var trust = this.app.get('trust proxy fn');

  if (!trust(this.connection.remoteAddress)) {
    return this.connection.encrypted
      ? 'https'
      : 'http';
  }

  // Note: X-Forwarded-Proto is normally only ever a
  //       single value, but this is to be safe.
  var proto = this.get('X-Forwarded-Proto') || 'http';
  return proto.split(/\s*,\s*/)[0];
});

/**
 * Short-hand for:
 *
 *    req.protocol == 'https'
 *
 * @return {Boolean}
 * @api public
 */

req.__defineGetter__('secure', function(){
  return 'https' == this.protocol;
});

/**
 * Return the remote address from the trusted proxy.
 *
 * The is the remote address on the socket unless
 * "trust proxy" is set.
 *
 * @return {String}
 * @api public
 */

req.__defineGetter__('ip', function(){
  var trust = this.app.get('trust proxy fn');
  return proxyaddr(this, trust);
});

/**
 * When "trust proxy" is set, trusted proxy addresses + client.
 *
 * For example if the value were "client, proxy1, proxy2"
 * you would receive the array `["client", "proxy1", "proxy2"]`
 * where "proxy2" is the furthest down-stream and "proxy1" and
 * "proxy2" were trusted.
 *
 * @return {Array}
 * @api public
 */

req.__defineGetter__('ips', function(){
  var trust = this.app.get('trust proxy fn');
  var addrs = proxyaddr.all(this, trust);
  return addrs.slice(1).reverse();
});

/**
 * Return subdomains as an array.
 *
 * Subdomains are the dot-separated parts of the host before the main domain of
 * the app. By default, the domain of the app is assumed to be the last two
 * parts of the host. This can be changed by setting "subdomain offset".
 *
 * For example, if the domain is "tobi.ferrets.example.com":
 * If "subdomain offset" is not set, req.subdomains is `["ferrets", "tobi"]`.
 * If "subdomain offset" is 3, req.subdomains is `["tobi"]`.
 *
 * @return {Array}
 * @api public
 */

req.__defineGetter__('subdomains', function(){
  var offset = this.app.get('subdomain offset');
  return (this.host || '')
    .split('.')
    .reverse()
    .slice(offset);
});

/**
 * Short-hand for `url.parse(req.url).pathname`.
 *
 * @return {String}
 * @api public
 */

req.__defineGetter__('path', function(){
  return parse(this).pathname;
});

/**
 * Parse the "Host" header field hostname.
 *
 * When the "trust proxy" setting trusts the socket
 * address, the "X-Forwarded-Host" header field will
 * be trusted.
 *
 * @return {String}
 * @api public
 */

req.__defineGetter__('host', function(){
  var trust = this.app.get('trust proxy fn');
  var host = this.get('X-Forwarded-Host');

  if (!host || !trust(this.connection.remoteAddress)) {
    host = this.get('Host');
  }

  if (!host) return;

  // IPv6 literal support
  var offset = host[0] === '['
    ? host.indexOf(']') + 1
    : 0;
  var index = host.indexOf(':', offset);

  return ~index
    ? host.substring(0, index)
    : host;
});

/**
 * Check if the request is fresh, aka
 * Last-Modified and/or the ETag
 * still match.
 *
 * @return {Boolean}
 * @api public
 */

req.__defineGetter__('fresh', function(){
  var method = this.method;
  var s = this.res.statusCode;

  // GET or HEAD for weak freshness validation only
  if ('GET' != method && 'HEAD' != method) return false;

  // 2xx or 304 as per rfc2616 14.26
  if ((s >= 200 && s < 300) || 304 == s) {
    return fresh(this.headers, this.res._headers);
  }

  return false;
});

/**
 * Check if the request is stale, aka
 * "Last-Modified" and / or the "ETag" for the
 * resource has changed.
 *
 * @return {Boolean}
 * @api public
 */

req.__defineGetter__('stale', function(){
  return !this.fresh;
});

/**
 * Check if the request was an _XMLHttpRequest_.
 *
 * @return {Boolean}
 * @api public
 */

req.__defineGetter__('xhr', function(){
  var val = this.get('X-Requested-With') || '';
  return 'xmlhttprequest' == val.toLowerCase();
});

},{"accepts":75,"fresh":83,"http":123,"parseurl":85,"proxy-addr":87,"range-parser":90,"type-is":97}],69:[function(require,module,exports){
(function (Buffer){
/**
 * Module dependencies.
 */

var http = require('http');
var path = require('path');
var mixin = require('utils-merge');
var escapeHtml = require('escape-html');
var sign = require('cookie-signature').sign;
var normalizeType = require('./utils').normalizeType;
var normalizeTypes = require('./utils').normalizeTypes;
var setCharset = require('./utils').setCharset;
var contentDisposition = require('./utils').contentDisposition;
var deprecate = require('./utils').deprecate;
var statusCodes = http.STATUS_CODES;
var cookie = require('cookie');
var send = require('send');
var basename = path.basename;
var extname = path.extname;
var mime = send.mime;

/**
 * Response prototype.
 */

var res = module.exports = {
  __proto__: http.ServerResponse.prototype
};

/**
 * Set status `code`.
 *
 * @param {Number} code
 * @return {ServerResponse}
 * @api public
 */

res.status = function(code){
  this.statusCode = code;
  return this;
};

/**
 * Set Link header field with the given `links`.
 *
 * Examples:
 *
 *    res.links({
 *      next: 'http://api.example.com/users?page=2',
 *      last: 'http://api.example.com/users?page=5'
 *    });
 *
 * @param {Object} links
 * @return {ServerResponse}
 * @api public
 */

res.links = function(links){
  var link = this.get('Link') || '';
  if (link) link += ', ';
  return this.set('Link', link + Object.keys(links).map(function(rel){
    return '<' + links[rel] + '>; rel="' + rel + '"';
  }).join(', '));
};

/**
 * Send a response.
 *
 * Examples:
 *
 *     res.send(new Buffer('wahoo'));
 *     res.send({ some: 'json' });
 *     res.send('<p>some html</p>');
 *     res.send(404, 'Sorry, cant find that');
 *     res.send(404);
 *
 * @api public
 */

res.send = function(body){
  var req = this.req;
  var head = 'HEAD' == req.method;
  var type;
  var encoding;
  var len;

  // settings
  var app = this.app;

  // allow status / body
  if (2 == arguments.length) {
    // res.send(body, status) backwards compat
    if ('number' != typeof body && 'number' == typeof arguments[1]) {
      this.statusCode = arguments[1];
    } else {
      this.statusCode = body;
      body = arguments[1];
    }
  }

  switch (typeof body) {
    // response status
    case 'number':
      this.get('Content-Type') || this.type('txt');
      this.statusCode = body;
      body = http.STATUS_CODES[body];
      break;
    // string defaulting to html
    case 'string':
      if (!this.get('Content-Type')) this.type('html');
      break;
    case 'boolean':
    case 'object':
      if (null == body) {
        body = '';
      } else if (Buffer.isBuffer(body)) {
        this.get('Content-Type') || this.type('bin');
      } else {
        return this.json(body);
      }
      break;
  }

  // write strings in utf-8
  if ('string' === typeof body) {
    encoding = 'utf8';
    type = this.get('Content-Type');

    // reflect this in content-type
    if ('string' === typeof type) {
      this.set('Content-Type', setCharset(type, 'utf-8'));
    }
  }

  // populate Content-Length
  if (undefined !== body && !this.get('Content-Length')) {
    len = Buffer.isBuffer(body)
      ? body.length
      : Buffer.byteLength(body, encoding);
    this.set('Content-Length', len);
  }

  // ETag support
  var etag = len !== undefined && app.get('etag fn');
  if (etag && ('GET' === req.method || 'HEAD' === req.method)) {
    if (!this.get('ETag')) {
      etag = etag(body, encoding);
      etag && this.set('ETag', etag);
    }
  }

  // freshness
  if (req.fresh) this.statusCode = 304;

  // strip irrelevant headers
  if (204 == this.statusCode || 304 == this.statusCode) {
    this.removeHeader('Content-Type');
    this.removeHeader('Content-Length');
    this.removeHeader('Transfer-Encoding');
    body = '';
  }

  // respond
  this.end((head ? null : body), encoding);

  return this;
};

/**
 * Send JSON response.
 *
 * Examples:
 *
 *     res.json(null);
 *     res.json({ user: 'tj' });
 *     res.json(500, 'oh noes!');
 *     res.json(404, 'I dont have that');
 *
 * @api public
 */

res.json = function(obj){
  // allow status / body
  if (2 == arguments.length) {
    // res.json(body, status) backwards compat
    if ('number' == typeof arguments[1]) {
      this.statusCode = arguments[1];
      return 'number' === typeof obj
        ? jsonNumDeprecated.call(this, obj)
        : jsonDeprecated.call(this, obj);
    } else {
      this.statusCode = obj;
      obj = arguments[1];
    }
  }

  // settings
  var app = this.app;
  var replacer = app.get('json replacer');
  var spaces = app.get('json spaces');
  var body = JSON.stringify(obj, replacer, spaces);

  // content-type
  this.get('Content-Type') || this.set('Content-Type', 'application/json');

  return this.send(body);
};

var jsonDeprecated = deprecate(res.json,
  'res.json(obj, status): Use res.json(status, obj) instead');

var jsonNumDeprecated = deprecate(res.json,
  'res.json(num, status): Use res.status(status).json(num) instead');

/**
 * Send JSON response with JSONP callback support.
 *
 * Examples:
 *
 *     res.jsonp(null);
 *     res.jsonp({ user: 'tj' });
 *     res.jsonp(500, 'oh noes!');
 *     res.jsonp(404, 'I dont have that');
 *
 * @api public
 */

res.jsonp = function(obj){
  // allow status / body
  if (2 == arguments.length) {
    // res.json(body, status) backwards compat
    if ('number' == typeof arguments[1]) {
      this.statusCode = arguments[1];
      return 'number' === typeof obj
        ? jsonpNumDeprecated.call(this, obj)
        : jsonpDeprecated.call(this, obj);
    } else {
      this.statusCode = obj;
      obj = arguments[1];
    }
  }

  // settings
  var app = this.app;
  var replacer = app.get('json replacer');
  var spaces = app.get('json spaces');
  var body = JSON.stringify(obj, replacer, spaces)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  var callback = this.req.query[app.get('jsonp callback name')];

  // content-type
  this.get('Content-Type') || this.set('Content-Type', 'application/json');

  // fixup callback
  if (Array.isArray(callback)) {
    callback = callback[0];
  }

  // jsonp
  if (callback && 'string' === typeof callback) {
    this.set('Content-Type', 'text/javascript');
    var cb = callback.replace(/[^\[\]\w$.]/g, '');
    body = 'typeof ' + cb + ' === \'function\' && ' + cb + '(' + body + ');';
  }

  return this.send(body);
};

var jsonpDeprecated = deprecate(res.json,
  'res.jsonp(obj, status): Use res.jsonp(status, obj) instead');

var jsonpNumDeprecated = deprecate(res.json,
  'res.jsonp(num, status): Use res.status(status).jsonp(num) instead');

/**
 * Transfer the file at the given `path`.
 *
 * Automatically sets the _Content-Type_ response header field.
 * The callback `fn(err)` is invoked when the transfer is complete
 * or when an error occurs. Be sure to check `res.sentHeader`
 * if you wish to attempt responding, as the header and some data
 * may have already been transferred.
 *
 * Options:
 *
 *   - `maxAge` defaulting to 0
 *   - `root`   root directory for relative filenames
 *   - `hidden` serve hidden files, defaulting to false
 *
 * Other options are passed along to `send`.
 *
 * Examples:
 *
 *  The following example illustrates how `res.sendfile()` may
 *  be used as an alternative for the `static()` middleware for
 *  dynamic situations. The code backing `res.sendfile()` is actually
 *  the same code, so HTTP cache support etc is identical.
 *
 *     app.get('/user/:uid/photos/:file', function(req, res){
 *       var uid = req.params.uid
 *         , file = req.params.file;
 *
 *       req.user.mayViewFilesFrom(uid, function(yes){
 *         if (yes) {
 *           res.sendfile('/uploads/' + uid + '/' + file);
 *         } else {
 *           res.send(403, 'Sorry! you cant see that.');
 *         }
 *       });
 *     });
 *
 * @api public
 */

res.sendfile = function(path, options, fn){
  options = options || {};
  var self = this;
  var req = self.req;
  var next = this.req.next;
  var done;


  // support function as second arg
  if ('function' == typeof options) {
    fn = options;
    options = {};
  }

  // socket errors
  req.socket.on('error', error);

  // errors
  function error(err) {
    if (done) return;
    done = true;

    // clean up
    cleanup();
    if (!self.headersSent) self.removeHeader('Content-Disposition');

    // callback available
    if (fn) return fn(err);

    // list in limbo if there's no callback
    if (self.headersSent) return;

    // delegate
    next(err);
  }

  // streaming
  function stream(stream) {
    if (done) return;
    cleanup();
    if (fn) stream.on('end', fn);
  }

  // cleanup
  function cleanup() {
    req.socket.removeListener('error', error);
  }

  // Back-compat
  options.maxage = options.maxage || options.maxAge || 0;

  // transfer
  var file = send(req, path, options);
  file.on('error', error);
  file.on('directory', next);
  file.on('stream', stream);
  file.pipe(this);
  this.on('finish', cleanup);
};

/**
 * Transfer the file at the given `path` as an attachment.
 *
 * Optionally providing an alternate attachment `filename`,
 * and optional callback `fn(err)`. The callback is invoked
 * when the data transfer is complete, or when an error has
 * ocurred. Be sure to check `res.headersSent` if you plan to respond.
 *
 * This method uses `res.sendfile()`.
 *
 * @api public
 */

res.download = function(path, filename, fn){
  // support function as second arg
  if ('function' == typeof filename) {
    fn = filename;
    filename = null;
  }

  filename = filename || path;
  this.set('Content-Disposition', contentDisposition(filename));
  return this.sendfile(path, fn);
};

/**
 * Set _Content-Type_ response header with `type` through `mime.lookup()`
 * when it does not contain "/", or set the Content-Type to `type` otherwise.
 *
 * Examples:
 *
 *     res.type('.html');
 *     res.type('html');
 *     res.type('json');
 *     res.type('application/json');
 *     res.type('png');
 *
 * @param {String} type
 * @return {ServerResponse} for chaining
 * @api public
 */

res.contentType =
res.type = function(type){
  return this.set('Content-Type', ~type.indexOf('/')
    ? type
    : mime.lookup(type));
};

/**
 * Respond to the Acceptable formats using an `obj`
 * of mime-type callbacks.
 *
 * This method uses `req.accepted`, an array of
 * acceptable types ordered by their quality values.
 * When "Accept" is not present the _first_ callback
 * is invoked, otherwise the first match is used. When
 * no match is performed the server responds with
 * 406 "Not Acceptable".
 *
 * Content-Type is set for you, however if you choose
 * you may alter this within the callback using `res.type()`
 * or `res.set('Content-Type', ...)`.
 *
 *    res.format({
 *      'text/plain': function(){
 *        res.send('hey');
 *      },
 *
 *      'text/html': function(){
 *        res.send('<p>hey</p>');
 *      },
 *
 *      'appliation/json': function(){
 *        res.send({ message: 'hey' });
 *      }
 *    });
 *
 * In addition to canonicalized MIME types you may
 * also use extnames mapped to these types:
 *
 *    res.format({
 *      text: function(){
 *        res.send('hey');
 *      },
 *
 *      html: function(){
 *        res.send('<p>hey</p>');
 *      },
 *
 *      json: function(){
 *        res.send({ message: 'hey' });
 *      }
 *    });
 *
 * By default Express passes an `Error`
 * with a `.status` of 406 to `next(err)`
 * if a match is not made. If you provide
 * a `.default` callback it will be invoked
 * instead.
 *
 * @param {Object} obj
 * @return {ServerResponse} for chaining
 * @api public
 */

res.format = function(obj){
  var req = this.req;
  var next = req.next;

  var fn = obj.default;
  if (fn) delete obj.default;
  var keys = Object.keys(obj);

  var key = req.accepts(keys);

  this.vary("Accept");

  if (key) {
    this.set('Content-Type', normalizeType(key).value);
    obj[key](req, this, next);
  } else if (fn) {
    fn();
  } else {
    var err = new Error('Not Acceptable');
    err.status = 406;
    err.types = normalizeTypes(keys).map(function(o){ return o.value });
    next(err);
  }

  return this;
};

/**
 * Set _Content-Disposition_ header to _attachment_ with optional `filename`.
 *
 * @param {String} filename
 * @return {ServerResponse}
 * @api public
 */

res.attachment = function(filename){
  if (filename) this.type(extname(filename));
  this.set('Content-Disposition', contentDisposition(filename));
  return this;
};

/**
 * Set header `field` to `val`, or pass
 * an object of header fields.
 *
 * Examples:
 *
 *    res.set('Foo', ['bar', 'baz']);
 *    res.set('Accept', 'application/json');
 *    res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
 *
 * Aliased as `res.header()`.
 *
 * @param {String|Object|Array} field
 * @param {String} val
 * @return {ServerResponse} for chaining
 * @api public
 */

res.set =
res.header = function(field, val){
  if (2 == arguments.length) {
    if (Array.isArray(val)) val = val.map(String);
    else val = String(val);
    if ('content-type' == field.toLowerCase() && !/;\s*charset\s*=/.test(val)) {
      var charset = mime.charsets.lookup(val.split(';')[0]);
      if (charset) val += '; charset=' + charset.toLowerCase();
    }
    this.setHeader(field, val);
  } else {
    for (var key in field) {
      this.set(key, field[key]);
    }
  }
  return this;
};

/**
 * Get value for header `field`.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

res.get = function(field){
  return this.getHeader(field);
};

/**
 * Clear cookie `name`.
 *
 * @param {String} name
 * @param {Object} options
 * @param {ServerResponse} for chaining
 * @api public
 */

res.clearCookie = function(name, options){
  var opts = { expires: new Date(1), path: '/' };
  return this.cookie(name, '', options
    ? mixin(opts, options)
    : opts);
};

/**
 * Set cookie `name` to `val`, with the given `options`.
 *
 * Options:
 *
 *    - `maxAge`   max-age in milliseconds, converted to `expires`
 *    - `signed`   sign the cookie
 *    - `path`     defaults to "/"
 *
 * Examples:
 *
 *    // "Remember Me" for 15 minutes
 *    res.cookie('rememberme', '1', { expires: new Date(Date.now() + 900000), httpOnly: true });
 *
 *    // save as above
 *    res.cookie('rememberme', '1', { maxAge: 900000, httpOnly: true })
 *
 * @param {String} name
 * @param {String|Object} val
 * @param {Options} options
 * @api public
 */

res.cookie = function(name, val, options){
  options = mixin({}, options);
  var secret = this.req.secret;
  var signed = options.signed;
  if (signed && !secret) throw new Error('cookieParser("secret") required for signed cookies');
  if ('number' == typeof val) val = val.toString();
  if ('object' == typeof val) val = 'j:' + JSON.stringify(val);
  if (signed) val = 's:' + sign(val, secret);
  if ('maxAge' in options) {
    options.expires = new Date(Date.now() + options.maxAge);
    options.maxAge /= 1000;
  }
  if (null == options.path) options.path = '/';
  var headerVal = cookie.serialize(name, String(val), options);

  // supports multiple 'res.cookie' calls by getting previous value
  var prev = this.get('Set-Cookie');
  if (prev) {
    if (Array.isArray(prev)) {
      headerVal = prev.concat(headerVal);
    } else {
      headerVal = [prev, headerVal];
    }
  }
  this.set('Set-Cookie', headerVal);
  return this;
};


/**
 * Set the location header to `url`.
 *
 * The given `url` can also be "back", which redirects
 * to the _Referrer_ or _Referer_ headers or "/".
 *
 * Examples:
 *
 *    res.location('/foo/bar').;
 *    res.location('http://example.com');
 *    res.location('../login');
 *
 * @param {String} url
 * @api public
 */

res.location = function(url){
  var req = this.req;

  // "back" is an alias for the referrer
  if ('back' == url) url = req.get('Referrer') || '/';

  // Respond
  this.set('Location', url);
  return this;
};

/**
 * Redirect to the given `url` with optional response `status`
 * defaulting to 302.
 *
 * The resulting `url` is determined by `res.location()`, so
 * it will play nicely with mounted apps, relative paths,
 * `"back"` etc.
 *
 * Examples:
 *
 *    res.redirect('/foo/bar');
 *    res.redirect('http://example.com');
 *    res.redirect(301, 'http://example.com');
 *    res.redirect('http://example.com', 301);
 *    res.redirect('../login'); // /blog/post/1 -> /blog/login
 *
 * @param {String} url
 * @param {Number} code
 * @api public
 */

res.redirect = function(url){
  var head = 'HEAD' == this.req.method;
  var status = 302;
  var body;

  // allow status / url
  if (2 == arguments.length) {
    if ('number' == typeof url) {
      status = url;
      url = arguments[1];
    } else {
      status = arguments[1];
    }
  }

  // Set location header
  this.location(url);
  url = this.get('Location');

  // Support text/{plain,html} by default
  this.format({
    text: function(){
      body = statusCodes[status] + '. Redirecting to ' + encodeURI(url);
    },

    html: function(){
      var u = escapeHtml(url);
      body = '<p>' + statusCodes[status] + '. Redirecting to <a href="' + u + '">' + u + '</a></p>';
    },

    default: function(){
      body = '';
    }
  });

  // Respond
  this.statusCode = status;
  this.set('Content-Length', Buffer.byteLength(body));
  this.end(head ? null : body);
};

/**
 * Add `field` to Vary. If already present in the Vary set, then
 * this call is simply ignored.
 *
 * @param {Array|String} field
 * @param {ServerResponse} for chaining
 * @api public
 */

res.vary = function(field){
  var self = this;

  // nothing
  if (!field) return this;

  // array
  if (Array.isArray(field)) {
    field.forEach(function(field){
      self.vary(field);
    });
    return;
  }

  var vary = this.get('Vary');

  // append
  if (vary) {
    vary = vary.split(/ *, */);
    if (!~vary.indexOf(field)) vary.push(field);
    this.set('Vary', vary.join(', '));
    return this;
  }

  // set
  this.set('Vary', field);
  return this;
};

/**
 * Render `view` with the given `options` and optional callback `fn`.
 * When a callback function is given a response will _not_ be made
 * automatically, otherwise a response of _200_ and _text/html_ is given.
 *
 * Options:
 *
 *  - `cache`     boolean hinting to the engine it should cache
 *  - `filename`  filename of the view being rendered
 *
 * @api public
 */

res.render = function(view, options, fn){
  options = options || {};
  var self = this;
  var req = this.req;
  var app = req.app;

  // support callback function as second arg
  if ('function' == typeof options) {
    fn = options, options = {};
  }

  // merge res.locals
  options._locals = self.locals;

  // default callback to respond
  fn = fn || function(err, str){
    if (err) return req.next(err);
    self.send(str);
  };

  // render
  app.render(view, options, fn);
};

}).call(this,require("buffer").Buffer)
},{"./utils":73,"buffer":104,"cookie":80,"cookie-signature":79,"escape-html":82,"http":123,"path":130,"send":91,"utils-merge":99}],70:[function(require,module,exports){
/**
 * Module dependencies.
 */

var Route = require('./route');
var Layer = require('./layer');
var methods = require('methods');
var debug = require('debug')('express:router');
var parseUrl = require('parseurl');
var slice = Array.prototype.slice;

/**
 * Initialize a new `Router` with the given `options`.
 *
 * @param {Object} options
 * @return {Router} which is an callable function
 * @api public
 */

var proto = module.exports = function(options) {
  options = options || {};

  function router(req, res, next) {
    router.handle(req, res, next);
  }

  // mixin Router class functions
  router.__proto__ = proto;

  router.params = {};
  router._params = [];
  router.caseSensitive = options.caseSensitive;
  router.strict = options.strict;
  router.stack = [];

  return router;
};

/**
 * Map the given param placeholder `name`(s) to the given callback.
 *
 * Parameter mapping is used to provide pre-conditions to routes
 * which use normalized placeholders. For example a _:user_id_ parameter
 * could automatically load a user's information from the database without
 * any additional code,
 *
 * The callback uses the same signature as middleware, the only difference
 * being that the value of the placeholder is passed, in this case the _id_
 * of the user. Once the `next()` function is invoked, just like middleware
 * it will continue on to execute the route, or subsequent parameter functions.
 *
 * Just like in middleware, you must either respond to the request or call next
 * to avoid stalling the request.
 *
 *  app.param('user_id', function(req, res, next, id){
 *    User.find(id, function(err, user){
 *      if (err) {
 *        return next(err);
 *      } else if (!user) {
 *        return next(new Error('failed to load user'));
 *      }
 *      req.user = user;
 *      next();
 *    });
 *  });
 *
 * @param {String} name
 * @param {Function} fn
 * @return {app} for chaining
 * @api public
 */

proto.param = function(name, fn){
  // param logic
  if ('function' == typeof name) {
    this._params.push(name);
    return;
  }

  // apply param functions
  var params = this._params;
  var len = params.length;
  var ret;

  if (name[0] === ':') {
    name = name.substr(1);
  }

  for (var i = 0; i < len; ++i) {
    if (ret = params[i](name, fn)) {
      fn = ret;
    }
  }

  // ensure we end up with a
  // middleware function
  if ('function' != typeof fn) {
    throw new Error('invalid param() call for ' + name + ', got ' + fn);
  }

  (this.params[name] = this.params[name] || []).push(fn);
  return this;
};

/**
 * Dispatch a req, res into the router.
 *
 * @api private
 */

proto.handle = function(req, res, done) {
  var self = this;

  debug('dispatching %s %s', req.method, req.url);

  var method = req.method.toLowerCase();

  var search = 1 + req.url.indexOf('?');
  var pathlength = search ? search - 1 : req.url.length;
  var fqdn = 1 + req.url.substr(0, pathlength).indexOf('://');
  var protohost = fqdn ? req.url.substr(0, req.url.indexOf('/', 2 + fqdn)) : '';
  var idx = 0;
  var removed = '';
  var slashAdded = false;
  var paramcalled = {};

  // store options for OPTIONS request
  // only used if OPTIONS request
  var options = [];

  // middleware and routes
  var stack = self.stack;

  // manage inter-router variables
  var parent = req.next;
  var parentUrl = req.baseUrl || '';
  done = wrap(done, function(old, err) {
    req.baseUrl = parentUrl;
    req.next = parent;
    old(err);
  });
  req.next = next;

  // for options requests, respond with a default if nothing else responds
  if (method === 'options') {
    done = wrap(done, function(old, err) {
      if (err || options.length === 0) return old(err);

      var body = options.join(',');
      return res.set('Allow', body).send(body);
    });
  }

  next();

  function next(err) {
    if (err === 'route') {
      err = undefined;
    }

    var layer = stack[idx++];
    var layerPath;

    if (!layer) {
      return done(err);
    }

    if (slashAdded) {
      req.url = req.url.substr(1);
      slashAdded = false;
    }

    req.baseUrl = parentUrl;
    req.url = protohost + removed + req.url.substr(protohost.length);
    req.originalUrl = req.originalUrl || req.url;
    removed = '';

    try {
      var path = parseUrl(req).pathname;
      if (undefined == path) path = '/';

      if (!layer.match(path)) return next(err);

      // route object and not middleware
      var route = layer.route;

      // if final route, then we support options
      if (route) {
        // we don't run any routes with error first
        if (err) {
          return next(err);
        }

        req.route = route;

        // we can now dispatch to the route
        if (method === 'options' && !route.methods['options']) {
          options.push.apply(options, route._options());
        }
      }

      // Capture one-time layer values
      req.params = layer.params;
      layerPath = layer.path;

      // this should be done for the layer
      return self.process_params(layer, paramcalled, req, res, function(err) {
        if (err) {
          return next(err);
        }

        if (route) {
          return layer.handle(req, res, next);
        }

        trim_prefix();
      });

    } catch (err) {
      next(err);
    }

    function trim_prefix() {
      var c = path[layerPath.length];
      if (c && '/' != c && '.' != c) return next(err);

      // Trim off the part of the url that matches the route
      // middleware (.use stuff) needs to have the path stripped
      debug('trim prefix (%s) from url %s', removed, req.url);
      removed = layerPath;
      req.url = protohost + req.url.substr(protohost.length + removed.length);

      // Ensure leading slash
      if (!fqdn && req.url[0] !== '/') {
        req.url = '/' + req.url;
        slashAdded = true;
      }

      // Setup base URL (no trailing slash)
      if (removed.length && removed.substr(-1) === '/') {
        req.baseUrl = parentUrl + removed.substring(0, removed.length - 1);
      } else {
        req.baseUrl = parentUrl + removed;
      }

      debug('%s %s : %s', layer.handle.name || 'anonymous', layerPath, req.originalUrl);
      var arity = layer.handle.length;
      if (err) {
        if (arity === 4) {
          layer.handle(err, req, res, next);
        } else {
          next(err);
        }
      } else if (arity < 4) {
        layer.handle(req, res, next);
      } else {
        next(err);
      }
    }
  }

  function wrap(old, fn) {
    return function () {
      var args = [old].concat(slice.call(arguments));
      fn.apply(this, args);
    };
  }
};

/**
 * Process any parameters for the layer.
 *
 * @api private
 */

proto.process_params = function(layer, called, req, res, done) {
  var params = this.params;

  // captured parameters from the layer, keys and values
  var keys = layer.keys;

  // fast track
  if (!keys || keys.length === 0) {
    return done();
  }

  var i = 0;
  var name;
  var paramIndex = 0;
  var key;
  var paramVal;
  var paramCallbacks;
  var paramCalled;

  // process params in order
  // param callbacks can be async
  function param(err) {
    if (err) {
      return done(err);
    }

    if (i >= keys.length ) {
      return done();
    }

    paramIndex = 0;
    key = keys[i++];

    if (!key) {
      return done();
    }

    name = key.name;
    paramVal = req.params[name];
    paramCallbacks = params[name];
    paramCalled = called[name];

    if (paramVal === undefined || !paramCallbacks) {
      return param();
    }

    // param previously called with same value or error occurred
    if (paramCalled && (paramCalled.err || paramCalled.val === paramVal)) {
      return param(paramCalled.err);
    }

    called[name] = paramCalled = { val: paramVal };

    try {
      return paramCallback();
    } catch (err) {
      return done(err);
    }
  }

  // single param callbacks
  function paramCallback(err) {
    if (err && paramCalled) {
      // store error
      paramCalled.err = err;
    }

    var fn = paramCallbacks[paramIndex++];
    if (err || !fn) return param(err);
    fn(req, res, paramCallback, paramVal, key.name);
  }

  param();
};

/**
 * Use the given middleware function, with optional path, defaulting to "/".
 *
 * Use (like `.all`) will run for any http METHOD, but it will not add
 * handlers for those methods so OPTIONS requests will not consider `.use`
 * functions even if they could respond.
 *
 * The other difference is that _route_ path is stripped and not visible
 * to the handler function. The main effect of this feature is that mounted
 * handlers can operate without any code changes regardless of the "prefix"
 * pathname.
 *
 * @param {String|Function} route
 * @param {Function} fn
 * @return {app} for chaining
 * @api public
 */

proto.use = function(route, fn){
  // default route to '/'
  if ('string' != typeof route) {
    fn = route;
    route = '/';
  }

  if (typeof fn !== 'function') {
    var type = {}.toString.call(fn);
    var msg = 'Router.use() requires callback functions but got a ' + type;
    throw new Error(msg);
  }

  // strip trailing slash
  if ('/' == route[route.length - 1]) {
    route = route.slice(0, -1);
  }

  var layer = new Layer(route, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: false
  }, fn);

  // add the middleware
  debug('use %s %s', route || '/', fn.name || 'anonymous');

  this.stack.push(layer);
  return this;
};

/**
 * Create a new Route for the given path.
 *
 * Each route contains a separate middleware stack and VERB handlers.
 *
 * See the Route api documentation for details on adding handlers
 * and middleware to routes.
 *
 * @param {String} path
 * @return {Route}
 * @api public
 */

proto.route = function(path){
  var route = new Route(path);

  var layer = new Layer(path, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: true
  }, route.dispatch.bind(route));

  layer.route = route;

  this.stack.push(layer);
  return route;
};

// create Router#VERB functions
methods.concat('all').forEach(function(method){
  proto[method] = function(path){
    var route = this.route(path)
    route[method].apply(route, [].slice.call(arguments, 1));
    return this;
  };
});

},{"./layer":71,"./route":72,"debug":81,"methods":84,"parseurl":85}],71:[function(require,module,exports){
/**
 * Module dependencies.
 */

var pathRegexp = require('path-to-regexp');
var debug = require('debug')('express:router:layer');

/**
 * Expose `Layer`.
 */

module.exports = Layer;

function Layer(path, options, fn) {
  if (!(this instanceof Layer)) {
    return new Layer(path, options, fn);
  }

  debug('new %s', path);
  options = options || {};
  this.regexp = pathRegexp(path, this.keys = [], options);
  this.handle = fn;
}

/**
 * Check if this route matches `path`, if so
 * populate `.params`.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

Layer.prototype.match = function(path){
  var keys = this.keys;
  var params = this.params = {};
  var m = this.regexp.exec(path);
  var n = 0;
  var key;
  var val;

  if (!m) return false;

  this.path = m[0];

  for (var i = 1, len = m.length; i < len; ++i) {
    key = keys[i - 1];

    try {
      val = 'string' == typeof m[i]
        ? decodeURIComponent(m[i])
        : m[i];
    } catch(e) {
      var err = new Error("Failed to decode param '" + m[i] + "'");
      err.status = 400;
      throw err;
    }

    if (key) {
      params[key.name] = val;
    } else {
      params[n++] = val;
    }
  }

  return true;
};

},{"debug":81,"path-to-regexp":86}],72:[function(require,module,exports){
/**
 * Module dependencies.
 */

var debug = require('debug')('express:router:route');
var methods = require('methods');
var utils = require('../utils');

/**
 * Expose `Route`.
 */

module.exports = Route;

/**
 * Initialize `Route` with the given `path`,
 *
 * @param {String} path
 * @api private
 */

function Route(path) {
  debug('new %s', path);
  this.path = path;
  this.stack = undefined;

  // route handlers for various http methods
  this.methods = {};
}

/**
 * @return {Array} supported HTTP methods
 * @api private
 */

Route.prototype._options = function(){
  return Object.keys(this.methods).map(function(method) {
    return method.toUpperCase();
  });
};

/**
 * dispatch req, res into this route
 *
 * @api private
 */

Route.prototype.dispatch = function(req, res, done){
  var self = this;
  var method = req.method.toLowerCase();

  if (method === 'head' && !this.methods['head']) {
    method = 'get';
  }

  req.route = self;

  // single middleware route case
  if (typeof this.stack === 'function') {
    this.stack(req, res, done);
    return;
  }

  var stack = self.stack;
  if (!stack) {
    return done();
  }

  var idx = 0;
  (function next_layer(err) {
    if (err && err === 'route') {
      return done();
    }

    var layer = stack[idx++];
    if (!layer) {
      return done(err);
    }

    if (layer.method && layer.method !== method) {
      return next_layer(err);
    }

    var arity = layer.handle.length;
    if (err) {
      if (arity < 4) {
        return next_layer(err);
      }

      try {
        layer.handle(err, req, res, next_layer);
      } catch (err) {
        next_layer(err);
      }
      return;
    }

    if (arity > 3) {
      return next_layer();
    }

    try {
      layer.handle(req, res, next_layer);
    } catch (err) {
      next_layer(err);
    }
  })();
};

/**
 * Add a handler for all HTTP verbs to this route.
 *
 * Behaves just like middleware and can respond or call `next`
 * to continue processing.
 *
 * You can use multiple `.all` call to add multiple handlers.
 *
 *   function check_something(req, res, next){
 *     next();
 *   };
 *
 *   function validate_user(req, res, next){
 *     next();
 *   };
 *
 *   route
 *   .all(validate_user)
 *   .all(check_something)
 *   .get(function(req, res, next){
 *     res.send('hello world');
 *   });
 *
 * @param {function} handler
 * @return {Route} for chaining
 * @api public
 */

Route.prototype.all = function(){
  var self = this;
  var callbacks = utils.flatten([].slice.call(arguments));
  callbacks.forEach(function(fn) {
    if (typeof fn !== 'function') {
      var type = {}.toString.call(fn);
      var msg = 'Route.all() requires callback functions but got a ' + type;
      throw new Error(msg);
    }

    if (!self.stack) {
      self.stack = fn;
    }
    else if (typeof self.stack === 'function') {
      self.stack = [{ handle: self.stack }, { handle: fn }];
    }
    else {
      self.stack.push({ handle: fn });
    }
  });

  return self;
};

methods.forEach(function(method){
  Route.prototype[method] = function(){
    var self = this;
    var callbacks = utils.flatten([].slice.call(arguments));

    callbacks.forEach(function(fn) {
      if (typeof fn !== 'function') {
        var type = {}.toString.call(fn);
        var msg = 'Route.' + method + '() requires callback functions but got a ' + type;
        throw new Error(msg);
      }

      debug('%s %s', method, self.path);

      if (!self.methods[method]) {
        self.methods[method] = true;
      }

      if (!self.stack) {
        self.stack = [];
      }
      else if (typeof self.stack === 'function') {
        self.stack = [{ handle: self.stack }];
      }

      self.stack.push({ method: method, handle: fn });
    });
    return self;
  };
});

},{"../utils":73,"debug":81,"methods":84}],73:[function(require,module,exports){
(function (process,Buffer){
/**
 * Module dependencies.
 */

var mime = require('send').mime;
var crc32 = require('buffer-crc32');
var crypto = require('crypto');
var basename = require('path').basename;
var deprecate = require('util').deprecate;
var proxyaddr = require('proxy-addr');

/**
 * Simple detection of charset parameter in content-type
 */
var charsetRegExp = /;\s*charset\s*=/;

/**
 * Deprecate function, like core `util.deprecate`,
 * but with NODE_ENV and color support.
 *
 * @param {Function} fn
 * @param {String} msg
 * @return {Function}
 * @api private
 */

exports.deprecate = function(fn, msg){
  if (process.env.NODE_ENV === 'test') return fn;

  // prepend module name
  msg = 'express: ' + msg;

  if (process.stderr.isTTY) {
    // colorize
    msg = '\x1b[31;1m' + msg + '\x1b[0m';
  }

  return deprecate(fn, msg);
};

/**
 * Return strong ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */

exports.etag = function etag(body, encoding){
  if (body.length === 0) {
    // fast-path empty body
    return '"1B2M2Y8AsgTpgAmY7PhCfg=="'
  }

  var hash = crypto
    .createHash('md5')
    .update(body, encoding)
    .digest('base64')
  return '"' + hash + '"'
};

/**
 * Return weak ETag for `body`.
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */

exports.wetag = function wetag(body, encoding){
  if (body.length === 0) {
    // fast-path empty body
    return 'W/"0-0"'
  }

  var buf = Buffer.isBuffer(body)
    ? body
    : new Buffer(body, encoding)
  var len = buf.length
  return 'W/"' + len.toString(16) + '-' + crc32.unsigned(buf) + '"'
};

/**
 * Check if `path` looks absolute.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

exports.isAbsolute = function(path){
  if ('/' == path[0]) return true;
  if (':' == path[1] && '\\' == path[2]) return true;
  if ('\\\\' == path.substring(0, 2)) return true; // Microsoft Azure absolute path
};

/**
 * Flatten the given `arr`.
 *
 * @param {Array} arr
 * @return {Array}
 * @api private
 */

exports.flatten = function(arr, ret){
  ret = ret || [];
  var len = arr.length;
  for (var i = 0; i < len; ++i) {
    if (Array.isArray(arr[i])) {
      exports.flatten(arr[i], ret);
    } else {
      ret.push(arr[i]);
    }
  }
  return ret;
};

/**
 * Normalize the given `type`, for example "html" becomes "text/html".
 *
 * @param {String} type
 * @return {Object}
 * @api private
 */

exports.normalizeType = function(type){
  return ~type.indexOf('/')
    ? acceptParams(type)
    : { value: mime.lookup(type), params: {} };
};

/**
 * Normalize `types`, for example "html" becomes "text/html".
 *
 * @param {Array} types
 * @return {Array}
 * @api private
 */

exports.normalizeTypes = function(types){
  var ret = [];

  for (var i = 0; i < types.length; ++i) {
    ret.push(exports.normalizeType(types[i]));
  }

  return ret;
};

/**
 * Generate Content-Disposition header appropriate for the filename.
 * non-ascii filenames are urlencoded and a filename* parameter is added
 *
 * @param {String} filename
 * @return {String}
 * @api private
 */

exports.contentDisposition = function(filename){
  var ret = 'attachment';
  if (filename) {
    filename = basename(filename);
    // if filename contains non-ascii characters, add a utf-8 version ala RFC 5987
    ret = /[^\040-\176]/.test(filename)
      ? 'attachment; filename=' + encodeURI(filename) + '; filename*=UTF-8\'\'' + encodeURI(filename)
      : 'attachment; filename="' + filename + '"';
  }

  return ret;
};

/**
 * Parse accept params `str` returning an
 * object with `.value`, `.quality` and `.params`.
 * also includes `.originalIndex` for stable sorting
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function acceptParams(str, index) {
  var parts = str.split(/ *; */);
  var ret = { value: parts[0], quality: 1, params: {}, originalIndex: index };

  for (var i = 1; i < parts.length; ++i) {
    var pms = parts[i].split(/ *= */);
    if ('q' == pms[0]) {
      ret.quality = parseFloat(pms[1]);
    } else {
      ret.params[pms[0]] = pms[1];
    }
  }

  return ret;
}

/**
 * Compile "etag" value to function.
 *
 * @param  {Boolean|String|Function} val
 * @return {Function}
 * @api private
 */

exports.compileETag = function(val) {
  var fn;

  if (typeof val === 'function') {
    return val;
  }

  switch (val) {
    case true:
      fn = exports.wetag;
      break;
    case false:
      break;
    case 'strong':
      fn = exports.etag;
      break;
    case 'weak':
      fn = exports.wetag;
      break;
    default:
      throw new TypeError('unknown value for etag function: ' + val);
  }

  return fn;
}

/**
 * Compile "proxy trust" value to function.
 *
 * @param  {Boolean|String|Number|Array|Function} val
 * @return {Function}
 * @api private
 */

exports.compileTrust = function(val) {
  if (typeof val === 'function') return val;

  if (val === true) {
    // Support plain true/false
    return function(){ return true };
  }

  if (typeof val === 'number') {
    // Support trusting hop count
    return function(a, i){ return i < val };
  }

  if (typeof val === 'string') {
    // Support comma-separated values
    val = val.split(/ *, */);
  }

  return proxyaddr.compile(val || []);
}

/**
 * Set the charset in a given Content-Type string.
 *
 * @param {String} type
 * @param {String} charset
 * @return {String}
 * @api private
 */

exports.setCharset = function(type, charset){
  if (!type || !charset) return type;

  var exists = charsetRegExp.test(type);

  // removing existing charset
  if (exists) {
    var parts = type.split(';');

    for (var i = 1; i < parts.length; i++) {
      if (charsetRegExp.test(';' + parts[i])) {
        parts.splice(i, 1);
        break;
      }
    }

    type = parts.join(';');
  }

  return type + '; charset=' + charset;
};

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":131,"buffer":104,"buffer-crc32":78,"crypto":111,"path":130,"proxy-addr":87,"send":91,"util":151}],74:[function(require,module,exports){
/**
 * Module dependencies.
 */

var path = require('path');
var fs = require('fs');
var utils = require('./utils');
var dirname = path.dirname;
var basename = path.basename;
var extname = path.extname;
var exists = fs.existsSync || path.existsSync;
var join = path.join;

/**
 * Expose `View`.
 */

module.exports = View;

/**
 * Initialize a new `View` with the given `name`.
 *
 * Options:
 *
 *   - `defaultEngine` the default template engine name
 *   - `engines` template engine require() cache
 *   - `root` root path for view lookup
 *
 * @param {String} name
 * @param {Object} options
 * @api private
 */

function View(name, options) {
  options = options || {};
  this.name = name;
  this.root = options.root;
  var engines = options.engines;
  this.defaultEngine = options.defaultEngine;
  var ext = this.ext = extname(name);
  if (!ext && !this.defaultEngine) throw new Error('No default engine was specified and no extension was provided.');
  if (!ext) name += (ext = this.ext = ('.' != this.defaultEngine[0] ? '.' : '') + this.defaultEngine);
  this.engine = engines[ext] || (engines[ext] = require(ext.slice(1)).__express);
  this.path = this.lookup(name);
}

/**
 * Lookup view by the given `path`
 *
 * @param {String} path
 * @return {String}
 * @api private
 */

View.prototype.lookup = function(path){
  var ext = this.ext;

  // <path>.<engine>
  if (!utils.isAbsolute(path)) path = join(this.root, path);
  if (exists(path)) return path;

  // <path>/index.<engine>
  path = join(dirname(path), basename(path, ext), 'index' + ext);
  if (exists(path)) return path;
};

/**
 * Render with the given `options` and callback `fn(err, str)`.
 *
 * @param {Object} options
 * @param {Function} fn
 * @api private
 */

View.prototype.render = function(options, fn){
  this.engine(this.path, options, fn);
};

},{"./utils":73,"fs":101,"path":130}],75:[function(require,module,exports){
var Negotiator = require('negotiator')
var mime = require('mime')

var slice = [].slice

module.exports = Accepts

function Accepts(req) {
  if (!(this instanceof Accepts))
    return new Accepts(req)

  this.headers = req.headers
  this.negotiator = Negotiator(req)
}

/**
 * Check if the given `type(s)` is acceptable, returning
 * the best match when true, otherwise `undefined`, in which
 * case you should respond with 406 "Not Acceptable".
 *
 * The `type` value may be a single mime type string
 * such as "application/json", the extension name
 * such as "json" or an array `["json", "html", "text/plain"]`. When a list
 * or array is given the _best_ match, if any is returned.
 *
 * Examples:
 *
 *     // Accept: text/html
 *     this.types('html');
 *     // => "html"
 *
 *     // Accept: text/*, application/json
 *     this.types('html');
 *     // => "html"
 *     this.types('text/html');
 *     // => "text/html"
 *     this.types('json', 'text');
 *     // => "json"
 *     this.types('application/json');
 *     // => "application/json"
 *
 *     // Accept: text/*, application/json
 *     this.types('image/png');
 *     this.types('png');
 *     // => undefined
 *
 *     // Accept: text/*;q=.5, application/json
 *     this.types(['html', 'json']);
 *     this.types('html', 'json');
 *     // => "json"
 *
 * @param {String|Array} type(s)...
 * @return {String|Array|Boolean}
 * @api public
 */

Accepts.prototype.type =
Accepts.prototype.types = function (types) {
  if (!Array.isArray(types)) types = slice.call(arguments);
  var n = this.negotiator;
  if (!types.length) return n.mediaTypes();
  if (!this.headers.accept) return types[0];
  var mimes = types.map(extToMime);
  var accepts = n.mediaTypes(mimes);
  var first = accepts[0];
  if (!first) return false;
  return types[mimes.indexOf(first)];
}

/**
 * Return accepted encodings or best fit based on `encodings`.
 *
 * Given `Accept-Encoding: gzip, deflate`
 * an array sorted by quality is returned:
 *
 *     ['gzip', 'deflate']
 *
 * @param {String|Array} encoding(s)...
 * @return {String|Array}
 * @api public
 */

Accepts.prototype.encoding =
Accepts.prototype.encodings = function (encodings) {
  if (!Array.isArray(encodings)) encodings = slice.call(arguments);
  var n = this.negotiator;
  if (!encodings.length) return n.encodings();
  return n.encodings(encodings)[0] || false;
}

/**
 * Return accepted charsets or best fit based on `charsets`.
 *
 * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
 * an array sorted by quality is returned:
 *
 *     ['utf-8', 'utf-7', 'iso-8859-1']
 *
 * @param {String|Array} charset(s)...
 * @return {String|Array}
 * @api public
 */

Accepts.prototype.charset =
Accepts.prototype.charsets = function (charsets) {
  if (!Array.isArray(charsets)) charsets = [].slice.call(arguments);
  var n = this.negotiator;
  if (!charsets.length) return n.charsets();
  if (!this.headers['accept-charset']) return charsets[0];
  return n.charsets(charsets)[0] || false;
}

/**
 * Return accepted languages or best fit based on `langs`.
 *
 * Given `Accept-Language: en;q=0.8, es, pt`
 * an array sorted by quality is returned:
 *
 *     ['es', 'pt', 'en']
 *
 * @param {String|Array} lang(s)...
 * @return {Array|String}
 * @api public
 */

Accepts.prototype.lang =
Accepts.prototype.langs =
Accepts.prototype.language =
Accepts.prototype.languages = function (langs) {
  if (!Array.isArray(langs)) langs = slice.call(arguments);
  var n = this.negotiator;
  if (!langs.length) return n.languages();
  if (!this.headers['accept-language']) return langs[0];
  return n.languages(langs)[0] || false;
}

/**
 * Convert extnames to mime.
 *
 * @param {String} type
 * @return {String}
 * @api private
 */

function extToMime(type) {
  if (~type.indexOf('/')) return type;
  return mime.lookup(type);
}

},{"mime":76,"negotiator":77}],76:[function(require,module,exports){
(function (process,__dirname){
var path = require('path');
var fs = require('fs');

function Mime() {
  // Map of extension -> mime type
  this.types = Object.create(null);

  // Map of mime type -> extension
  this.extensions = Object.create(null);
}

/**
 * Define mimetype -> extension mappings.  Each key is a mime-type that maps
 * to an array of extensions associated with the type.  The first extension is
 * used as the default extension for the type.
 *
 * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
 *
 * @param map (Object) type definitions
 */
Mime.prototype.define = function (map) {
  for (var type in map) {
    var exts = map[type];

    for (var i = 0; i < exts.length; i++) {
      if (process.env.DEBUG_MIME && this.types[exts]) {
        console.warn(this._loading.replace(/.*\//, ''), 'changes "' + exts[i] + '" extension type from ' +
          this.types[exts] + ' to ' + type);
      }

      this.types[exts[i]] = type;
    }

    // Default extension is the first one we encounter
    if (!this.extensions[type]) {
      this.extensions[type] = exts[0];
    }
  }
};

/**
 * Load an Apache2-style ".types" file
 *
 * This may be called multiple times (it's expected).  Where files declare
 * overlapping types/extensions, the last file wins.
 *
 * @param file (String) path of file to load.
 */
Mime.prototype.load = function(file) {

  this._loading = file;
  // Read file and split into lines
  var map = {},
      content = fs.readFileSync(file, 'ascii'),
      lines = content.split(/[\r\n]+/);

  lines.forEach(function(line) {
    // Clean up whitespace/comments, and split into fields
    var fields = line.replace(/\s*#.*|^\s*|\s*$/g, '').split(/\s+/);
    map[fields.shift()] = fields;
  });

  this.define(map);

  this._loading = null;
};

/**
 * Lookup a mime type based on extension
 */
Mime.prototype.lookup = function(path, fallback) {
  var ext = path.replace(/.*[\.\/\\]/, '').toLowerCase();

  return this.types[ext] || fallback || this.default_type;
};

/**
 * Return file extension associated with a mime type
 */
Mime.prototype.extension = function(mimeType) {
  var type = mimeType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase();
  return this.extensions[type];
};

// Default instance
var mime = new Mime();

// Load local copy of
// http://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types
mime.load(path.join(__dirname, 'types/mime.types'));

// Load additional types from node.js community
mime.load(path.join(__dirname, 'types/node.types'));

// Default type
mime.default_type = mime.lookup('bin');

//
// Additional API specific to the default instance
//

mime.Mime = Mime;

/**
 * Lookup a charset based on mime type.
 */
mime.charsets = {
  lookup: function(mimeType, fallback) {
    // Assume text types are utf8
    return (/^text\//).test(mimeType) ? 'UTF-8' : fallback;
  }
};

module.exports = mime;

}).call(this,require('_process'),"/node_modules/cylon/node_modules/express/node_modules/accepts/node_modules/mime")
},{"_process":131,"fs":101,"path":130}],77:[function(require,module,exports){
module.exports = Negotiator;
Negotiator.Negotiator = Negotiator;

function Negotiator(request) {
  if (!(this instanceof Negotiator)) return new Negotiator(request);
  this.request = request;
}

var set = { charset: 'accept-charset',
            encoding: 'accept-encoding',
            language: 'accept-language',
            mediaType: 'accept' };


function capitalize(string){
  return string.charAt(0).toUpperCase() + string.slice(1);
}

Object.keys(set).forEach(function (k) {
  var header = set[k],
      method = require('./'+k+'.js'),
      singular = k,
      plural = k + 's';

  Negotiator.prototype[plural] = function (available) {
    return method(this.request.headers[header], available);
  };

  Negotiator.prototype[singular] = function(available) {
    var set = this[plural](available);
    if (set) return set[0];
  };

  // Keep preferred* methods for legacy compatibility
  Negotiator.prototype['preferred'+capitalize(plural)] = Negotiator.prototype[plural];
  Negotiator.prototype['preferred'+capitalize(singular)] = Negotiator.prototype[singular];
})

},{}],78:[function(require,module,exports){
var Buffer = require('buffer').Buffer;

var CRC_TABLE = [
  0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419,
  0x706af48f, 0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4,
  0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd, 0xe7b82d07,
  0x90bf1d91, 0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de,
  0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7, 0x136c9856,
  0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9,
  0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4,
  0xa2677172, 0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b,
  0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940, 0x32d86ce3,
  0x45df5c75, 0xdcd60dcf, 0xabd13d59, 0x26d930ac, 0x51de003a,
  0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423, 0xcfba9599,
  0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924,
  0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190,
  0x01db7106, 0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f,
  0x9fbfe4a5, 0xe8b8d433, 0x7807c9a2, 0x0f00f934, 0x9609a88e,
  0xe10e9818, 0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01,
  0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e, 0x6c0695ed,
  0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950,
  0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3,
  0xfbd44c65, 0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2,
  0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a,
  0x346ed9fc, 0xad678846, 0xda60b8d0, 0x44042d73, 0x33031de5,
  0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa, 0xbe0b1010,
  0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
  0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17,
  0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6,
  0x03b6e20c, 0x74b1d29a, 0xead54739, 0x9dd277af, 0x04db2615,
  0x73dc1683, 0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8,
  0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1, 0xf00f9344,
  0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb,
  0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a,
  0x67dd4acc, 0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5,
  0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252, 0xd1bb67f1,
  0xa6bc5767, 0x3fb506dd, 0x48b2364b, 0xd80d2bda, 0xaf0a1b4c,
  0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55, 0x316e8eef,
  0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236,
  0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe,
  0xb2bd0b28, 0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31,
  0x2cd99e8b, 0x5bdeae1d, 0x9b64c2b0, 0xec63f226, 0x756aa39c,
  0x026d930a, 0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713,
  0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38, 0x92d28e9b,
  0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242,
  0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1,
  0x18b74777, 0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c,
  0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45, 0xa00ae278,
  0xd70dd2ee, 0x4e048354, 0x3903b3c2, 0xa7672661, 0xd06016f7,
  0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc, 0x40df0b66,
  0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
  0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605,
  0xcdd70693, 0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8,
  0x5d681b02, 0x2a6f2b94, 0xb40bbe37, 0xc30c8ea1, 0x5a05df1b,
  0x2d02ef8d
];

function bufferizeInt(num) {
  var tmp = Buffer(4);
  tmp.writeInt32BE(num, 0);
  return tmp;
}

function _crc32(buf, previous) {
  if (!Buffer.isBuffer(buf)) {
    buf = Buffer(buf);
  }
  if (Buffer.isBuffer(previous)) {
    previous = previous.readUInt32BE(0);
  }
  var crc = ~~previous ^ -1;
  for (var n = 0; n < buf.length; n++) {
    crc = CRC_TABLE[(crc ^ buf[n]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1);
}

function crc32() {
  return bufferizeInt(_crc32.apply(null, arguments));
}
crc32.signed = function () {
  return _crc32.apply(null, arguments);
};
crc32.unsigned = function () {
  return _crc32.apply(null, arguments) >>> 0;
};

module.exports = crc32;

},{"buffer":104}],79:[function(require,module,exports){
/**
 * Module dependencies.
 */

var crypto = require('crypto');

/**
 * Sign the given `val` with `secret`.
 *
 * @param {String} val
 * @param {String} secret
 * @return {String}
 * @api private
 */

exports.sign = function(val, secret){
  if ('string' != typeof val) throw new TypeError('cookie required');
  if ('string' != typeof secret) throw new TypeError('secret required');
  return val + '.' + crypto
    .createHmac('sha256', secret)
    .update(val)
    .digest('base64')
    .replace(/\=+$/, '');
};

/**
 * Unsign and decode the given `val` with `secret`,
 * returning `false` if the signature is invalid.
 *
 * @param {String} val
 * @param {String} secret
 * @return {String|Boolean}
 * @api private
 */

exports.unsign = function(val, secret){
  if ('string' != typeof val) throw new TypeError('cookie required');
  if ('string' != typeof secret) throw new TypeError('secret required');
  var str = val.slice(0, val.lastIndexOf('.'))
    , mac = exports.sign(str, secret);
  
  return exports.sign(mac, secret) == exports.sign(val, secret) ? str : false;
};

},{"crypto":111}],80:[function(require,module,exports){

/// Serialize the a name value pair into a cookie string suitable for
/// http headers. An optional options object specified cookie parameters
///
/// serialize('foo', 'bar', { httpOnly: true })
///   => "foo=bar; httpOnly"
///
/// @param {String} name
/// @param {String} val
/// @param {Object} options
/// @return {String}
var serialize = function(name, val, opt){
    opt = opt || {};
    var enc = opt.encode || encode;
    var pairs = [name + '=' + enc(val)];

    if (null != opt.maxAge) {
        var maxAge = opt.maxAge - 0;
        if (isNaN(maxAge)) throw new Error('maxAge should be a Number');
        pairs.push('Max-Age=' + maxAge);
    }

    if (opt.domain) pairs.push('Domain=' + opt.domain);
    if (opt.path) pairs.push('Path=' + opt.path);
    if (opt.expires) pairs.push('Expires=' + opt.expires.toUTCString());
    if (opt.httpOnly) pairs.push('HttpOnly');
    if (opt.secure) pairs.push('Secure');

    return pairs.join('; ');
};

/// Parse the given cookie header string into an object
/// The object has the various cookies as keys(names) => values
/// @param {String} str
/// @return {Object}
var parse = function(str, opt) {
    opt = opt || {};
    var obj = {}
    var pairs = str.split(/; */);
    var dec = opt.decode || decode;

    pairs.forEach(function(pair) {
        var eq_idx = pair.indexOf('=')

        // skip things that don't look like key=value
        if (eq_idx < 0) {
            return;
        }

        var key = pair.substr(0, eq_idx).trim()
        var val = pair.substr(++eq_idx, pair.length).trim();

        // quoted values
        if ('"' == val[0]) {
            val = val.slice(1, -1);
        }

        // only assign once
        if (undefined == obj[key]) {
            try {
                obj[key] = dec(val);
            } catch (e) {
                obj[key] = val;
            }
        }
    });

    return obj;
};

var encode = encodeURIComponent;
var decode = decodeURIComponent;

module.exports.serialize = serialize;
module.exports.parse = parse;

},{}],81:[function(require,module,exports){

/**
 * Expose `debug()` as the module.
 */

module.exports = debug;

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug(name) {
  if (!debug.enabled(name)) return function(){};

  return function(fmt){
    fmt = coerce(fmt);

    var curr = new Date;
    var ms = curr - (debug[name] || curr);
    debug[name] = curr;

    fmt = name
      + ' '
      + fmt
      + ' +' + debug.humanize(ms);

    // This hackery is required for IE8
    // where `console.log` doesn't have 'apply'
    window.console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }
}

/**
 * The currently active debug mode names.
 */

debug.names = [];
debug.skips = [];

/**
 * Enables a debug mode by name. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} name
 * @api public
 */

debug.enable = function(name) {
  try {
    localStorage.debug = name;
  } catch(e){}

  var split = (name || '').split(/[\s,]+/)
    , len = split.length;

  for (var i = 0; i < len; i++) {
    name = split[i].replace('*', '.*?');
    if (name[0] === '-') {
      debug.skips.push(new RegExp('^' + name.substr(1) + '$'));
    }
    else {
      debug.names.push(new RegExp('^' + name + '$'));
    }
  }
};

/**
 * Disable debug output.
 *
 * @api public
 */

debug.disable = function(){
  debug.enable('');
};

/**
 * Humanize the given `ms`.
 *
 * @param {Number} m
 * @return {String}
 * @api private
 */

debug.humanize = function(ms) {
  var sec = 1000
    , min = 60 * 1000
    , hour = 60 * min;

  if (ms >= hour) return (ms / hour).toFixed(1) + 'h';
  if (ms >= min) return (ms / min).toFixed(1) + 'm';
  if (ms >= sec) return (ms / sec | 0) + 's';
  return ms + 'ms';
};

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

debug.enabled = function(name) {
  for (var i = 0, len = debug.skips.length; i < len; i++) {
    if (debug.skips[i].test(name)) {
      return false;
    }
  }
  for (var i = 0, len = debug.names.length; i < len; i++) {
    if (debug.names[i].test(name)) {
      return true;
    }
  }
  return false;
};

/**
 * Coerce `val`.
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

// persist

try {
  if (window.localStorage) debug.enable(localStorage.debug);
} catch(e){}

},{}],82:[function(require,module,exports){
/**
 * Escape special characters in the given string of html.
 *
 * @param  {String} html
 * @return {String}
 * @api private
 */

module.exports = function(html) {
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

},{}],83:[function(require,module,exports){

/**
 * Expose `fresh()`.
 */

module.exports = fresh;

/**
 * Check freshness of `req` and `res` headers.
 *
 * When the cache is "fresh" __true__ is returned,
 * otherwise __false__ is returned to indicate that
 * the cache is now stale.
 *
 * @param {Object} req
 * @param {Object} res
 * @return {Boolean}
 * @api public
 */

function fresh(req, res) {
  // defaults
  var etagMatches = true;
  var notModified = true;

  // fields
  var modifiedSince = req['if-modified-since'];
  var noneMatch = req['if-none-match'];
  var lastModified = res['last-modified'];
  var etag = res['etag'];
  var cc = req['cache-control'];

  // unconditional request
  if (!modifiedSince && !noneMatch) return false;

  // check for no-cache cache request directive
  if (cc && cc.indexOf('no-cache') !== -1) return false;  

  // parse if-none-match
  if (noneMatch) noneMatch = noneMatch.split(/ *, */);

  // if-none-match
  if (noneMatch) etagMatches = ~noneMatch.indexOf(etag) || '*' == noneMatch[0];

  // if-modified-since
  if (modifiedSince) {
    modifiedSince = new Date(modifiedSince);
    lastModified = new Date(lastModified);
    notModified = lastModified <= modifiedSince;
  }

  return !! (etagMatches && notModified);
}
},{}],84:[function(require,module,exports){

var http = require('http');

if (http.METHODS) {

  module.exports = http.METHODS.map(function(method){
    return method.toLowerCase();
  });

} else {

  module.exports = [
    'get',
    'post',
    'put',
    'head',
    'delete',
    'options',
    'trace',
    'copy',
    'lock',
    'mkcol',
    'move',
    'purge',
    'propfind',
    'proppatch',
    'unlock',
    'report',
    'mkactivity',
    'checkout',
    'merge',
    'm-search',
    'notify',
    'subscribe',
    'unsubscribe',
    'patch',
    'search'
  ];

}

},{"http":123}],85:[function(require,module,exports){

var parse = require('url').parse;

/**
 * Parse the `req` url with memoization.
 *
 * @param {ServerRequest} req
 * @return {Object}
 * @api private
 */

module.exports = function parseUrl(req){
  var parsed = req._parsedUrl;
  if (parsed && parsed.href == req.url) {
    return parsed;
  } else {
    parsed = parse(req.url);

    if (parsed.auth && !parsed.protocol && ~parsed.href.indexOf('//')) {
      // This parses pathnames, and a strange pathname like //r@e should work
      parsed = parse(req.url.replace(/@/g, '%40'));
    }

    return req._parsedUrl = parsed;
  }
};

},{"url":149}],86:[function(require,module,exports){
/**
 * Expose `pathtoRegexp`.
 */

module.exports = pathtoRegexp;

/**
 * Normalize the given path string,
 * returning a regular expression.
 *
 * An empty array should be passed,
 * which will contain the placeholder
 * key names. For example "/user/:id" will
 * then contain ["id"].
 *
 * @param  {String|RegExp|Array} path
 * @param  {Array} keys
 * @param  {Object} options
 * @return {RegExp}
 * @api private
 */

function pathtoRegexp(path, keys, options) {
  options = options || {};
  var sensitive = options.sensitive;
  var strict = options.strict;
  var end = options.end !== false;
  keys = keys || [];

  if (path instanceof RegExp) return path;
  if (path instanceof Array) path = '(' + path.join('|') + ')';

  path = path
    .concat(strict ? '' : '/?')
    .replace(/\/\(/g, '/(?:')
    .replace(/([\/\.])/g, '\\$1')
    .replace(/(\\\/)?(\\\.)?:(\w+)(\(.*?\))?(\*)?(\?)?/g, function (match, slash, format, key, capture, star, optional) {
      slash = slash || '';
      format = format || '';
      capture = capture || '([^/' + format + ']+?)';
      optional = optional || '';

      keys.push({ name: key, optional: !!optional });

      return ''
        + (optional ? '' : slash)
        + '(?:'
        + format + (optional ? slash : '') + capture
        + (star ? '((?:[\\/' + format + '].+?)?)' : '')
        + ')'
        + optional;
    })
    .replace(/\*/g, '(.*)');

  return new RegExp('^' + path + (end ? '$' : '(?=\/|$)'), sensitive ? '' : 'i');
};

},{}],87:[function(require,module,exports){
/*!
 * proxy-addr
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module exports.
 */

module.exports = proxyaddr;
module.exports.all = alladdrs;
module.exports.compile = compile;

/**
 * Module dependencies.
 */

var ipaddr = require('ipaddr.js');

/**
 * Variables.
 */

var digitre = /^[0-9]+$/;
var isip = ipaddr.isValid;
var parseip = ipaddr.parse;

/**
 * Pre-defined IP ranges.
 */

var ipranges = {
  linklocal: ['169.254.0.0/16', 'fe80::/10'],
  loopback: ['127.0.0.1/8', '::1/128'],
  uniquelocal: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7']
};

/**
 * Get all addresses in the request, optionally stopping
 * at the first untrusted.
 *
 * @param {Object} request
 * @param {Function|Array|String} [trust]
 * @api public
 */

function alladdrs(req, trust) {
  if (!req) {
    throw new TypeError('req argument is required');
  }

  var proxyAddrs = (req.headers['x-forwarded-for'] || '')
    .split(/ *, */)
    .filter(Boolean)
    .reverse();
  var socketAddr = req.connection.remoteAddress;
  var addrs = [socketAddr].concat(proxyAddrs);

  if (!trust) {
    // Return all addresses
    return addrs;
  }

  if (typeof trust !== 'function') {
    trust = compile(trust);
  }

  for (var i = 0; i < addrs.length - 1; i++) {
    if (trust(addrs[i], i)) continue;

    addrs.length = i + 1;
  }

  return addrs;
}

/**
 * Compile argument into trust function.
 *
 * @param {Array|String} val
 * @api private
 */

function compile(val) {
  if (!val) {
    throw new TypeError('argument is required');
  }

  var trust = typeof val === 'string'
    ? [val]
    : val;

  if (!Array.isArray(trust)) {
    throw new TypeError('unsupported trust argument');
  }

  for (var i = 0; i < trust.length; i++) {
    val = trust[i];

    if (!ipranges.hasOwnProperty(val)) {
      continue;
    }

    // Splice in pre-defined range
    val = ipranges[val];
    trust.splice.apply(trust, [i, 1].concat(val));
    i += val.length - 1;
  }

  return compileTrust(compileRangeSubnets(trust));
}

/**
 * Compile `arr` elements into range subnets.
 *
 * @param {Array} arr
 * @api private
 */

function compileRangeSubnets(arr) {
  var rangeSubnets = new Array(arr.length);

  for (var i = 0; i < arr.length; i++) {
    rangeSubnets[i] = parseipNotation(arr[i]);
  }

  return rangeSubnets;
}

/**
 * Compile range subnet array into trust function.
 *
 * @param {Array} rangeSubnets
 * @api private
 */

function compileTrust(rangeSubnets) {
  // Return optimized function based on length
  var len = rangeSubnets.length;
  return len === 0
    ? trustNone
    : len === 1
    ? trustSingle(rangeSubnets[0])
    : trustMulti(rangeSubnets);
}

/**
 * Parse IP notation string into range subnet.
 *
 * @param {String} note
 * @api private
 */

function parseipNotation(note) {
  var ip;
  var kind;
  var max;
  var pos = note.lastIndexOf('/');
  var range;

  ip = pos !== -1
    ? note.substring(0, pos)
    : note;

  if (!isip(ip)) {
    throw new TypeError('invalid IP address: ' + ip);
  }

  ip = parseip(ip);

  kind = ip.kind();
  max = kind === 'ipv4' ? 32
    : kind === 'ipv6' ? 128
    : 0;

  range = pos !== -1
    ? note.substring(pos + 1, note.length)
    : max;

  if (typeof range !== 'number') {
    range = digitre.test(range)
      ? parseInt(range, 10)
      : isip(range)
      ? parseNetmask(range)
      : 0;
  }

  if (ip.kind() === 'ipv6' && ip.isIPv4MappedAddress()) {
    // Store as IPv4
    ip = ip.toIPv4Address();
    range = range <= max
      ? range - 96
      : range;
  }

  if (range <= 0 || range > max) {
    throw new TypeError('invalid range on address: ' + note);
  }

  return [ip, range];
}

/**
 * Parse netmask string into CIDR range.
 *
 * @param {String} note
 * @api private
 */

function parseNetmask(netmask) {
  var ip = parseip(netmask);
  var parts;
  var size;

  switch (ip.kind()) {
    case 'ipv4':
      parts = ip.octets;
      size = 8;
      break;
    case 'ipv6':
      parts = ip.parts;
      size = 16;
      break;
    default:
      throw new TypeError('unknown netmask');
  }

  var max = Math.pow(2, size) - 1;
  var part;
  var range = 0;

  for (var i = 0; i < parts.length; i++) {
    part = parts[i] & max;

    if (part === max) {
      range += size;
      continue;
    }

    while (part) {
      part = (part << 1) & max;
      range += 1;
    }

    break;
  }

  return range;
}

/**
 * Determine address of proxied request.
 *
 * @param {Object} request
 * @param {Function|Array|String} trust
 * @api public
 */

function proxyaddr(req, trust) {
  if (!req) {
    throw new TypeError('req argument is required');
  }

  if (!trust) {
    throw new TypeError('trust argument is required');
  }

  var addrs = alladdrs(req, trust);
  var addr = addrs[addrs.length - 1];

  return addr;
}

/**
 * Static trust function to trust nothing.
 *
 * @api private
 */

function trustNone() {
  return false;
}

/**
 * Compile trust function for multiple subnets.
 *
 * @param {Array} subnets
 * @api private
 */

function trustMulti(subnets) {
  return function trust(addr) {
    if (!isip(addr)) return false;

    var ip = parseip(addr);
    var ipv4;
    var kind = ip.kind();
    var subnet;
    var subnetip;
    var subnetkind;
    var trusted;

    for (var i = 0; i < subnets.length; i++) {
      subnet = subnets[i];
      subnetip = subnet[0];
      subnetkind = subnetip.kind();
      subnetrange = subnet[1];
      trusted = ip;

      if (kind !== subnetkind) {
        if (kind !== 'ipv6' || subnetkind !== 'ipv4' || !ip.isIPv4MappedAddress()) {
          continue;
        }

        // Store addr as IPv4
        ipv4 = ipv4 || ip.toIPv4Address();
        trusted = ipv4;
      }

      if (trusted.match(subnetip, subnetrange)) return true;
    }

    return false;
  };
}

/**
 * Compile trust function for single subnet.
 *
 * @param {Object} subnet
 * @api private
 */

function trustSingle(subnet) {
  var subnetip = subnet[0];
  var subnetkind = subnetip.kind();
  var subnetisipv4 = subnetkind === 'ipv4';
  var subnetrange = subnet[1];

  return function trust(addr) {
    if (!isip(addr)) return false;

    var ip = parseip(addr);
    var kind = ip.kind();

    return kind === subnetkind
      ? ip.match(subnetip, subnetrange)
      : subnetisipv4 && kind === 'ipv6' && ip.isIPv4MappedAddress()
      ? ip.toIPv4Address().match(subnetip, subnetrange)
      : false;
  };
}

},{"ipaddr.js":88}],88:[function(require,module,exports){
(function() {
  var expandIPv6, ipaddr, ipv4Part, ipv4Regexes, ipv6Part, ipv6Regexes, matchCIDR, root;

  ipaddr = {};

  root = this;

  if ((typeof module !== "undefined" && module !== null) && module.exports) {
    module.exports = ipaddr;
  } else {
    root['ipaddr'] = ipaddr;
  }

  matchCIDR = function(first, second, partSize, cidrBits) {
    var part, shift;
    if (first.length !== second.length) {
      throw new Error("ipaddr: cannot match CIDR for objects with different lengths");
    }
    part = 0;
    while (cidrBits > 0) {
      shift = partSize - cidrBits;
      if (shift < 0) {
        shift = 0;
      }
      if (first[part] >> shift !== second[part] >> shift) {
        return false;
      }
      cidrBits -= partSize;
      part += 1;
    }
    return true;
  };

  ipaddr.subnetMatch = function(address, rangeList, defaultName) {
    var rangeName, rangeSubnets, subnet, _i, _len;
    if (defaultName == null) {
      defaultName = 'unicast';
    }
    for (rangeName in rangeList) {
      rangeSubnets = rangeList[rangeName];
      if (toString.call(rangeSubnets[0]) !== '[object Array]') {
        rangeSubnets = [rangeSubnets];
      }
      for (_i = 0, _len = rangeSubnets.length; _i < _len; _i++) {
        subnet = rangeSubnets[_i];
        if (address.match.apply(address, subnet)) {
          return rangeName;
        }
      }
    }
    return defaultName;
  };

  ipaddr.IPv4 = (function() {
    function IPv4(octets) {
      var octet, _i, _len;
      if (octets.length !== 4) {
        throw new Error("ipaddr: ipv4 octet count should be 4");
      }
      for (_i = 0, _len = octets.length; _i < _len; _i++) {
        octet = octets[_i];
        if (!((0 <= octet && octet <= 255))) {
          throw new Error("ipaddr: ipv4 octet is a byte");
        }
      }
      this.octets = octets;
    }

    IPv4.prototype.kind = function() {
      return 'ipv4';
    };

    IPv4.prototype.toString = function() {
      return this.octets.join(".");
    };

    IPv4.prototype.toByteArray = function() {
      return this.octets.slice(0);
    };

    IPv4.prototype.match = function(other, cidrRange) {
      if (other.kind() !== 'ipv4') {
        throw new Error("ipaddr: cannot match ipv4 address with non-ipv4 one");
      }
      return matchCIDR(this.octets, other.octets, 8, cidrRange);
    };

    IPv4.prototype.SpecialRanges = {
      broadcast: [[new IPv4([255, 255, 255, 255]), 32]],
      multicast: [[new IPv4([224, 0, 0, 0]), 4]],
      linkLocal: [[new IPv4([169, 254, 0, 0]), 16]],
      loopback: [[new IPv4([127, 0, 0, 0]), 8]],
      "private": [[new IPv4([10, 0, 0, 0]), 8], [new IPv4([172, 16, 0, 0]), 12], [new IPv4([192, 168, 0, 0]), 16]],
      reserved: [[new IPv4([192, 0, 0, 0]), 24], [new IPv4([192, 0, 2, 0]), 24], [new IPv4([192, 88, 99, 0]), 24], [new IPv4([198, 51, 100, 0]), 24], [new IPv4([203, 0, 113, 0]), 24], [new IPv4([240, 0, 0, 0]), 4]]
    };

    IPv4.prototype.range = function() {
      return ipaddr.subnetMatch(this, this.SpecialRanges);
    };

    IPv4.prototype.toIPv4MappedAddress = function() {
      return ipaddr.IPv6.parse("::ffff:" + (this.toString()));
    };

    return IPv4;

  })();

  ipv4Part = "(0?\\d+|0x[a-f0-9]+)";

  ipv4Regexes = {
    fourOctet: new RegExp("^" + ipv4Part + "\\." + ipv4Part + "\\." + ipv4Part + "\\." + ipv4Part + "$", 'i'),
    longValue: new RegExp("^" + ipv4Part + "$", 'i')
  };

  ipaddr.IPv4.parser = function(string) {
    var match, parseIntAuto, part, shift, value;
    parseIntAuto = function(string) {
      if (string[0] === "0" && string[1] !== "x") {
        return parseInt(string, 8);
      } else {
        return parseInt(string);
      }
    };
    if (match = string.match(ipv4Regexes.fourOctet)) {
      return (function() {
        var _i, _len, _ref, _results;
        _ref = match.slice(1, 6);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          part = _ref[_i];
          _results.push(parseIntAuto(part));
        }
        return _results;
      })();
    } else if (match = string.match(ipv4Regexes.longValue)) {
      value = parseIntAuto(match[1]);
      return ((function() {
        var _i, _results;
        _results = [];
        for (shift = _i = 0; _i <= 24; shift = _i += 8) {
          _results.push((value >> shift) & 0xff);
        }
        return _results;
      })()).reverse();
    } else {
      return null;
    }
  };

  ipaddr.IPv6 = (function() {
    function IPv6(parts) {
      var part, _i, _len;
      if (parts.length !== 8) {
        throw new Error("ipaddr: ipv6 part count should be 8");
      }
      for (_i = 0, _len = parts.length; _i < _len; _i++) {
        part = parts[_i];
        if (!((0 <= part && part <= 0xffff))) {
          throw new Error("ipaddr: ipv6 part should fit to two octets");
        }
      }
      this.parts = parts;
    }

    IPv6.prototype.kind = function() {
      return 'ipv6';
    };

    IPv6.prototype.toString = function() {
      var compactStringParts, part, pushPart, state, stringParts, _i, _len;
      stringParts = (function() {
        var _i, _len, _ref, _results;
        _ref = this.parts;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          part = _ref[_i];
          _results.push(part.toString(16));
        }
        return _results;
      }).call(this);
      compactStringParts = [];
      pushPart = function(part) {
        return compactStringParts.push(part);
      };
      state = 0;
      for (_i = 0, _len = stringParts.length; _i < _len; _i++) {
        part = stringParts[_i];
        switch (state) {
          case 0:
            if (part === '0') {
              pushPart('');
            } else {
              pushPart(part);
            }
            state = 1;
            break;
          case 1:
            if (part === '0') {
              state = 2;
            } else {
              pushPart(part);
            }
            break;
          case 2:
            if (part !== '0') {
              pushPart('');
              pushPart(part);
              state = 3;
            }
            break;
          case 3:
            pushPart(part);
        }
      }
      if (state === 2) {
        pushPart('');
        pushPart('');
      }
      return compactStringParts.join(":");
    };

    IPv6.prototype.toByteArray = function() {
      var bytes, part, _i, _len, _ref;
      bytes = [];
      _ref = this.parts;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        part = _ref[_i];
        bytes.push(part >> 8);
        bytes.push(part & 0xff);
      }
      return bytes;
    };

    IPv6.prototype.toNormalizedString = function() {
      var part;
      return ((function() {
        var _i, _len, _ref, _results;
        _ref = this.parts;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          part = _ref[_i];
          _results.push(part.toString(16));
        }
        return _results;
      }).call(this)).join(":");
    };

    IPv6.prototype.match = function(other, cidrRange) {
      if (other.kind() !== 'ipv6') {
        throw new Error("ipaddr: cannot match ipv6 address with non-ipv6 one");
      }
      return matchCIDR(this.parts, other.parts, 16, cidrRange);
    };

    IPv6.prototype.SpecialRanges = {
      unspecified: [new IPv6([0, 0, 0, 0, 0, 0, 0, 0]), 128],
      linkLocal: [new IPv6([0xfe80, 0, 0, 0, 0, 0, 0, 0]), 10],
      multicast: [new IPv6([0xff00, 0, 0, 0, 0, 0, 0, 0]), 8],
      loopback: [new IPv6([0, 0, 0, 0, 0, 0, 0, 1]), 128],
      uniqueLocal: [new IPv6([0xfc00, 0, 0, 0, 0, 0, 0, 0]), 7],
      ipv4Mapped: [new IPv6([0, 0, 0, 0, 0, 0xffff, 0, 0]), 96],
      rfc6145: [new IPv6([0, 0, 0, 0, 0xffff, 0, 0, 0]), 96],
      rfc6052: [new IPv6([0x64, 0xff9b, 0, 0, 0, 0, 0, 0]), 96],
      '6to4': [new IPv6([0x2002, 0, 0, 0, 0, 0, 0, 0]), 16],
      teredo: [new IPv6([0x2001, 0, 0, 0, 0, 0, 0, 0]), 32],
      reserved: [[new IPv6([0x2001, 0xdb8, 0, 0, 0, 0, 0, 0]), 32]]
    };

    IPv6.prototype.range = function() {
      return ipaddr.subnetMatch(this, this.SpecialRanges);
    };

    IPv6.prototype.isIPv4MappedAddress = function() {
      return this.range() === 'ipv4Mapped';
    };

    IPv6.prototype.toIPv4Address = function() {
      var high, low, _ref;
      if (!this.isIPv4MappedAddress()) {
        throw new Error("ipaddr: trying to convert a generic ipv6 address to ipv4");
      }
      _ref = this.parts.slice(-2), high = _ref[0], low = _ref[1];
      return new ipaddr.IPv4([high >> 8, high & 0xff, low >> 8, low & 0xff]);
    };

    return IPv6;

  })();

  ipv6Part = "(?:[0-9a-f]+::?)+";

  ipv6Regexes = {
    "native": new RegExp("^(::)?(" + ipv6Part + ")?([0-9a-f]+)?(::)?$", 'i'),
    transitional: new RegExp(("^((?:" + ipv6Part + ")|(?:::)(?:" + ipv6Part + ")?)") + ("" + ipv4Part + "\\." + ipv4Part + "\\." + ipv4Part + "\\." + ipv4Part + "$"), 'i')
  };

  expandIPv6 = function(string, parts) {
    var colonCount, lastColon, part, replacement, replacementCount;
    if (string.indexOf('::') !== string.lastIndexOf('::')) {
      return null;
    }
    colonCount = 0;
    lastColon = -1;
    while ((lastColon = string.indexOf(':', lastColon + 1)) >= 0) {
      colonCount++;
    }
    if (string[0] === ':') {
      colonCount--;
    }
    if (string[string.length - 1] === ':') {
      colonCount--;
    }
    replacementCount = parts - colonCount;
    replacement = ':';
    while (replacementCount--) {
      replacement += '0:';
    }
    string = string.replace('::', replacement);
    if (string[0] === ':') {
      string = string.slice(1);
    }
    if (string[string.length - 1] === ':') {
      string = string.slice(0, -1);
    }
    return (function() {
      var _i, _len, _ref, _results;
      _ref = string.split(":");
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        part = _ref[_i];
        _results.push(parseInt(part, 16));
      }
      return _results;
    })();
  };

  ipaddr.IPv6.parser = function(string) {
    var match, parts;
    if (string.match(ipv6Regexes['native'])) {
      return expandIPv6(string, 8);
    } else if (match = string.match(ipv6Regexes['transitional'])) {
      parts = expandIPv6(match[1].slice(0, -1), 6);
      if (parts) {
        parts.push(parseInt(match[2]) << 8 | parseInt(match[3]));
        parts.push(parseInt(match[4]) << 8 | parseInt(match[5]));
        return parts;
      }
    }
    return null;
  };

  ipaddr.IPv4.isIPv4 = ipaddr.IPv6.isIPv6 = function(string) {
    return this.parser(string) !== null;
  };

  ipaddr.IPv4.isValid = ipaddr.IPv6.isValid = function(string) {
    var e;
    try {
      new this(this.parser(string));
      return true;
    } catch (_error) {
      e = _error;
      return false;
    }
  };

  ipaddr.IPv4.parse = ipaddr.IPv6.parse = function(string) {
    var parts;
    parts = this.parser(string);
    if (parts === null) {
      throw new Error("ipaddr: string is not formatted like ip address");
    }
    return new this(parts);
  };

  ipaddr.isValid = function(string) {
    return ipaddr.IPv6.isValid(string) || ipaddr.IPv4.isValid(string);
  };

  ipaddr.parse = function(string) {
    if (ipaddr.IPv6.isIPv6(string)) {
      return ipaddr.IPv6.parse(string);
    } else if (ipaddr.IPv4.isIPv4(string)) {
      return ipaddr.IPv4.parse(string);
    } else {
      throw new Error("ipaddr: the address has neither IPv6 nor IPv4 format");
    }
  };

  ipaddr.process = function(string) {
    var addr;
    addr = this.parse(string);
    if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
      return addr.toIPv4Address();
    } else {
      return addr;
    }
  };

}).call(this);

},{}],89:[function(require,module,exports){
module.exports=require(59)
},{"/Users/stewart/dev/cylon-example-chrome/node_modules/cylon/node_modules/body-parser/node_modules/qs/index.js":59}],90:[function(require,module,exports){

/**
 * Parse "Range" header `str` relative to the given file `size`.
 *
 * @param {Number} size
 * @param {String} str
 * @return {Array}
 * @api public
 */

module.exports = function(size, str){
  var valid = true;
  var i = str.indexOf('=');

  if (-1 == i) return -2;

  var arr = str.slice(i + 1).split(',').map(function(range){
    var range = range.split('-')
      , start = parseInt(range[0], 10)
      , end = parseInt(range[1], 10);

    // -nnn
    if (isNaN(start)) {
      start = size - end;
      end = size - 1;
    // nnn-
    } else if (isNaN(end)) {
      end = size - 1;
    }

    // limit last-byte-pos to current length
    if (end > size - 1) end = size - 1;

    // invalid
    if (isNaN(start)
      || isNaN(end)
      || start > end
      || start < 0) valid = false;

    return {
      start: start,
      end: end
    };
  });

  arr.type = str.slice(0, i);

  return valid ? arr : -1;
};
},{}],91:[function(require,module,exports){

module.exports = require('./lib/send');

},{"./lib/send":92}],92:[function(require,module,exports){

/**
 * Module dependencies.
 */

var debug = require('debug')('send')
  , parseRange = require('range-parser')
  , Stream = require('stream')
  , mime = require('mime')
  , fresh = require('fresh')
  , path = require('path')
  , http = require('http')
  , onFinished = require('finished')
  , fs = require('fs')
  , basename = path.basename
  , normalize = path.normalize
  , join = path.join
  , utils = require('./utils');

var upPathRegexp = /(?:^|[\\\/])\.\.(?:[\\\/]|$)/;

/**
 * Expose `send`.
 */

exports = module.exports = send;

/**
 * Expose mime module.
 */

exports.mime = mime;

/**
 * Return a `SendStream` for `req` and `path`.
 *
 * @param {Request} req
 * @param {String} path
 * @param {Object} options
 * @return {SendStream}
 * @api public
 */

function send(req, path, options) {
  return new SendStream(req, path, options);
}

/**
 * Initialize a `SendStream` with the given `path`.
 *
 * Events:
 *
 *  - `error` an error occurred
 *  - `stream` file streaming has started
 *  - `end` streaming has completed
 *  - `directory` a directory was requested
 *
 * @param {Request} req
 * @param {String} path
 * @param {Object} options
 * @api private
 */

function SendStream(req, path, options) {
  var self = this;
  options = options || {};
  this.req = req;
  this.path = path;
  this.options = options;
  this.etag(('etag' in options) ? options.etag : true);
  this.maxage(options.maxage);
  this.hidden(options.hidden);
  this.index(('index' in options) ? options.index : 'index.html');
  if (options.root || options.from) this.root(options.root || options.from);
}

/**
 * Inherits from `Stream.prototype`.
 */

SendStream.prototype.__proto__ = Stream.prototype;

/**
 * Enable or disable etag generation.
 *
 * @param {Boolean} val
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.etag = function(val){
  val = Boolean(val);
  debug('etag %s', val);
  this._etag = val;
  return this;
};

/**
 * Enable or disable "hidden" (dot) files.
 *
 * @param {Boolean} path
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.hidden = function(val){
  val = Boolean(val);
  debug('hidden %s', val);
  this._hidden = val;
  return this;
};

/**
 * Set index `paths`, set to a falsy
 * value to disable index support.
 *
 * @param {String|Boolean|Array} paths
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.index = function index(paths){
  var index = !paths ? [] : Array.isArray(paths) ? paths : [paths];
  debug('index %j', index);
  this._index = index;
  return this;
};

/**
 * Set root `path`.
 *
 * @param {String} path
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.root = 
SendStream.prototype.from = function(path){
  path = String(path);
  this._root = normalize(path);
  return this;
};

/**
 * Set max-age to `ms`.
 *
 * @param {Number} ms
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.maxage = function(ms){
  ms = Number(ms);
  if (isNaN(ms)) ms = 0;
  if (Infinity == ms) ms = 60 * 60 * 24 * 365 * 1000;
  debug('max-age %d', ms);
  this._maxage = ms;
  return this;
};

/**
 * Emit error with `status`.
 *
 * @param {Number} status
 * @api private
 */

SendStream.prototype.error = function(status, err){
  var res = this.res;
  var msg = http.STATUS_CODES[status];
  err = err || new Error(msg);
  err.status = status;
  if (this.listeners('error').length) return this.emit('error', err);
  res.statusCode = err.status;
  res.end(msg);
};

/**
 * Check if the pathname is potentially malicious.
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isMalicious = function(){
  return !this._root && ~this.path.indexOf('..') && upPathRegexp.test(this.path);
};

/**
 * Check if the pathname ends with "/".
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.hasTrailingSlash = function(){
  return '/' == this.path[this.path.length - 1];
};

/**
 * Check if the basename leads with ".".
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.hasLeadingDot = function(){
  return '.' == basename(this.path)[0];
};

/**
 * Check if this is a conditional GET request.
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isConditionalGET = function(){
  return this.req.headers['if-none-match']
    || this.req.headers['if-modified-since'];
};

/**
 * Strip content-* header fields.
 *
 * @api private
 */

SendStream.prototype.removeContentHeaderFields = function(){
  var res = this.res;
  Object.keys(res._headers).forEach(function(field){
    if (0 == field.indexOf('content')) {
      res.removeHeader(field);
    }
  });
};

/**
 * Respond with 304 not modified.
 *
 * @api private
 */

SendStream.prototype.notModified = function(){
  var res = this.res;
  debug('not modified');
  this.removeContentHeaderFields();
  res.statusCode = 304;
  res.end();
};

/**
 * Raise error that headers already sent.
 *
 * @api private
 */

SendStream.prototype.headersAlreadySent = function headersAlreadySent(){
  var err = new Error('Can\'t set headers after they are sent.');
  debug('headers already sent');
  this.error(500, err);
};

/**
 * Check if the request is cacheable, aka
 * responded with 2xx or 304 (see RFC 2616 section 14.2{5,6}).
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isCachable = function(){
  var res = this.res;
  return (res.statusCode >= 200 && res.statusCode < 300) || 304 == res.statusCode;
};

/**
 * Handle stat() error.
 *
 * @param {Error} err
 * @api private
 */

SendStream.prototype.onStatError = function(err){
  var notfound = ['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'];
  if (~notfound.indexOf(err.code)) return this.error(404, err);
  this.error(500, err);
};

/**
 * Check if the cache is fresh.
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isFresh = function(){
  return fresh(this.req.headers, this.res._headers);
};

/**
 * Check if the range is fresh.
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isRangeFresh = function isRangeFresh(){
  var ifRange = this.req.headers['if-range'];

  if (!ifRange) return true;

  return ~ifRange.indexOf('"')
    ? ~ifRange.indexOf(this.res._headers['etag'])
    : Date.parse(this.res._headers['last-modified']) <= Date.parse(ifRange);
};

/**
 * Redirect to `path`.
 *
 * @param {String} path
 * @api private
 */

SendStream.prototype.redirect = function(path){
  if (this.listeners('directory').length) return this.emit('directory');
  if (this.hasTrailingSlash()) return this.error(403);
  var res = this.res;
  path += '/';
  res.statusCode = 301;
  res.setHeader('Location', path);
  res.end('Redirecting to ' + utils.escape(path));
};

/**
 * Pipe to `res.
 *
 * @param {Stream} res
 * @return {Stream} res
 * @api public
 */

SendStream.prototype.pipe = function(res){
  var self = this
    , args = arguments
    , path = this.path
    , root = this._root;

  // references
  this.res = res;

  // invalid request uri
  path = utils.decode(path);
  if (-1 == path) return this.error(400);

  // null byte(s)
  if (~path.indexOf('\0')) return this.error(400);

  // join / normalize from optional root dir
  if (root) path = normalize(join(this._root, path));

  // ".." is malicious without "root"
  if (this.isMalicious()) return this.error(403);

  // malicious path
  if (root && 0 != path.indexOf(root)) return this.error(403);

  // hidden file support
  if (!this._hidden && this.hasLeadingDot()) return this.error(404);

  // index file support
  if (this._index.length && this.hasTrailingSlash()) {
    this.sendIndex(path);
    return res;
  }

  debug('stat "%s"', path);
  fs.stat(path, function(err, stat){
    if (err) return self.onStatError(err);
    if (stat.isDirectory()) return self.redirect(self.path);
    self.emit('file', path, stat);
    self.send(path, stat);
  });

  return res;
};

/**
 * Transfer `path`.
 *
 * @param {String} path
 * @api public
 */

SendStream.prototype.send = function(path, stat){
  var options = this.options;
  var len = stat.size;
  var res = this.res;
  var req = this.req;
  var ranges = req.headers.range;
  var offset = options.start || 0;

  if (res._header) {
    // impossible to send now
    return this.headersAlreadySent();
  }

  // set header fields
  this.setHeader(path, stat);

  // set content-type
  this.type(path);

  // conditional GET support
  if (this.isConditionalGET()
    && this.isCachable()
    && this.isFresh()) {
    return this.notModified();
  }

  // adjust len to start/end options
  len = Math.max(0, len - offset);
  if (options.end !== undefined) {
    var bytes = options.end - offset + 1;
    if (len > bytes) len = bytes;
  }

  // Range support
  if (ranges) {
    ranges = parseRange(len, ranges);

    // If-Range support
    if (!this.isRangeFresh()) {
      debug('range stale');
      ranges = -2;
    }

    // unsatisfiable
    if (-1 == ranges) {
      debug('range unsatisfiable');
      res.setHeader('Content-Range', 'bytes */' + stat.size);
      return this.error(416);
    }

    // valid (syntactically invalid/multiple ranges are treated as a regular response)
    if (-2 != ranges && ranges.length === 1) {
      debug('range %j', ranges);

      options.start = offset + ranges[0].start;
      options.end = offset + ranges[0].end;

      // Content-Range
      res.statusCode = 206;
      res.setHeader('Content-Range', 'bytes '
        + ranges[0].start
        + '-'
        + ranges[0].end
        + '/'
        + len);
      len = options.end - options.start + 1;
    }
  }

  // content-length
  res.setHeader('Content-Length', len);

  // HEAD support
  if ('HEAD' == req.method) return res.end();

  this.stream(path, options);
};

/**
 * Transfer index for `path`.
 *
 * @param {String} path
 * @api private
 */
SendStream.prototype.sendIndex = function sendIndex(path){
  var i = -1;
  var self = this;

  function next(err){
    if (++i >= self._index.length) {
      if (err) return self.onStatError(err);
      return self.error(404);
    }

    var p = path + self._index[i];

    debug('stat "%s"', p);
    fs.stat(p, function(err, stat){
      if (err) return next(err);
      if (stat.isDirectory()) return next();
      self.emit('file', p, stat);
      self.send(p, stat);
    });
  }

  if (!this.hasTrailingSlash()) path += '/';

  next();
};

/**
 * Stream `path` to the response.
 *
 * @param {String} path
 * @param {Object} options
 * @api private
 */

SendStream.prototype.stream = function(path, options){
  // TODO: this is all lame, refactor meeee
  var finished = false;
  var self = this;
  var res = this.res;
  var req = this.req;

  // pipe
  var stream = fs.createReadStream(path, options);
  this.emit('stream', stream);
  stream.pipe(res);

  // request finished, done with the fd
  onFinished(req, function onfinished(){
    finished = true;
    stream.destroy();
  });

  // error handling code-smell
  stream.on('error', function onerror(err){
    // request already finished
    if (finished) return;

    // no hope in responding
    if (res._header) {
      console.error(err.stack);
      req.destroy();
      return;
    }

    // 500
    err.status = 500;
    self.emit('error', err);
  });

  // end
  stream.on('end', function onend(){
    self.emit('end');
  });
};

/**
 * Set content-type based on `path`
 * if it hasn't been explicitly set.
 *
 * @param {String} path
 * @api private
 */

SendStream.prototype.type = function(path){
  var res = this.res;
  if (res.getHeader('Content-Type')) return;
  var type = mime.lookup(path);
  var charset = mime.charsets.lookup(type);
  debug('content-type %s', type);
  res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
};

/**
 * Set response header fields, most
 * fields may be pre-defined.
 *
 * @param {String} path
 * @param {Object} stat
 * @api private
 */

SendStream.prototype.setHeader = function setHeader(path, stat){
  var res = this.res;
  if (!res.getHeader('Accept-Ranges')) res.setHeader('Accept-Ranges', 'bytes');
  if (!res.getHeader('Date')) res.setHeader('Date', new Date().toUTCString());
  if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'public, max-age=' + Math.floor(this._maxage / 1000));
  if (!res.getHeader('Last-Modified')) res.setHeader('Last-Modified', stat.mtime.toUTCString());

  if (this._etag && !res.getHeader('ETag')) {
    var etag = utils.etag(path, stat);
    debug('etag %s', etag);
    res.setHeader('ETag', etag);
  }
};

},{"./utils":93,"debug":81,"finished":94,"fresh":83,"fs":101,"http":123,"mime":95,"path":130,"range-parser":90,"stream":147}],93:[function(require,module,exports){

/**
 * Module dependencies.
 */

var crypto = require('crypto');

/**
 * Return a weak ETag from the given `path` and `stat`.
 *
 * @param {String} path
 * @param {Object} stat
 * @return {String}
 * @api private
 */

exports.etag = function etag(path, stat) {
  var tag = String(stat.mtime.getTime()) + ':' + String(stat.size) + ':' + path;
  return 'W/"' + exports.md5(tag, 'base64') + '"';
};

/**
 * decodeURIComponent.
 *
 * Allows V8 to only deoptimize this fn instead of all
 * of send().
 *
 * @param {String} path
 * @api private
 */

exports.decode = function(path){
  try {
    return decodeURIComponent(path);
  } catch (err) {
    return -1;
  }
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function(html){
  return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * Return md5 hash of the given string and optional encoding,
 * defaulting to hex.
 *
 *     utils.md5('wahoo');
 *     // => "e493298061761236c96b02ea6aa8a2ad"
 *
 * @param {String} str
 * @param {String} encoding
 * @return {String}
 * @api private
 */

exports.md5 = function(str, encoding){
  return crypto
    .createHash('md5')
    .update(str, 'utf8')
    .digest(encoding || 'hex');
};

},{"crypto":111}],94:[function(require,module,exports){
(function (process){

var defer = typeof setImmediate === 'function'
  ? setImmediate
  : process.nextTick

module.exports = function (thingie, callback) {
  var socket = thingie.socket || thingie
  var res = thingie.res || thingie
  if (!socket.writable)
    return defer(callback)

  socket.on('error', done)
  socket.on('close', done)
  res.on('finish', done)

  function done(err) {
    if (err != null && !(err instanceof Error)) err = null; // suck it node
    socket.removeListener('error', done)
    socket.removeListener('close', done)
    res.removeListener('finish', done)
    callback(err)
  }

  return thingie
}

}).call(this,require('_process'))
},{"_process":131}],95:[function(require,module,exports){
(function (process,__dirname){
var path = require('path');
var fs = require('fs');

function Mime() {
  // Map of extension -> mime type
  this.types = Object.create(null);

  // Map of mime type -> extension
  this.extensions = Object.create(null);
}

/**
 * Define mimetype -> extension mappings.  Each key is a mime-type that maps
 * to an array of extensions associated with the type.  The first extension is
 * used as the default extension for the type.
 *
 * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
 *
 * @param map (Object) type definitions
 */
Mime.prototype.define = function (map) {
  for (var type in map) {
    var exts = map[type];

    for (var i = 0; i < exts.length; i++) {
      if (process.env.DEBUG_MIME && this.types[exts]) {
        console.warn(this._loading.replace(/.*\//, ''), 'changes "' + exts[i] + '" extension type from ' +
          this.types[exts] + ' to ' + type);
      }

      this.types[exts[i]] = type;
    }

    // Default extension is the first one we encounter
    if (!this.extensions[type]) {
      this.extensions[type] = exts[0];
    }
  }
};

/**
 * Load an Apache2-style ".types" file
 *
 * This may be called multiple times (it's expected).  Where files declare
 * overlapping types/extensions, the last file wins.
 *
 * @param file (String) path of file to load.
 */
Mime.prototype.load = function(file) {

  this._loading = file;
  // Read file and split into lines
  var map = {},
      content = fs.readFileSync(file, 'ascii'),
      lines = content.split(/[\r\n]+/);

  lines.forEach(function(line) {
    // Clean up whitespace/comments, and split into fields
    var fields = line.replace(/\s*#.*|^\s*|\s*$/g, '').split(/\s+/);
    map[fields.shift()] = fields;
  });

  this.define(map);

  this._loading = null;
};

/**
 * Lookup a mime type based on extension
 */
Mime.prototype.lookup = function(path, fallback) {
  var ext = path.replace(/.*[\.\/\\]/, '').toLowerCase();

  return this.types[ext] || fallback || this.default_type;
};

/**
 * Return file extension associated with a mime type
 */
Mime.prototype.extension = function(mimeType) {
  var type = mimeType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase();
  return this.extensions[type];
};

// Default instance
var mime = new Mime();

// Load local copy of
// http://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types
mime.load(path.join(__dirname, 'types/mime.types'));

// Load additional types from node.js community
mime.load(path.join(__dirname, 'types/node.types'));

// Default type
mime.default_type = mime.lookup('bin');

//
// Additional API specific to the default instance
//

mime.Mime = Mime;

/**
 * Lookup a charset based on mime type.
 */
mime.charsets = {
  lookup: function(mimeType, fallback) {
    // Assume text types are utf8
    return (/^text\//).test(mimeType) ? 'UTF-8' : fallback;
  }
};

module.exports = mime;

}).call(this,require('_process'),"/node_modules/cylon/node_modules/express/node_modules/send/node_modules/mime")
},{"_process":131,"fs":101,"path":130}],96:[function(require,module,exports){
/*!
 * Connect - static
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var escapeHtml = require('escape-html');
var parseurl = require('parseurl');
var resolve = require('path').resolve;
var send = require('send');
var url = require('url');

/**
 * Static:
 *
 *   Static file server with the given `root` path.
 *
 * Examples:
 *
 *     var oneDay = 86400000;
 *     var serveStatic = require('serve-static');
 *
 *     connect()
 *       .use(serveStatic(__dirname + '/public'))
 *
 *     connect()
 *       .use(serveStatic(__dirname + '/public', { maxAge: oneDay }))
 *
 * Options:
 *
 *    - `maxAge`     Browser cache maxAge in milliseconds. defaults to 0
 *    - `hidden`     Allow transfer of hidden files. defaults to false
 *    - `redirect`   Redirect to trailing "/" when the pathname is a dir. defaults to true
 *    - `index`      Default file name, defaults to 'index.html'
 *
 *   Further options are forwarded on to `send`.
 *
 * @param {String} root
 * @param {Object} options
 * @return {Function}
 * @api public
 */

exports = module.exports = function(root, options){
  options = extend({}, options);

  // root required
  if (!root) throw new TypeError('root path required');

  // resolve root to absolute
  root = resolve(root);

  // default redirect
  var redirect = false !== options.redirect;

  // setup options for send
  options.maxage = options.maxage || options.maxAge || 0;
  options.root = root;

  return function staticMiddleware(req, res, next) {
    if ('GET' != req.method && 'HEAD' != req.method) return next();
    var opts = extend({}, options);
    var originalUrl = url.parse(req.originalUrl || req.url);
    var path = parseurl(req).pathname;

    if (path == '/' && originalUrl.pathname[originalUrl.pathname.length - 1] != '/') {
      return directory();
    }

    function directory() {
      if (!redirect) return next();
      var target;
      originalUrl.pathname += '/';
      target = url.format(originalUrl);
      res.statusCode = 303;
      res.setHeader('Location', target);
      res.end('Redirecting to ' + escapeHtml(target));
    }

    function error(err) {
      if (404 == err.status) return next();
      next(err);
    }

    send(req, path, opts)
      .on('error', error)
      .on('directory', directory)
      .pipe(res);
  };
};

/**
 * Expose mime module.
 *
 * If you wish to extend the mime table use this
 * reference to the "mime" module in the npm registry.
 */

exports.mime = send.mime;

/**
 * Shallow clone a single object.
 *
 * @param {Object} obj
 * @param {Object} source
 * @return {Object}
 * @api private
 */

function extend(obj, source) {
  if (!source) return obj;

  for (var prop in source) {
    obj[prop] = source[prop];
  }

  return obj;
};

},{"escape-html":82,"parseurl":85,"path":130,"send":91,"url":149}],97:[function(require,module,exports){
arguments[4][61][0].apply(exports,arguments)
},{"/Users/stewart/dev/cylon-example-chrome/node_modules/cylon/node_modules/body-parser/node_modules/type-is/index.js":61,"mime":98}],98:[function(require,module,exports){
(function (process,__dirname){
var path = require('path');
var fs = require('fs');

function Mime() {
  // Map of extension -> mime type
  this.types = Object.create(null);

  // Map of mime type -> extension
  this.extensions = Object.create(null);
}

/**
 * Define mimetype -> extension mappings.  Each key is a mime-type that maps
 * to an array of extensions associated with the type.  The first extension is
 * used as the default extension for the type.
 *
 * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
 *
 * @param map (Object) type definitions
 */
Mime.prototype.define = function (map) {
  for (var type in map) {
    var exts = map[type];

    for (var i = 0; i < exts.length; i++) {
      if (process.env.DEBUG_MIME && this.types[exts]) {
        console.warn(this._loading.replace(/.*\//, ''), 'changes "' + exts[i] + '" extension type from ' +
          this.types[exts] + ' to ' + type);
      }

      this.types[exts[i]] = type;
    }

    // Default extension is the first one we encounter
    if (!this.extensions[type]) {
      this.extensions[type] = exts[0];
    }
  }
};

/**
 * Load an Apache2-style ".types" file
 *
 * This may be called multiple times (it's expected).  Where files declare
 * overlapping types/extensions, the last file wins.
 *
 * @param file (String) path of file to load.
 */
Mime.prototype.load = function(file) {

  this._loading = file;
  // Read file and split into lines
  var map = {},
      content = fs.readFileSync(file, 'ascii'),
      lines = content.split(/[\r\n]+/);

  lines.forEach(function(line) {
    // Clean up whitespace/comments, and split into fields
    var fields = line.replace(/\s*#.*|^\s*|\s*$/g, '').split(/\s+/);
    map[fields.shift()] = fields;
  });

  this.define(map);

  this._loading = null;
};

/**
 * Lookup a mime type based on extension
 */
Mime.prototype.lookup = function(path, fallback) {
  var ext = path.replace(/.*[\.\/\\]/, '').toLowerCase();

  return this.types[ext] || fallback || this.default_type;
};

/**
 * Return file extension associated with a mime type
 */
Mime.prototype.extension = function(mimeType) {
  var type = mimeType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase();
  return this.extensions[type];
};

// Default instance
var mime = new Mime();

// Load local copy of
// http://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types
mime.load(path.join(__dirname, 'types/mime.types'));

// Load additional types from node.js community
mime.load(path.join(__dirname, 'types/node.types'));

// Default type
mime.default_type = mime.lookup('bin');

//
// Additional API specific to the default instance
//

mime.Mime = Mime;

/**
 * Lookup a charset based on mime type.
 */
mime.charsets = {
  lookup: function(mimeType, fallback) {
    // Assume text types are utf8
    return (/^text\//).test(mimeType) ? 'UTF-8' : fallback;
  }
};

module.exports = mime;

}).call(this,require('_process'),"/node_modules/cylon/node_modules/express/node_modules/type-is/node_modules/mime")
},{"_process":131,"fs":101,"path":130}],99:[function(require,module,exports){
/**
 * Merge object b with object a.
 *
 *     var a = { foo: 'bar' }
 *       , b = { bar: 'baz' };
 *
 *     merge(a, b);
 *     // => { foo: 'bar', bar: 'baz' }
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object}
 * @api public
 */

exports = module.exports = function(a, b){
  if (a && b) {
    for (var key in b) {
      a[key] = b[key];
    }
  }
  return a;
};

},{}],100:[function(require,module,exports){
(function (process){
"use strict";

var Cylon = require('cylon');

// log directly to the page if we're in the browser
if (process.browser) {
  var Logger = require('./browser-logger')
  Cylon.Logger.setup(Logger);
}

Cylon.robot({
  name: "BrowserBot",

  connection: { name: 'arduino', adaptor: 'firmata', port: '/dev/tty.usbmodem1421' },
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

}).call(this,require('_process'))
},{"./browser-logger":1,"_process":131,"cylon":46}],101:[function(require,module,exports){

},{}],102:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":151}],103:[function(require,module,exports){
module.exports=require(101)
},{"/usr/local/lib/node_modules/browserify/lib/_empty.js":101}],104:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    if (encoding === 'base64')
      subject = base64clean(subject)
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (this.length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  var buf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start) throw new TypeError('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new TypeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new TypeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":105,"ieee754":106,"is-array":107}],105:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],106:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],107:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],108:[function(require,module,exports){
(function (Buffer){
var createHash = require('sha.js')

var md5 = toConstructor(require('./md5'))
var rmd160 = toConstructor(require('ripemd160'))

function toConstructor (fn) {
  return function () {
    var buffers = []
    var m= {
      update: function (data, enc) {
        if(!Buffer.isBuffer(data)) data = new Buffer(data, enc)
        buffers.push(data)
        return this
      },
      digest: function (enc) {
        var buf = Buffer.concat(buffers)
        var r = fn(buf)
        buffers = null
        return enc ? r.toString(enc) : r
      }
    }
    return m
  }
}

module.exports = function (alg) {
  if('md5' === alg) return new md5()
  if('rmd160' === alg) return new rmd160()
  return createHash(alg)
}

}).call(this,require("buffer").Buffer)
},{"./md5":112,"buffer":104,"ripemd160":114,"sha.js":116}],109:[function(require,module,exports){
(function (Buffer){
var createHash = require('./create-hash')

var zeroBuffer = new Buffer(128)
zeroBuffer.fill(0)

module.exports = Hmac

function Hmac (alg, key) {
  if(!(this instanceof Hmac)) return new Hmac(alg, key)
  this._opad = opad
  this._alg = alg

  var blocksize = (alg === 'sha512') ? 128 : 64

  key = this._key = !Buffer.isBuffer(key) ? new Buffer(key) : key

  if(key.length > blocksize) {
    key = createHash(alg).update(key).digest()
  } else if(key.length < blocksize) {
    key = Buffer.concat([key, zeroBuffer], blocksize)
  }

  var ipad = this._ipad = new Buffer(blocksize)
  var opad = this._opad = new Buffer(blocksize)

  for(var i = 0; i < blocksize; i++) {
    ipad[i] = key[i] ^ 0x36
    opad[i] = key[i] ^ 0x5C
  }

  this._hash = createHash(alg).update(ipad)
}

Hmac.prototype.update = function (data, enc) {
  this._hash.update(data, enc)
  return this
}

Hmac.prototype.digest = function (enc) {
  var h = this._hash.digest()
  return createHash(this._alg).update(this._opad).update(h).digest(enc)
}


}).call(this,require("buffer").Buffer)
},{"./create-hash":108,"buffer":104}],110:[function(require,module,exports){
(function (Buffer){
var intSize = 4;
var zeroBuffer = new Buffer(intSize); zeroBuffer.fill(0);
var chrsz = 8;

function toArray(buf, bigEndian) {
  if ((buf.length % intSize) !== 0) {
    var len = buf.length + (intSize - (buf.length % intSize));
    buf = Buffer.concat([buf, zeroBuffer], len);
  }

  var arr = [];
  var fn = bigEndian ? buf.readInt32BE : buf.readInt32LE;
  for (var i = 0; i < buf.length; i += intSize) {
    arr.push(fn.call(buf, i));
  }
  return arr;
}

function toBuffer(arr, size, bigEndian) {
  var buf = new Buffer(size);
  var fn = bigEndian ? buf.writeInt32BE : buf.writeInt32LE;
  for (var i = 0; i < arr.length; i++) {
    fn.call(buf, arr[i], i * 4, true);
  }
  return buf;
}

function hash(buf, fn, hashSize, bigEndian) {
  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);
  var arr = fn(toArray(buf, bigEndian), buf.length * chrsz);
  return toBuffer(arr, hashSize, bigEndian);
}

module.exports = { hash: hash };

}).call(this,require("buffer").Buffer)
},{"buffer":104}],111:[function(require,module,exports){
(function (Buffer){
var rng = require('./rng')

function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/dominictarr/crypto-browserify'
    ].join('\n'))
}

exports.createHash = require('./create-hash')

exports.createHmac = require('./create-hmac')

exports.randomBytes = function(size, callback) {
  if (callback && callback.call) {
    try {
      callback.call(this, undefined, new Buffer(rng(size)))
    } catch (err) { callback(err) }
  } else {
    return new Buffer(rng(size))
  }
}

function each(a, f) {
  for(var i in a)
    f(a[i], i)
}

exports.getHashes = function () {
  return ['sha1', 'sha256', 'sha512', 'md5', 'rmd160']
}

var p = require('./pbkdf2')(exports)
exports.pbkdf2 = p.pbkdf2
exports.pbkdf2Sync = p.pbkdf2Sync


// the least I can do is make error messages for the rest of the node.js/crypto api.
each(['createCredentials'
, 'createCipher'
, 'createCipheriv'
, 'createDecipher'
, 'createDecipheriv'
, 'createSign'
, 'createVerify'
, 'createDiffieHellman'
], function (name) {
  exports[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
})

}).call(this,require("buffer").Buffer)
},{"./create-hash":108,"./create-hmac":109,"./pbkdf2":120,"./rng":121,"buffer":104}],112:[function(require,module,exports){
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

var helpers = require('./helpers');

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
function core_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);

}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function md5(buf) {
  return helpers.hash(buf, core_md5, 16);
};

},{"./helpers":110}],113:[function(require,module,exports){
(function (Buffer){
module.exports = function(crypto) {
  function pbkdf2(password, salt, iterations, keylen, digest, callback) {
    if ('function' === typeof digest) {
      callback = digest
      digest = undefined
    }

    if ('function' !== typeof callback)
      throw new Error('No callback provided to pbkdf2')

    setTimeout(function() {
      var result

      try {
        result = pbkdf2Sync(password, salt, iterations, keylen, digest)
      } catch (e) {
        return callback(e)
      }

      callback(undefined, result)
    })
  }

  function pbkdf2Sync(password, salt, iterations, keylen, digest) {
    if ('number' !== typeof iterations)
      throw new TypeError('Iterations not a number')

    if (iterations < 0)
      throw new TypeError('Bad iterations')

    if ('number' !== typeof keylen)
      throw new TypeError('Key length not a number')

    if (keylen < 0)
      throw new TypeError('Bad key length')

    digest = digest || 'sha1'

    if (!Buffer.isBuffer(password)) password = new Buffer(password)
    if (!Buffer.isBuffer(salt)) salt = new Buffer(salt)

    var hLen, l = 1, r, T
    var DK = new Buffer(keylen)
    var block1 = new Buffer(salt.length + 4)
    salt.copy(block1, 0, 0, salt.length)

    for (var i = 1; i <= l; i++) {
      block1.writeUInt32BE(i, salt.length)

      var U = crypto.createHmac(digest, password).update(block1).digest()

      if (!hLen) {
        hLen = U.length
        T = new Buffer(hLen)
        l = Math.ceil(keylen / hLen)
        r = keylen - (l - 1) * hLen

        if (keylen > (Math.pow(2, 32) - 1) * hLen)
          throw new TypeError('keylen exceeds maximum length')
      }

      U.copy(T, 0, 0, hLen)

      for (var j = 1; j < iterations; j++) {
        U = crypto.createHmac(digest, password).update(U).digest()

        for (var k = 0; k < hLen; k++) {
          T[k] ^= U[k]
        }
      }

      var destPos = (i - 1) * hLen
      var len = (i == l ? r : hLen)
      T.copy(DK, destPos, 0, len)
    }

    return DK
  }

  return {
    pbkdf2: pbkdf2,
    pbkdf2Sync: pbkdf2Sync
  }
}

}).call(this,require("buffer").Buffer)
},{"buffer":104}],114:[function(require,module,exports){
(function (Buffer){

module.exports = ripemd160



/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
/** @preserve
(c) 2012 by Cédric Mesnil. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// Constants table
var zl = [
    0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
    7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
    3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
    1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
    4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13];
var zr = [
    5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
    6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
    15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
    8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
    12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11];
var sl = [
     11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
    7, 6,   8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
    11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
      11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
    9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ];
var sr = [
    8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
    9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
    9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
    15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
    8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ];

var hl =  [ 0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E];
var hr =  [ 0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000];

var bytesToWords = function (bytes) {
  var words = [];
  for (var i = 0, b = 0; i < bytes.length; i++, b += 8) {
    words[b >>> 5] |= bytes[i] << (24 - b % 32);
  }
  return words;
};

var wordsToBytes = function (words) {
  var bytes = [];
  for (var b = 0; b < words.length * 32; b += 8) {
    bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
  }
  return bytes;
};

var processBlock = function (H, M, offset) {

  // Swap endian
  for (var i = 0; i < 16; i++) {
    var offset_i = offset + i;
    var M_offset_i = M[offset_i];

    // Swap
    M[offset_i] = (
        (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
        (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
    );
  }

  // Working variables
  var al, bl, cl, dl, el;
  var ar, br, cr, dr, er;

  ar = al = H[0];
  br = bl = H[1];
  cr = cl = H[2];
  dr = dl = H[3];
  er = el = H[4];
  // Computation
  var t;
  for (var i = 0; i < 80; i += 1) {
    t = (al +  M[offset+zl[i]])|0;
    if (i<16){
        t +=  f1(bl,cl,dl) + hl[0];
    } else if (i<32) {
        t +=  f2(bl,cl,dl) + hl[1];
    } else if (i<48) {
        t +=  f3(bl,cl,dl) + hl[2];
    } else if (i<64) {
        t +=  f4(bl,cl,dl) + hl[3];
    } else {// if (i<80) {
        t +=  f5(bl,cl,dl) + hl[4];
    }
    t = t|0;
    t =  rotl(t,sl[i]);
    t = (t+el)|0;
    al = el;
    el = dl;
    dl = rotl(cl, 10);
    cl = bl;
    bl = t;

    t = (ar + M[offset+zr[i]])|0;
    if (i<16){
        t +=  f5(br,cr,dr) + hr[0];
    } else if (i<32) {
        t +=  f4(br,cr,dr) + hr[1];
    } else if (i<48) {
        t +=  f3(br,cr,dr) + hr[2];
    } else if (i<64) {
        t +=  f2(br,cr,dr) + hr[3];
    } else {// if (i<80) {
        t +=  f1(br,cr,dr) + hr[4];
    }
    t = t|0;
    t =  rotl(t,sr[i]) ;
    t = (t+er)|0;
    ar = er;
    er = dr;
    dr = rotl(cr, 10);
    cr = br;
    br = t;
  }
  // Intermediate hash value
  t    = (H[1] + cl + dr)|0;
  H[1] = (H[2] + dl + er)|0;
  H[2] = (H[3] + el + ar)|0;
  H[3] = (H[4] + al + br)|0;
  H[4] = (H[0] + bl + cr)|0;
  H[0] =  t;
};

function f1(x, y, z) {
  return ((x) ^ (y) ^ (z));
}

function f2(x, y, z) {
  return (((x)&(y)) | ((~x)&(z)));
}

function f3(x, y, z) {
  return (((x) | (~(y))) ^ (z));
}

function f4(x, y, z) {
  return (((x) & (z)) | ((y)&(~(z))));
}

function f5(x, y, z) {
  return ((x) ^ ((y) |(~(z))));
}

function rotl(x,n) {
  return (x<<n) | (x>>>(32-n));
}

function ripemd160(message) {
  var H = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];

  if (typeof message == 'string')
    message = new Buffer(message, 'utf8');

  var m = bytesToWords(message);

  var nBitsLeft = message.length * 8;
  var nBitsTotal = message.length * 8;

  // Add padding
  m[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
  m[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
      (((nBitsTotal << 8)  | (nBitsTotal >>> 24)) & 0x00ff00ff) |
      (((nBitsTotal << 24) | (nBitsTotal >>> 8))  & 0xff00ff00)
  );

  for (var i=0 ; i<m.length; i += 16) {
    processBlock(H, m, i);
  }

  // Swap endian
  for (var i = 0; i < 5; i++) {
      // Shortcut
    var H_i = H[i];

    // Swap
    H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
          (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
  }

  var digestbytes = wordsToBytes(H);
  return new Buffer(digestbytes);
}



}).call(this,require("buffer").Buffer)
},{"buffer":104}],115:[function(require,module,exports){
module.exports = function (Buffer) {

  //prototype class for hash functions
  function Hash (blockSize, finalSize) {
    this._block = new Buffer(blockSize) //new Uint32Array(blockSize/4)
    this._finalSize = finalSize
    this._blockSize = blockSize
    this._len = 0
    this._s = 0
  }

  Hash.prototype.init = function () {
    this._s = 0
    this._len = 0
  }

  Hash.prototype.update = function (data, enc) {
    if ("string" === typeof data) {
      enc = enc || "utf8"
      data = new Buffer(data, enc)
    }

    var l = this._len += data.length
    var s = this._s = (this._s || 0)
    var f = 0
    var buffer = this._block

    while (s < l) {
      var t = Math.min(data.length, f + this._blockSize - (s % this._blockSize))
      var ch = (t - f)

      for (var i = 0; i < ch; i++) {
        buffer[(s % this._blockSize) + i] = data[i + f]
      }

      s += ch
      f += ch

      if ((s % this._blockSize) === 0) {
        this._update(buffer)
      }
    }
    this._s = s

    return this
  }

  Hash.prototype.digest = function (enc) {
    // Suppose the length of the message M, in bits, is l
    var l = this._len * 8

    // Append the bit 1 to the end of the message
    this._block[this._len % this._blockSize] = 0x80

    // and then k zero bits, where k is the smallest non-negative solution to the equation (l + 1 + k) === finalSize mod blockSize
    this._block.fill(0, this._len % this._blockSize + 1)

    if (l % (this._blockSize * 8) >= this._finalSize * 8) {
      this._update(this._block)
      this._block.fill(0)
    }

    // to this append the block which is equal to the number l written in binary
    // TODO: handle case where l is > Math.pow(2, 29)
    this._block.writeInt32BE(l, this._blockSize - 4)

    var hash = this._update(this._block) || this._hash()

    return enc ? hash.toString(enc) : hash
  }

  Hash.prototype._update = function () {
    throw new Error('_update must be implemented by subclass')
  }

  return Hash
}

},{}],116:[function(require,module,exports){
var exports = module.exports = function (alg) {
  var Alg = exports[alg]
  if(!Alg) throw new Error(alg + ' is not supported (we accept pull requests)')
  return new Alg()
}

var Buffer = require('buffer').Buffer
var Hash   = require('./hash')(Buffer)

exports.sha1 = require('./sha1')(Buffer, Hash)
exports.sha256 = require('./sha256')(Buffer, Hash)
exports.sha512 = require('./sha512')(Buffer, Hash)

},{"./hash":115,"./sha1":117,"./sha256":118,"./sha512":119,"buffer":104}],117:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

var inherits = require('util').inherits

module.exports = function (Buffer, Hash) {

  var A = 0|0
  var B = 4|0
  var C = 8|0
  var D = 12|0
  var E = 16|0

  var W = new (typeof Int32Array === 'undefined' ? Array : Int32Array)(80)

  var POOL = []

  function Sha1 () {
    if(POOL.length)
      return POOL.pop().init()

    if(!(this instanceof Sha1)) return new Sha1()
    this._w = W
    Hash.call(this, 16*4, 14*4)

    this._h = null
    this.init()
  }

  inherits(Sha1, Hash)

  Sha1.prototype.init = function () {
    this._a = 0x67452301
    this._b = 0xefcdab89
    this._c = 0x98badcfe
    this._d = 0x10325476
    this._e = 0xc3d2e1f0

    Hash.prototype.init.call(this)
    return this
  }

  Sha1.prototype._POOL = POOL
  Sha1.prototype._update = function (X) {

    var a, b, c, d, e, _a, _b, _c, _d, _e

    a = _a = this._a
    b = _b = this._b
    c = _c = this._c
    d = _d = this._d
    e = _e = this._e

    var w = this._w

    for(var j = 0; j < 80; j++) {
      var W = w[j] = j < 16 ? X.readInt32BE(j*4)
        : rol(w[j - 3] ^ w[j -  8] ^ w[j - 14] ^ w[j - 16], 1)

      var t = add(
        add(rol(a, 5), sha1_ft(j, b, c, d)),
        add(add(e, W), sha1_kt(j))
      )

      e = d
      d = c
      c = rol(b, 30)
      b = a
      a = t
    }

    this._a = add(a, _a)
    this._b = add(b, _b)
    this._c = add(c, _c)
    this._d = add(d, _d)
    this._e = add(e, _e)
  }

  Sha1.prototype._hash = function () {
    if(POOL.length < 100) POOL.push(this)
    var H = new Buffer(20)
    //console.log(this._a|0, this._b|0, this._c|0, this._d|0, this._e|0)
    H.writeInt32BE(this._a|0, A)
    H.writeInt32BE(this._b|0, B)
    H.writeInt32BE(this._c|0, C)
    H.writeInt32BE(this._d|0, D)
    H.writeInt32BE(this._e|0, E)
    return H
  }

  /*
   * Perform the appropriate triplet combination function for the current
   * iteration
   */
  function sha1_ft(t, b, c, d) {
    if(t < 20) return (b & c) | ((~b) & d);
    if(t < 40) return b ^ c ^ d;
    if(t < 60) return (b & c) | (b & d) | (c & d);
    return b ^ c ^ d;
  }

  /*
   * Determine the appropriate additive constant for the current iteration
   */
  function sha1_kt(t) {
    return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
           (t < 60) ? -1894007588 : -899497514;
  }

  /*
   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
   * to work around bugs in some JS interpreters.
   * //dominictarr: this is 10 years old, so maybe this can be dropped?)
   *
   */
  function add(x, y) {
    return (x + y ) | 0
  //lets see how this goes on testling.
  //  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  //  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  //  return (msw << 16) | (lsw & 0xFFFF);
  }

  /*
   * Bitwise rotate a 32-bit number to the left.
   */
  function rol(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  return Sha1
}

},{"util":151}],118:[function(require,module,exports){

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var inherits = require('util').inherits

module.exports = function (Buffer, Hash) {

  var K = [
      0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
      0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
      0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
      0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
      0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
      0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
      0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
      0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
      0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
      0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
      0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
      0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
      0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
      0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
      0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
      0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
    ]

  var W = new Array(64)

  function Sha256() {
    this.init()

    this._w = W //new Array(64)

    Hash.call(this, 16*4, 14*4)
  }

  inherits(Sha256, Hash)

  Sha256.prototype.init = function () {

    this._a = 0x6a09e667|0
    this._b = 0xbb67ae85|0
    this._c = 0x3c6ef372|0
    this._d = 0xa54ff53a|0
    this._e = 0x510e527f|0
    this._f = 0x9b05688c|0
    this._g = 0x1f83d9ab|0
    this._h = 0x5be0cd19|0

    this._len = this._s = 0

    return this
  }

  function S (X, n) {
    return (X >>> n) | (X << (32 - n));
  }

  function R (X, n) {
    return (X >>> n);
  }

  function Ch (x, y, z) {
    return ((x & y) ^ ((~x) & z));
  }

  function Maj (x, y, z) {
    return ((x & y) ^ (x & z) ^ (y & z));
  }

  function Sigma0256 (x) {
    return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
  }

  function Sigma1256 (x) {
    return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
  }

  function Gamma0256 (x) {
    return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
  }

  function Gamma1256 (x) {
    return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
  }

  Sha256.prototype._update = function(M) {

    var W = this._w
    var a, b, c, d, e, f, g, h
    var T1, T2

    a = this._a | 0
    b = this._b | 0
    c = this._c | 0
    d = this._d | 0
    e = this._e | 0
    f = this._f | 0
    g = this._g | 0
    h = this._h | 0

    for (var j = 0; j < 64; j++) {
      var w = W[j] = j < 16
        ? M.readInt32BE(j * 4)
        : Gamma1256(W[j - 2]) + W[j - 7] + Gamma0256(W[j - 15]) + W[j - 16]

      T1 = h + Sigma1256(e) + Ch(e, f, g) + K[j] + w

      T2 = Sigma0256(a) + Maj(a, b, c);
      h = g; g = f; f = e; e = d + T1; d = c; c = b; b = a; a = T1 + T2;
    }

    this._a = (a + this._a) | 0
    this._b = (b + this._b) | 0
    this._c = (c + this._c) | 0
    this._d = (d + this._d) | 0
    this._e = (e + this._e) | 0
    this._f = (f + this._f) | 0
    this._g = (g + this._g) | 0
    this._h = (h + this._h) | 0

  };

  Sha256.prototype._hash = function () {
    var H = new Buffer(32)

    H.writeInt32BE(this._a,  0)
    H.writeInt32BE(this._b,  4)
    H.writeInt32BE(this._c,  8)
    H.writeInt32BE(this._d, 12)
    H.writeInt32BE(this._e, 16)
    H.writeInt32BE(this._f, 20)
    H.writeInt32BE(this._g, 24)
    H.writeInt32BE(this._h, 28)

    return H
  }

  return Sha256

}

},{"util":151}],119:[function(require,module,exports){
var inherits = require('util').inherits

module.exports = function (Buffer, Hash) {
  var K = [
    0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
    0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
    0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
    0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
    0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
    0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
    0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
    0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
    0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
    0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
    0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
    0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
    0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
    0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
    0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
    0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
    0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
    0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
    0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
    0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
    0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
    0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
    0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
    0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
    0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
    0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
    0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
    0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
    0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
    0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
    0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
    0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
    0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
    0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
    0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
    0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
    0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
    0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
    0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
    0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
  ]

  var W = new Array(160)

  function Sha512() {
    this.init()
    this._w = W

    Hash.call(this, 128, 112)
  }

  inherits(Sha512, Hash)

  Sha512.prototype.init = function () {

    this._a = 0x6a09e667|0
    this._b = 0xbb67ae85|0
    this._c = 0x3c6ef372|0
    this._d = 0xa54ff53a|0
    this._e = 0x510e527f|0
    this._f = 0x9b05688c|0
    this._g = 0x1f83d9ab|0
    this._h = 0x5be0cd19|0

    this._al = 0xf3bcc908|0
    this._bl = 0x84caa73b|0
    this._cl = 0xfe94f82b|0
    this._dl = 0x5f1d36f1|0
    this._el = 0xade682d1|0
    this._fl = 0x2b3e6c1f|0
    this._gl = 0xfb41bd6b|0
    this._hl = 0x137e2179|0

    this._len = this._s = 0

    return this
  }

  function S (X, Xl, n) {
    return (X >>> n) | (Xl << (32 - n))
  }

  function Ch (x, y, z) {
    return ((x & y) ^ ((~x) & z));
  }

  function Maj (x, y, z) {
    return ((x & y) ^ (x & z) ^ (y & z));
  }

  Sha512.prototype._update = function(M) {

    var W = this._w
    var a, b, c, d, e, f, g, h
    var al, bl, cl, dl, el, fl, gl, hl

    a = this._a | 0
    b = this._b | 0
    c = this._c | 0
    d = this._d | 0
    e = this._e | 0
    f = this._f | 0
    g = this._g | 0
    h = this._h | 0

    al = this._al | 0
    bl = this._bl | 0
    cl = this._cl | 0
    dl = this._dl | 0
    el = this._el | 0
    fl = this._fl | 0
    gl = this._gl | 0
    hl = this._hl | 0

    for (var i = 0; i < 80; i++) {
      var j = i * 2

      var Wi, Wil

      if (i < 16) {
        Wi = W[j] = M.readInt32BE(j * 4)
        Wil = W[j + 1] = M.readInt32BE(j * 4 + 4)

      } else {
        var x  = W[j - 15*2]
        var xl = W[j - 15*2 + 1]
        var gamma0  = S(x, xl, 1) ^ S(x, xl, 8) ^ (x >>> 7)
        var gamma0l = S(xl, x, 1) ^ S(xl, x, 8) ^ S(xl, x, 7)

        x  = W[j - 2*2]
        xl = W[j - 2*2 + 1]
        var gamma1  = S(x, xl, 19) ^ S(xl, x, 29) ^ (x >>> 6)
        var gamma1l = S(xl, x, 19) ^ S(x, xl, 29) ^ S(xl, x, 6)

        // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
        var Wi7  = W[j - 7*2]
        var Wi7l = W[j - 7*2 + 1]

        var Wi16  = W[j - 16*2]
        var Wi16l = W[j - 16*2 + 1]

        Wil = gamma0l + Wi7l
        Wi  = gamma0  + Wi7 + ((Wil >>> 0) < (gamma0l >>> 0) ? 1 : 0)
        Wil = Wil + gamma1l
        Wi  = Wi  + gamma1  + ((Wil >>> 0) < (gamma1l >>> 0) ? 1 : 0)
        Wil = Wil + Wi16l
        Wi  = Wi  + Wi16 + ((Wil >>> 0) < (Wi16l >>> 0) ? 1 : 0)

        W[j] = Wi
        W[j + 1] = Wil
      }

      var maj = Maj(a, b, c)
      var majl = Maj(al, bl, cl)

      var sigma0h = S(a, al, 28) ^ S(al, a, 2) ^ S(al, a, 7)
      var sigma0l = S(al, a, 28) ^ S(a, al, 2) ^ S(a, al, 7)
      var sigma1h = S(e, el, 14) ^ S(e, el, 18) ^ S(el, e, 9)
      var sigma1l = S(el, e, 14) ^ S(el, e, 18) ^ S(e, el, 9)

      // t1 = h + sigma1 + ch + K[i] + W[i]
      var Ki = K[j]
      var Kil = K[j + 1]

      var ch = Ch(e, f, g)
      var chl = Ch(el, fl, gl)

      var t1l = hl + sigma1l
      var t1 = h + sigma1h + ((t1l >>> 0) < (hl >>> 0) ? 1 : 0)
      t1l = t1l + chl
      t1 = t1 + ch + ((t1l >>> 0) < (chl >>> 0) ? 1 : 0)
      t1l = t1l + Kil
      t1 = t1 + Ki + ((t1l >>> 0) < (Kil >>> 0) ? 1 : 0)
      t1l = t1l + Wil
      t1 = t1 + Wi + ((t1l >>> 0) < (Wil >>> 0) ? 1 : 0)

      // t2 = sigma0 + maj
      var t2l = sigma0l + majl
      var t2 = sigma0h + maj + ((t2l >>> 0) < (sigma0l >>> 0) ? 1 : 0)

      h  = g
      hl = gl
      g  = f
      gl = fl
      f  = e
      fl = el
      el = (dl + t1l) | 0
      e  = (d + t1 + ((el >>> 0) < (dl >>> 0) ? 1 : 0)) | 0
      d  = c
      dl = cl
      c  = b
      cl = bl
      b  = a
      bl = al
      al = (t1l + t2l) | 0
      a  = (t1 + t2 + ((al >>> 0) < (t1l >>> 0) ? 1 : 0)) | 0
    }

    this._al = (this._al + al) | 0
    this._bl = (this._bl + bl) | 0
    this._cl = (this._cl + cl) | 0
    this._dl = (this._dl + dl) | 0
    this._el = (this._el + el) | 0
    this._fl = (this._fl + fl) | 0
    this._gl = (this._gl + gl) | 0
    this._hl = (this._hl + hl) | 0

    this._a = (this._a + a + ((this._al >>> 0) < (al >>> 0) ? 1 : 0)) | 0
    this._b = (this._b + b + ((this._bl >>> 0) < (bl >>> 0) ? 1 : 0)) | 0
    this._c = (this._c + c + ((this._cl >>> 0) < (cl >>> 0) ? 1 : 0)) | 0
    this._d = (this._d + d + ((this._dl >>> 0) < (dl >>> 0) ? 1 : 0)) | 0
    this._e = (this._e + e + ((this._el >>> 0) < (el >>> 0) ? 1 : 0)) | 0
    this._f = (this._f + f + ((this._fl >>> 0) < (fl >>> 0) ? 1 : 0)) | 0
    this._g = (this._g + g + ((this._gl >>> 0) < (gl >>> 0) ? 1 : 0)) | 0
    this._h = (this._h + h + ((this._hl >>> 0) < (hl >>> 0) ? 1 : 0)) | 0
  }

  Sha512.prototype._hash = function () {
    var H = new Buffer(64)

    function writeInt64BE(h, l, offset) {
      H.writeInt32BE(h, offset)
      H.writeInt32BE(l, offset + 4)
    }

    writeInt64BE(this._a, this._al, 0)
    writeInt64BE(this._b, this._bl, 8)
    writeInt64BE(this._c, this._cl, 16)
    writeInt64BE(this._d, this._dl, 24)
    writeInt64BE(this._e, this._el, 32)
    writeInt64BE(this._f, this._fl, 40)
    writeInt64BE(this._g, this._gl, 48)
    writeInt64BE(this._h, this._hl, 56)

    return H
  }

  return Sha512

}

},{"util":151}],120:[function(require,module,exports){
var pbkdf2Export = require('pbkdf2-compat/pbkdf2')

module.exports = function (crypto, exports) {
  exports = exports || {}

  var exported = pbkdf2Export(crypto)

  exports.pbkdf2 = exported.pbkdf2
  exports.pbkdf2Sync = exported.pbkdf2Sync

  return exports
}

},{"pbkdf2-compat/pbkdf2":113}],121:[function(require,module,exports){
(function (global,Buffer){
(function() {
  var g = ('undefined' === typeof window ? global : window) || {}
  _crypto = (
    g.crypto || g.msCrypto || require('crypto')
  )
  module.exports = function(size) {
    // Modern Browsers
    if(_crypto.getRandomValues) {
      var bytes = new Buffer(size); //in browserify, this is an extended Uint8Array
      /* This will not work in older browsers.
       * See https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
       */
    
      _crypto.getRandomValues(bytes);
      return bytes;
    }
    else if (_crypto.randomBytes) {
      return _crypto.randomBytes(size)
    }
    else
      throw new Error(
        'secure random number generation not supported by this browser\n'+
        'use chrome, FireFox or Internet Explorer 11'
      )
  }
}())

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"buffer":104,"crypto":103}],122:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],123:[function(require,module,exports){
var http = module.exports;
var EventEmitter = require('events').EventEmitter;
var Request = require('./lib/request');
var url = require('url')

http.request = function (params, cb) {
    if (typeof params === 'string') {
        params = url.parse(params)
    }
    if (!params) params = {};
    if (!params.host && !params.port) {
        params.port = parseInt(window.location.port, 10);
    }
    if (!params.host && params.hostname) {
        params.host = params.hostname;
    }

    if (!params.protocol) {
        if (params.scheme) {
            params.protocol = params.scheme + ':';
        } else {
            params.protocol = window.location.protocol;
        }
    }

    if (!params.host) {
        params.host = window.location.hostname || window.location.host;
    }
    if (/:/.test(params.host)) {
        if (!params.port) {
            params.port = params.host.split(':')[1];
        }
        params.host = params.host.split(':')[0];
    }
    if (!params.port) params.port = params.protocol == 'https:' ? 443 : 80;
    
    var req = new Request(new xhrHttp, params);
    if (cb) req.on('response', cb);
    return req;
};

http.get = function (params, cb) {
    params.method = 'GET';
    var req = http.request(params, cb);
    req.end();
    return req;
};

http.Agent = function () {};
http.Agent.defaultMaxSockets = 4;

var xhrHttp = (function () {
    if (typeof window === 'undefined') {
        throw new Error('no window object present');
    }
    else if (window.XMLHttpRequest) {
        return window.XMLHttpRequest;
    }
    else if (window.ActiveXObject) {
        var axs = [
            'Msxml2.XMLHTTP.6.0',
            'Msxml2.XMLHTTP.3.0',
            'Microsoft.XMLHTTP'
        ];
        for (var i = 0; i < axs.length; i++) {
            try {
                var ax = new(window.ActiveXObject)(axs[i]);
                return function () {
                    if (ax) {
                        var ax_ = ax;
                        ax = null;
                        return ax_;
                    }
                    else {
                        return new(window.ActiveXObject)(axs[i]);
                    }
                };
            }
            catch (e) {}
        }
        throw new Error('ajax not supported in this browser')
    }
    else {
        throw new Error('ajax not supported in this browser');
    }
})();

http.STATUS_CODES = {
    100 : 'Continue',
    101 : 'Switching Protocols',
    102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
    200 : 'OK',
    201 : 'Created',
    202 : 'Accepted',
    203 : 'Non-Authoritative Information',
    204 : 'No Content',
    205 : 'Reset Content',
    206 : 'Partial Content',
    207 : 'Multi-Status',               // RFC 4918
    300 : 'Multiple Choices',
    301 : 'Moved Permanently',
    302 : 'Moved Temporarily',
    303 : 'See Other',
    304 : 'Not Modified',
    305 : 'Use Proxy',
    307 : 'Temporary Redirect',
    400 : 'Bad Request',
    401 : 'Unauthorized',
    402 : 'Payment Required',
    403 : 'Forbidden',
    404 : 'Not Found',
    405 : 'Method Not Allowed',
    406 : 'Not Acceptable',
    407 : 'Proxy Authentication Required',
    408 : 'Request Time-out',
    409 : 'Conflict',
    410 : 'Gone',
    411 : 'Length Required',
    412 : 'Precondition Failed',
    413 : 'Request Entity Too Large',
    414 : 'Request-URI Too Large',
    415 : 'Unsupported Media Type',
    416 : 'Requested Range Not Satisfiable',
    417 : 'Expectation Failed',
    418 : 'I\'m a teapot',              // RFC 2324
    422 : 'Unprocessable Entity',       // RFC 4918
    423 : 'Locked',                     // RFC 4918
    424 : 'Failed Dependency',          // RFC 4918
    425 : 'Unordered Collection',       // RFC 4918
    426 : 'Upgrade Required',           // RFC 2817
    428 : 'Precondition Required',      // RFC 6585
    429 : 'Too Many Requests',          // RFC 6585
    431 : 'Request Header Fields Too Large',// RFC 6585
    500 : 'Internal Server Error',
    501 : 'Not Implemented',
    502 : 'Bad Gateway',
    503 : 'Service Unavailable',
    504 : 'Gateway Time-out',
    505 : 'HTTP Version Not Supported',
    506 : 'Variant Also Negotiates',    // RFC 2295
    507 : 'Insufficient Storage',       // RFC 4918
    509 : 'Bandwidth Limit Exceeded',
    510 : 'Not Extended',               // RFC 2774
    511 : 'Network Authentication Required' // RFC 6585
};
},{"./lib/request":124,"events":122,"url":149}],124:[function(require,module,exports){
var Stream = require('stream');
var Response = require('./response');
var Base64 = require('Base64');
var inherits = require('inherits');

var Request = module.exports = function (xhr, params) {
    var self = this;
    self.writable = true;
    self.xhr = xhr;
    self.body = [];
    
    self.uri = (params.protocol || 'http:') + '//'
        + params.host
        + (params.port ? ':' + params.port : '')
        + (params.path || '/')
    ;
    
    if (typeof params.withCredentials === 'undefined') {
        params.withCredentials = true;
    }

    try { xhr.withCredentials = params.withCredentials }
    catch (e) {}
    
    if (params.responseType) try { xhr.responseType = params.responseType }
    catch (e) {}
    
    xhr.open(
        params.method || 'GET',
        self.uri,
        true
    );

    xhr.onerror = function(event) {
        self.emit('error', new Error('Network error'));
    };

    self._headers = {};
    
    if (params.headers) {
        var keys = objectKeys(params.headers);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (!self.isSafeRequestHeader(key)) continue;
            var value = params.headers[key];
            self.setHeader(key, value);
        }
    }
    
    if (params.auth) {
        //basic auth
        this.setHeader('Authorization', 'Basic ' + Base64.btoa(params.auth));
    }

    var res = new Response;
    res.on('close', function () {
        self.emit('close');
    });
    
    res.on('ready', function () {
        self.emit('response', res);
    });

    res.on('error', function (err) {
        self.emit('error', err);
    });
    
    xhr.onreadystatechange = function () {
        // Fix for IE9 bug
        // SCRIPT575: Could not complete the operation due to error c00c023f
        // It happens when a request is aborted, calling the success callback anyway with readyState === 4
        if (xhr.__aborted) return;
        res.handle(xhr);
    };
};

inherits(Request, Stream);

Request.prototype.setHeader = function (key, value) {
    this._headers[key.toLowerCase()] = value
};

Request.prototype.getHeader = function (key) {
    return this._headers[key.toLowerCase()]
};

Request.prototype.removeHeader = function (key) {
    delete this._headers[key.toLowerCase()]
};

Request.prototype.write = function (s) {
    this.body.push(s);
};

Request.prototype.destroy = function (s) {
    this.xhr.__aborted = true;
    this.xhr.abort();
    this.emit('close');
};

Request.prototype.end = function (s) {
    if (s !== undefined) this.body.push(s);

    var keys = objectKeys(this._headers);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = this._headers[key];
        if (isArray(value)) {
            for (var j = 0; j < value.length; j++) {
                this.xhr.setRequestHeader(key, value[j]);
            }
        }
        else this.xhr.setRequestHeader(key, value)
    }

    if (this.body.length === 0) {
        this.xhr.send('');
    }
    else if (typeof this.body[0] === 'string') {
        this.xhr.send(this.body.join(''));
    }
    else if (isArray(this.body[0])) {
        var body = [];
        for (var i = 0; i < this.body.length; i++) {
            body.push.apply(body, this.body[i]);
        }
        this.xhr.send(body);
    }
    else if (/Array/.test(Object.prototype.toString.call(this.body[0]))) {
        var len = 0;
        for (var i = 0; i < this.body.length; i++) {
            len += this.body[i].length;
        }
        var body = new(this.body[0].constructor)(len);
        var k = 0;
        
        for (var i = 0; i < this.body.length; i++) {
            var b = this.body[i];
            for (var j = 0; j < b.length; j++) {
                body[k++] = b[j];
            }
        }
        this.xhr.send(body);
    }
    else if (isXHR2Compatible(this.body[0])) {
        this.xhr.send(this.body[0]);
    }
    else {
        var body = '';
        for (var i = 0; i < this.body.length; i++) {
            body += this.body[i].toString();
        }
        this.xhr.send(body);
    }
};

// Taken from http://dxr.mozilla.org/mozilla/mozilla-central/content/base/src/nsXMLHttpRequest.cpp.html
Request.unsafeHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "cookie",
    "cookie2",
    "content-transfer-encoding",
    "date",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "user-agent",
    "via"
];

Request.prototype.isSafeRequestHeader = function (headerName) {
    if (!headerName) return false;
    return indexOf(Request.unsafeHeaders, headerName.toLowerCase()) === -1;
};

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var indexOf = function (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (xs[i] === x) return i;
    }
    return -1;
};

var isXHR2Compatible = function (obj) {
    if (typeof Blob !== 'undefined' && obj instanceof Blob) return true;
    if (typeof ArrayBuffer !== 'undefined' && obj instanceof ArrayBuffer) return true;
    if (typeof FormData !== 'undefined' && obj instanceof FormData) return true;
};

},{"./response":125,"Base64":126,"inherits":128,"stream":147}],125:[function(require,module,exports){
var Stream = require('stream');
var util = require('util');

var Response = module.exports = function (res) {
    this.offset = 0;
    this.readable = true;
};

util.inherits(Response, Stream);

var capable = {
    streaming : true,
    status2 : true
};

function parseHeaders (res) {
    var lines = res.getAllResponseHeaders().split(/\r?\n/);
    var headers = {};
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === '') continue;
        
        var m = line.match(/^([^:]+):\s*(.*)/);
        if (m) {
            var key = m[1].toLowerCase(), value = m[2];
            
            if (headers[key] !== undefined) {
            
                if (isArray(headers[key])) {
                    headers[key].push(value);
                }
                else {
                    headers[key] = [ headers[key], value ];
                }
            }
            else {
                headers[key] = value;
            }
        }
        else {
            headers[line] = true;
        }
    }
    return headers;
}

Response.prototype.getResponse = function (xhr) {
    var respType = String(xhr.responseType).toLowerCase();
    if (respType === 'blob') return xhr.responseBlob || xhr.response;
    if (respType === 'arraybuffer') return xhr.response;
    return xhr.responseText;
}

Response.prototype.getHeader = function (key) {
    return this.headers[key.toLowerCase()];
};

Response.prototype.handle = function (res) {
    if (res.readyState === 2 && capable.status2) {
        try {
            this.statusCode = res.status;
            this.headers = parseHeaders(res);
        }
        catch (err) {
            capable.status2 = false;
        }
        
        if (capable.status2) {
            this.emit('ready');
        }
    }
    else if (capable.streaming && res.readyState === 3) {
        try {
            if (!this.statusCode) {
                this.statusCode = res.status;
                this.headers = parseHeaders(res);
                this.emit('ready');
            }
        }
        catch (err) {}
        
        try {
            this._emitData(res);
        }
        catch (err) {
            capable.streaming = false;
        }
    }
    else if (res.readyState === 4) {
        if (!this.statusCode) {
            this.statusCode = res.status;
            this.emit('ready');
        }
        this._emitData(res);
        
        if (res.error) {
            this.emit('error', this.getResponse(res));
        }
        else this.emit('end');
        
        this.emit('close');
    }
};

Response.prototype._emitData = function (res) {
    var respBody = this.getResponse(res);
    if (respBody.toString().match(/ArrayBuffer/)) {
        this.emit('data', new Uint8Array(respBody, this.offset));
        this.offset = respBody.byteLength;
        return;
    }
    if (respBody.length > this.offset) {
        this.emit('data', respBody.slice(this.offset));
        this.offset = respBody.length;
    }
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

},{"stream":147,"util":151}],126:[function(require,module,exports){
;(function () {

  var object = typeof exports != 'undefined' ? exports : this; // #8: web workers
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  function InvalidCharacterError(message) {
    this.message = message;
  }
  InvalidCharacterError.prototype = new Error;
  InvalidCharacterError.prototype.name = 'InvalidCharacterError';

  // encoder
  // [https://gist.github.com/999166] by [https://github.com/nignag]
  object.btoa || (
  object.btoa = function (input) {
    for (
      // initialize result and counter
      var block, charCode, idx = 0, map = chars, output = '';
      // if the next input index does not exist:
      //   change the mapping table to "="
      //   check if d has no fractional digits
      input.charAt(idx | 0) || (map = '=', idx % 1);
      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = input.charCodeAt(idx += 3/4);
      if (charCode > 0xFF) {
        throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  });

  // decoder
  // [https://gist.github.com/1020396] by [https://github.com/atk]
  object.atob || (
  object.atob = function (input) {
    input = input.replace(/=+$/, '');
    if (input.length % 4 == 1) {
      throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = input.charAt(idx++);
      // character found in table? initialize bit storage and add its ascii value;
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = chars.indexOf(buffer);
    }
    return output;
  });

}());

},{}],127:[function(require,module,exports){
var http = require('http');

var https = module.exports;

for (var key in http) {
    if (http.hasOwnProperty(key)) https[key] = http[key];
};

https.request = function (params, cb) {
    if (!params) params = {};
    params.scheme = 'https';
    return http.request.call(this, params, cb);
}

},{"http":123}],128:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],129:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],130:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":131}],131:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],132:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],133:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],134:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],135:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":133,"./encode":134}],136:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":137}],137:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require('_process'))
},{"./_stream_readable":139,"./_stream_writable":141,"_process":131,"core-util-is":142,"inherits":128}],138:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":140,"core-util-is":142,"inherits":128}],139:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;


/*<replacement>*/
var debug = require('util');
if (debug && debug.debuglog) {
  debug = debug.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/


util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.readableObjectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  var Duplex = require('./_stream_duplex');

  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (util.isString(chunk) && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (util.isNullOrUndefined(chunk)) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      if (!addToFront)
        state.reading = false;

      // if we want the data now, just emit it.
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit('data', chunk);
        stream.read(0);
      } else {
        // update the buffer info.
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);

        if (state.needReadable)
          emitReadable(stream);
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (isNaN(n) || util.isNull(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (!util.isNumber(n) || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended)
      endReadable(this);
    else
      emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (util.isNull(ret)) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0)
    endReadable(this);

  if (!util.isNull(ret))
    this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync)
      process.nextTick(function() {
        emitReadable_(stream);
      });
    else
      emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain &&
        (!dest._writableState || dest._writableState.needDrain))
      ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      debug('false write response, pause',
            src._readableState.awaitDrain);
      src._readableState.awaitDrain++;
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain)
      state.awaitDrain--;
    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        var self = this;
        process.nextTick(function() {
          debug('readable nexttick read 0');
          self.read(0);
        });
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    if (!state.reading) {
      debug('resume read 0');
      this.read(0);
    }
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(function() {
      resume_(stream, state);
    });
  }
}

function resume_(stream, state) {
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading)
    stream.read(0);
}

Readable.prototype.pause = function() {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    debug('wrapped data');
    if (state.decoder)
      chunk = state.decoder.write(chunk);
    if (!chunk || !state.objectMode && !chunk.length)
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))
},{"./_stream_duplex":137,"_process":131,"buffer":104,"core-util-is":142,"events":122,"inherits":128,"isarray":129,"stream":147,"string_decoder/":148,"util":103}],140:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (!util.isNullOrUndefined(data))
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('prefinish', function() {
    if (util.isFunction(this._flush))
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":137,"core-util-is":142,"inherits":128}],141:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.writableObjectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (util.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (!util.isFunction(cb))
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function() {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function() {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing &&
        !state.corked &&
        !state.finished &&
        !state.bufferProcessing &&
        state.buffer.length)
      clearBuffer(this, state);
  }
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      util.isString(chunk)) {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (util.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing || state.corked)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, false, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev)
    stream._writev(chunk, state.onwrite);
  else
    stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      state.pendingcb--;
      cb(er);
    });
  else {
    state.pendingcb--;
    cb(er);
  }

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished &&
        !state.corked &&
        !state.bufferProcessing &&
        state.buffer.length) {
      clearBuffer(stream, state);
    }

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  if (stream._writev && state.buffer.length > 1) {
    // Fast case, write everything using _writev()
    var cbs = [];
    for (var c = 0; c < state.buffer.length; c++)
      cbs.push(state.buffer[c].callback);

    // count the one we are adding, as well.
    // TODO(isaacs) clean this up
    state.pendingcb++;
    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
      for (var i = 0; i < cbs.length; i++) {
        state.pendingcb--;
        cbs[i](err);
      }
    });

    // Clear buffer
    state.buffer = [];
  } else {
    // Slow case, write chunks one-by-one
    for (var c = 0; c < state.buffer.length; c++) {
      var entry = state.buffer[c];
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);

      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        c++;
        break;
      }
    }

    if (c < state.buffer.length)
      state.buffer = state.buffer.slice(c);
    else
      state.buffer.length = 0;
  }

  state.bufferProcessing = false;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));

};

Writable.prototype._writev = null;

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (util.isFunction(chunk)) {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (!util.isNullOrUndefined(chunk))
    this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else
      prefinish(stream, state);
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'))
},{"./_stream_duplex":137,"_process":131,"buffer":104,"core-util-is":142,"inherits":128,"stream":147}],142:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)
},{"buffer":104}],143:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":138}],144:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = require('stream');
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":137,"./lib/_stream_passthrough.js":138,"./lib/_stream_readable.js":139,"./lib/_stream_transform.js":140,"./lib/_stream_writable.js":141,"stream":147}],145:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":140}],146:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":141}],147:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":122,"inherits":128,"readable-stream/duplex.js":136,"readable-stream/passthrough.js":143,"readable-stream/readable.js":144,"readable-stream/transform.js":145,"readable-stream/writable.js":146}],148:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":104}],149:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":132,"querystring":135}],150:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],151:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":150,"_process":131,"inherits":128}],"cylon-firmata":[function(require,module,exports){
/*
 * cylon-firmata
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

'use strict';

var Cylon = require("cylon");

var Adaptor = require("./firmata");

var GPIO = require("cylon-gpio"),
    I2C = require("cylon-i2c");

module.exports = {
  adaptor: function(args) {
    return new Adaptor(args);
  },

  register: function(robot) {
    Cylon.Logger.debug("Registering Firmata adaptor for " + robot.name);
    robot.registerAdaptor('cylon-firmata', 'firmata');

    GPIO.register(robot);
    I2C.register(robot);
  }
};

},{"./firmata":2,"cylon":46,"cylon-gpio":undefined,"cylon-i2c":undefined}],"cylon-gpio":[function(require,module,exports){
/*
 * cylon-gpio
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require('cylon');

var Drivers = {
  'analogSensor': require('./analog-sensor'),
  'button': require('./button'),
  'continuous-servo': require('./continuous-servo'),
  'led': require('./led'),
  'makey-button': require('./makey-button'),
  'maxbotix': require('./maxbotix'),
  'motor': require('./motor'),
  'servo': require('./servo'),
  'ir-range-sensor': require('./ir-range-sensor'),
  'direct-pin': require('./direct-pin')
};

module.exports = {
  driver: function(opts) {
    for (var d in Drivers) {
      if (opts.name === d) {
        return new Drivers[d](opts);
      }
    }

    return null;
  },

  register: function(robot) {
    for (var d in Drivers) {
      robot.registerDriver('cylon-gpio', d);
    }
  }
};

},{"./analog-sensor":22,"./button":23,"./continuous-servo":24,"./direct-pin":25,"./ir-range-sensor":26,"./led":27,"./makey-button":28,"./maxbotix":29,"./motor":30,"./servo":31,"cylon":46}],"cylon-i2c":[function(require,module,exports){
/*
 * cylon-gpio
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/
'use strict';

var Cylon = require('cylon');
var BlinkM = require('./blinkm');
var Hmc6352 = require('./hmc6352');
var Mpl115A2 = require('./mpl115a2');
var Bmp180 = require('./bmp180');
var Mpu6050 = require('./mpu6050');
var LCD = require('./lcd');
var LSM9DS0G = require('./lsm9ds0g');
var LSM9DS0XM = require('./lsm9ds0xm');

module.exports = {
  driver: function(opts) {
    switch (opts.name) {
      case 'blinkm':
        return new BlinkM(opts);
      case 'hmc6352':
        return new Hmc6352(opts);
      case 'mpl115a2':
        return new Mpl115A2(opts);
      case 'bmp180':
        return new Bmp180(opts);
      case 'mpu6050':
        return new Mpu6050(opts);
      case 'lcd':
        return new LCD(opts);
      case 'lsm9ds0g':
        return new LSM9DS0G(opts);
      case 'lsm9ds0xm':
        return new LSM9DS0XM(opts);
      default:
        return null;
    }
  },

  register: function(robot) {
    Cylon.Logger.debug("Registering i2c BlinkM driver for " + robot.name);
    robot.registerDriver('cylon-i2c', 'blinkm');

    Cylon.Logger.debug("Registering i2c HMC6352 driver for " + robot.name);
    robot.registerDriver('cylon-i2c', 'hmc6352');

    Cylon.Logger.debug("Registering i2c MPL115A2 driver for " + robot.name);
    robot.registerDriver('cylon-i2c', 'mpl115a2');

    Cylon.Logger.debug("Registering i2c BMP180 driver for " + robot.name);
    robot.registerDriver('cylon-i2c', 'bmp180');

    Cylon.Logger.debug("Registering i2c MPU6050 driver for " + robot.name);
    robot.registerDriver('cylon-i2c', 'mpu6050');

    Cylon.Logger.debug("Registering i2c LCD driver for " + robot.name);
    robot.registerDriver('cylon-i2c', 'lcd');

    Cylon.Logger.debug("Registering i2c LSM9DS0G driver for " + robot.name);
    robot.registerDriver('cylon-i2c', 'lsm9ds0g');

    Cylon.Logger.debug("Registering i2c LSM9DS0XM driver for " + robot.name);
    robot.registerDriver('cylon-i2c', 'lsm9ds0xm');
  }
};

},{"./blinkm":32,"./bmp180":33,"./hmc6352":34,"./lcd":35,"./lsm9ds0g":36,"./lsm9ds0xm":37,"./mpl115a2":38,"./mpu6050":39,"cylon":46}]},{},[100]);
