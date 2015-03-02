BIN := ./node_modules/.bin/
.PHONY: build

build:
	@echo "Building script.js with Browserify"
	$(BIN)browserify -r cylon-gpio -r cylon-i2c -r cylon-firmata script.js > browser.js
