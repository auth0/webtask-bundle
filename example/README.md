# Example using `wt-bundle`

This example represents a simple express server that is structured so that:

1. Your core server logic requires no changes to run on https://webtask.io or as a stand-alone server
2. When building for the webtask platform, any dependencies not available on the platform will be bundled for you

## Usage

### As a standalone server

```bash
npm start
```

### As a webtask

**Note:** As a pre-requisite to running this example as a webtask, you must have [installed and configured wt-cli](https://github.com/auth0/wt-cli#setup).

```bash
npm run bundle -- --prod --output ./build/webtask.js
wt create --name wt-bundle ./build/webtask.js

# Webtask url will be printed out. Your code is now running as a webtask at that url.
```