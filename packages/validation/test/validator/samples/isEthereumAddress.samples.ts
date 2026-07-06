import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isEthereumAddressSample: ValidatorSample = {
  name: 'isEthereumAddress',
  run: (v) => validator.isEthereumAddress(v),
  valid: [
    '0x52908400098527886E0F7030069857D2E4169EE7',
    '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe',
    '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
  ],
  invalid: ['0x52908400098527886E0F7030069857D2E4169EE', '0xGGGGGGGGGG', 'not-eth', '0x1234'],
};
