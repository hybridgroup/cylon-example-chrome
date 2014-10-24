# Cylon.JS - Browserify Example

This repo contains an example of running Cylon.JS in the browser, using the [Browserify][] tool and a Chrome App to allow for serialport access.

It includes a custom Cylon logger to log messages directly to the page.

**Note:** - currently, the `firmata` module is not compatible with Browserify, and this example will not work until a new release is cut.

[Browserify]: http://browserify.org

## Building

This example is built with Browserify.
To write your robot's code, modify `script.js`.

Then, when you want to run it in the browser, you need to run it through Browserify.

First, install dependencies:

    $ npm install

If you don't have it installed already, install Browserify through NPM:

    $ npm install -g browserify

Then, use it to compile your Cylon code:

    $ browserify -r cylon-gpio -r cylon-i2c -r cylon-firmata script.js > ./js/robot.js

This command can also be run with `npm build`.

## Running

To run your Chrome app, load it as an unpacked extension in Chrome.
This .video explains the process:

<a href="http://share.stwrt.ca/chrome-app-demo.mp4" target="_blank">
  <img src="http://i.imgur.com/2jqg0CN.jpg">
</a>

## More modules

If you start using additional Cylon modules, such as `cylon-leapmotion`, etc., you'll need to manually specify them to browserify when building your robot.

    $ browserify -r cylon-leapmotion script.js > js/script.js

This is due to the dynamic loading of modules Cylon does, which Browserify cannot automatically detect.

## Running

The example includes a small Node webserver, in the `bin` directory.

    $ ./bin/serve

The server can also be run with `npm start`.

After this is started, you can visit `http://localhost:3000/` to see your Robot
in action.
