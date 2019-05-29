import fs from 'fs-extra';
import Joi from '@hapi/joi';
import Rx from 'rx';

export interface Opts {
  resources: string[];
  delay?: number;
  interval?: number;
  log?: boolean;
  reverse?: boolean;
  timeout?: number;
  verbose?: boolean;
  window?: number;
}

interface File {
  val: number;
  data: Stats;
}

interface Stats {
  size: number;
  [key: string]: any;
}

interface Value {
  [resource: string]: number;
}

const WAIT_FILE_SCHEMA = Joi.object().keys({
  resources: Joi.array()
    .items(Joi.string().required())
    .required(),
  delay: Joi.number()
    .integer()
    .min(0)
    .default(0),
  interval: Joi.number()
    .integer()
    .min(0)
    .default(250),
  log: Joi.boolean().default(false),
  reverse: Joi.boolean().default(false),
  timeout: Joi.number()
    .integer()
    .min(0)
    .default(Infinity),
  verbose: Joi.boolean().default(false),
  window: Joi.number()
    .integer()
    .min(0)
    .default(750),
});

function waitFileImpl(oldOpts: Opts, cb: null | ((err?: Error) => any)) {
  const validResult = Joi.validate(oldOpts, WAIT_FILE_SCHEMA);
  if (validResult.error && cb) {
    return cb(validResult.error);
  }
  const opts = validResult.value as Required<Opts>;

  // it needs to be at least interval
  if (opts.window < opts.interval) {
    opts.window = opts.interval;
  }

  const output = opts.verbose ? console.log.bind(console) : function() {};

  const log = opts.log ? console.log.bind(console) : function() {};

  // the resources last known to be waiting for
  let lastWaitForOutput: string;

  let timeoutTimer: null | NodeJS.Timeout = null;
  if (opts.timeout !== Infinity) {
    timeoutTimer = setTimeout(function() {
      log(
        'wait-file(%s) timed out waiting for: %s; exiting with error',
        process.pid,
        lastWaitForOutput
      );
      cb && cb(new Error('Timeout'));
    }, opts.timeout);
  }

  function cleanup(err?: Error) {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
    if (cb) {
      cb(err);
      cb = null;
    }
  }

  function createFile(file: string): Rx.Observable<File> {
    const fstat = Rx.Observable.fromNodeCallback(fs.stat);
    const source = (<unknown>fstat(file)) as Rx.Observable<Stats>;
    const fakeStat = Rx.Observable.just({ size: -1 });
    return Rx.Observable.catch(source, fakeStat).map(function(stat) {
      return {
        val: stat.size, // key comparator used
        data: stat, // additional data for debugging
      };
    });
  }

  /* Stability checking occurs by using an Rx window,
     It waits until all of the vals from the resources are >=0,
     then it waits for a window which has no changes
     (duplicate outputs are filtered by distinctUntilChanged)
  */
  let lastValues: Value | null = null;
  const src = Rx.Observable.timer(opts.delay, opts.interval)
    .concatMap(() => {
      return Rx.Observable.from(opts.resources)
        .concatMap(
          function(resource: string) {
            return createFile(resource);
          },
          function(resource: string, obj: File) {
            return { resource: resource, val: obj.val, data: obj.data };
          }
        )
        .reduce(function(acc: Value, x) {
          acc[x.resource] = x.val;
          return acc;
        }, {});
    })
    .map(function(values: Value) {
      lastValues = values; // save lastValues for later ref
      return values;
    })
    .distinctUntilChanged()
    .windowWithTime(opts.window);

  function lastValuesAllAvailable(): boolean {
    if (!lastValues) {
      return false;
    }
    var notReady = opts.resources.filter(function(k) {
      var lastValue = lastValues && lastValues[k];
      var result = typeof lastValue !== 'number' || lastValue < 0;
      return opts.reverse ? !result : result;
    });

    // only output when changes
    var notReadyString = notReady.join(', ');
    if (notReadyString && notReadyString !== lastWaitForOutput) {
      log('wait-file(%s) waiting for: %s', process.pid, notReadyString);
      lastWaitForOutput = notReadyString;
    }

    return !notReady.length;
  }

  let subsc = src.subscribe(
    function(child) {
      let childSub = child.toArray().subscribe(
        function(x) {
          output('child next', x);
          if (lastValuesAllAvailable() && !x.length) {
            output('stabilized');
            log(
              'wait-file(%s) exiting successfully found all: %s',
              process.pid,
              opts.resources.join(', ')
            );
            childSub.dispose();
            subsc.dispose();
            cleanup();
          }
        },
        function(err) {
          output('child err', err);
        },
        function() {
          output('child complete');
        }
      );
    },
    function(err) {
      output('err: ', err);
      log('wait-file(%s) exiting with error', process.pid, err);
      cleanup(err);
    },
    function() {
      output('complete');
      cleanup();
    }
  );
}

function waitFile(opts: Opts, cb?: (err?: Error) => any) {
  if (cb && cb !== undefined) {
    return waitFileImpl(opts, cb);
  } else {
    return new Promise((resolve, reject) => {
      waitFileImpl(opts, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

export default waitFile;
