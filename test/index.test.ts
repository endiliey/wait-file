import fs from 'fs-extra';
import temp from 'temp';
import path from 'path';
import { waitFile, Opts } from '../src';

temp.track(); // cleanup files on exit

describe('wait-file', () => {
  it('should return error when no resources are provided', () => {
    const opts = {} as Opts;
    waitFile(opts, function(err) {
      expect(err).toMatchInlineSnapshot(
        `[ValidationError: child "resources" fails because ["resources" is required]]`
      );
    });
  });

  it('should return error when opts is null', () => {
    const opts = (<unknown>null) as Opts;
    waitFile(opts, function(err) {
      expect(err).toMatchInlineSnapshot(
        `[ValidationError: "value" must be an object]`
      );
    });
  });

  it('should succeed when file resources are available', done => {
    temp.mkdir({}, (err, dirPath) => {
      const opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
      };
      fs.writeFileSync(opts.resources[0], 'data1');
      fs.writeFileSync(opts.resources[1], 'data2');

      waitFile(opts, err => {
        expect(err).toBeUndefined();
        done();
      });
    });
  });

  it('should succeed when file resources are become available later', done => {
    temp.mkdir({}, (err, dirPath) => {
      const opts: Opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
      };

      setTimeout(() => {
        fs.writeFileSync(opts.resources[0], 'data1');
        fs.writeFileSync(opts.resources[1], 'data2');
      }, 300);

      waitFile(opts, err => {
        expect(err).toBeUndefined();
        done();
      });
    });
  });

  it('should timeout when some resources are not available and timout option is specified', done => {
    temp.mkdir({}, function(err, dirPath) {
      const opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
        timeout: 1000,
      };
      fs.writeFileSync(opts.resources[0], 'data');
      waitFile(opts, function(err) {
        expect(err).toMatchInlineSnapshot(`[Error: Timeout]`);
        done();
      });
    });
  });

  it('should succeed when file resources are not available in reverse mode', done => {
    temp.mkdir({}, (err, dirPath) => {
      const opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
        reverse: true,
      };
      waitFile(opts, err => {
        expect(err).toBeUndefined();
        done();
      });
    });
  });

  it('should succeed when file resources are not available later in reverse mode', done => {
    temp.mkdir({}, (err, dirPath) => {
      const opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
        reverse: true,
      };
      fs.writeFileSync(opts.resources[0], 'data1');
      fs.writeFileSync(opts.resources[1], 'data2');
      setTimeout(function() {
        fs.unlinkSync(opts.resources[0]);
        fs.unlinkSync(opts.resources[1]);
      }, 300);

      waitFile(opts, err => {
        expect(err).toBeUndefined();
        done();
      });
    });
  });
});
