import { format } from 'util';
import { validator as validatorObj } from '../../../src/validators';
import * as sanitizer from '../../../src/sanitizer';

const api = { ...sanitizer, isStrongPassword: validatorObj.isStrongPassword } as Record<
  string,
  (...a: unknown[]) => unknown
>;

export function test(options) {
  const args = options.args || [];

  args.unshift(null);

  Object.keys(options.expect).forEach((input) => {
    args[0] = input;
    const result = api[options.sanitizer](...args);
    const expected = options.expect[input];
    if (
      typeof result === 'number' &&
      isNaN(result as number) &&
      typeof expected === 'number' &&
      isNaN(expected)
    ) {
      return;
    }

    if (result !== expected) {
      const warning = format(
        'sanitizer.%s(%s) returned "%s" but should have returned "%s"',
        options.sanitizer,
        args.join(', '),
        result,
        expected,
      );

      throw new Error(warning);
    }
  });
}
