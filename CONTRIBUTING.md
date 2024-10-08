## Contributing

Welcome and thank you for your interest in contributing to Grunt Plugins.

If making a large change we request that you open an [issue][GitHubIssue] first.

[Code of Conduct](https://github.com/nevware21/tripwire/blob/main/CODE_OF_CONDUCT.md)

[Contributing Guide](https://github.com/nevware21/tripwire/blob/main/CONTRIBUTING.md)

[GitHub Issues](https://github.com/nevware21/tripwire/issues)

## Clone and setup

1. Clone the repository and create a new branch
	```
	git clone https://github.com/nevware21/tripwire.git
	```

2. Install all dependencies
	```
	npm install
	```

3. Build
	```
	npm run rebuild 
	```
	or
	```
	rush rebuild
	```

4. Run Tests
    ```
	npm run test
    ```
	or
	```
	rush test
	```

5. Generate typedoc
    
	Occurs as part of a full rebuild
	```
	npm run docs
	```

6. Debugging failing tests in a browser

This runs karma in "watch" mode to avoid the browser automatically closing, to debug process the Debug button in the corner.

As this uses watch mode you can also just leave this running as you make code changes, however, if there is a compile error this can cause the browser to be closed.

Terminating the debug session can require several CTRL-C's in the terminal window used to start the debug session.

	```
	npm run test:debug
	```

By default this is configured to run using chromiumn based Edge, you can change the `process.env.CHROME_BIN = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";` at the top of the `karma.debug.conf.js` file to use a different chromium based browser.


## Build, test and generate typedoc docs

This will build and run all of the tests in node and in headless chromium.

	```
	npm run rebuild
	```
	or
	```
	rush rebuild
	```

If you are changing package versions or adding/removing any package dependencies, run> **rush update --recheck --purge --full** && **npm install** before building to ensure that all new dependencies are updated and installed. Please check-in any files that change under docs\ folder.
