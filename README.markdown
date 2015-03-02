# Cylon.JS - Browserify Example

This repo contains an example of running Cylon.JS in the browser, using the [Browserify][] tool and a Chrome App to allow for serialport access.

It includes a custom Cylon logger to log messages directly to the page.

[Browserify]: http://browserify.org

## Building

This example is built with Browserify.
To write your robot's code, modify `script.js`.

Then, when you want to run it in the browser, you need to run it through Browserify.

First, install dependencies:

    $ npm install

Then, use browserify to compile your Cylon code:

    $ ./node_modules/.bin/browserify -r cylon-gpio -r cylon-i2c -r cylon-firmata script.js > ./js/robot.js

This command can also be run with `make`.

## Running

To run your Chrome app, load it as an unpacked extension in Chrome.
This .video explains the process:

<a href="http://share.stwrt.ca/chrome-app-demo.mp4" target="_blank">
  <img src="http://i.imgur.com/2jqg0CN.jpg">
</a>

## More modules

If you start using additional Cylon modules, such as `cylon-leapmotion`, etc., you'll need to manually specify them to browserify when building your robot.

    $ ./node_modules/.bin/browserify -r cylon-leapmotion script.js > js/script.js

This is due to the dynamic loading of modules Cylon does, which Browserify cannot automatically detect.
