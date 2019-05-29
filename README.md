# Wait-file

Wait for file resource(s) to become available in NodeJS.

## Installation

```bash
npm install wait-file
```

### Node.js API usage

```javascript
var waitFile = require('wait-file');
var opts = {
  resources: [
    'file1',
    '/path/to/file2'
  ],
  delay: 1000, // initial delay in ms, default 0
  interval: 100, // poll interval in ms, default 250ms
  timeout: 30000, // timeout in ms, default Infinity
  tcpTimeout: 1000, // tcp timeout in ms, default 300ms
  window: 1000, // stabilization time in ms, default 750ms
};

// Usage with callback function
waitOn(opts, function (err) {
  if (err) { return handleError(err); }
  // once here, all resources are available
});

// Usage with promises
waitOn(opts)
  .then(function () {
    // once here, all resources are available
  })
  .catch(function (err) {
    handleError(err);
  });

// Usage with async await
try {
  await waitOn(opts);
  // once here, all resources are available
} catch (err) {
  handleError(err);
}
```

waitFile(opts, [cb]) - function which triggers resource checks

 - opts.resources - array of string file resource(s) to wait for. 
 - opts.delay - optional initial delay in ms, default 0
 - opts.interval - optional poll resource interval in ms, default 250ms
 - opts.log - optional flag which outputs to stdout, remaining resources waited on and when complete or errored
 - opts.reverse - optional flag to reverse operation so checks are for resources being NOT available, default false
 - opts.timeout - optional timeout in ms, default Infinity. Aborts with error.
 - opts.verbose - optional flag which outputs debug output, default false
 - opts.window - optional stabilization time in ms, default 750ms. Waits this amount of time for file sizes to stabilize or other resource availability to remain unchanged.
 - cb(err) - if err is provided then, resource checks did not succeed
