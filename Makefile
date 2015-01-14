.PHONY: serve build

serve:
	@node ./bin/serve

build:
	@browserify -r cylon-gpio -r cylon-i2c -r cylon-firmata script.js > ./js/robot.js
