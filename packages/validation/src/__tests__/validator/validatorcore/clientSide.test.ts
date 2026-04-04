import assert from 'assert';
import fs from 'fs';
import { join } from 'path';
import vm from 'vm';

const _dirname = __dirname;
const validator_js = fs.readFileSync(join(_dirname, '../../validator.js')).toString();

describe('Validators', () => {
  it('should define the module using an AMD-compatible loader', () => {
    const window = {
      validator: null,
      define(module) {
        window.validator = module();
      },
    };
    window.define.amd = true;

    const sandbox = vm.createContext(window);
    vm.runInContext(validator_js, sandbox);
    assert.strictEqual(window.validator.trim('  foobar '), 'foobar');
  });

  it('should bind validator to the window if no module loaders are available', () => {
    const window = {};
    const sandbox = vm.createContext(window);
    vm.runInContext(validator_js, sandbox);
    assert.strictEqual(window.validator.trim('  foobar '), 'foobar');
  });
});
