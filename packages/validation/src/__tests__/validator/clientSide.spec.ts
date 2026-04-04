import assert from 'assert';
import fs from 'fs';
import vm from 'vm';
import { join } from 'path';
import validator from '../../validators';

const _dirname = __dirname;

function loadUMD(filePath) {
  const src = fs.readFileSync(filePath).toString();
  const sandbox = { exports: {}, module: { exports: {} } };
  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(src, sandbox);
  return sandbox.module.exports;
}

const validatorBundle = loadUMD(join(_dirname, '../validator.js'));
const min = loadUMD(join(_dirname, '../validator.min.js'));

describe('Minified version', () => {
  it('should export the same things as the server-side version', () => {
    for (const key in validator) {
      if ({}.hasOwnProperty.call(validator, key)) {
        assert.strictEqual(
          typeof validatorBundle[key],
          typeof min[key],
          `Minified version did not export ${key}`,
        );
      }
    }
  });

  it('should be up to date', () => {
    assert.strictEqual(
      min.version,
      validatorBundle.version,
      'Minified version mismatch. Run `make min`',
    );
  });

  it('should validate strings', () => {
    assert.strictEqual(min.isEmail('foo@bar.com'), true);
    assert.strictEqual(min.isEmail('foo'), false);
  });

  it('should sanitize strings', () => {
    assert.strictEqual(min.toBoolean('1'), true);
  });
});
