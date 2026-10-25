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

These launch a real browser through the tripwire CLI and leave it open, so you can use the browser's own devtools. As they watch for changes you can leave one running as you edit; a compile error can still close the browser.

Terminating the debug session can require several CTRL-C's in the terminal window used to start the debug session.

	```
	npm run debug:browser
	npm run debug:worker
	```

Both are also available per package (`cd core && npm run debug:browser`, and the same in `shim/chai`).

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
