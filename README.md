# Wait-file

Wait for file resource(s) to become available in NodeJS.

## Installation

```bash
npm install wait-file
```

### Node.js API usage

waitFile(opts, [cb]) - function which triggers resource checks
 - opts - see below example
 - cb(err) - if err is provided then, resource checks did not succeed

```javascript
var waitFile = require('wait-file');
var opts = {
  resources: [
    'file1',
    '/path/to/file2'
  ],
  delay: 0, // initial delay in ms
  interval: 250, // poll interval in ms
  log: false, // outputs to stdout, remaining resources waited on and when complete or errored
  reverse: false, // resources being NOT available,
  timeout: Infinity, // timeout in ms, default Infinity
  verbose: false, // optional flag which outputs debug output
  window: 1000, // stabilization time in ms, default 750ms
};

// Usage with callback function
waitFile(opts, function (err) {
  if (err) { return handleError(err); }
  // once here, all resources are available
});

// Usage with promises
waitFile(opts)
  .then(function () {
    // once here, all resources are available
  })
  .catch(function (err) {
    handleError(err);
  });

// Usage with async await
try {
  await waitFile(opts);
  // once here, all resources are available
} catch (err) {
  handleError(err);
}
```
