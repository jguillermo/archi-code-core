import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isMACAddressSample: ValidatorSample = {
  name: 'isMACAddress',
  run: (v) => validator.isMACAddress(v, {}),
  valid: ['01:02:03:04:05:06', 'AA:BB:CC:DD:EE:FF', '00:1A:2B:3C:4D:5E', 'a1:b2:c3:d4:e5:f6'],
  invalid: ['00:11:22:33:44', 'GG:HH:II:JJ:KK:LL', '001122334455', 'not-a-mac'],
};
