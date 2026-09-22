import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isMagnetURISample: ValidatorSample = {
  name: 'isMagnetURI',
  run: (v) => validator.isMagnetURI(v),
  valid: [
    'magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335aa7c1367a88a',
    'magnet:?xt=urn:btih:aabbccdd00112233445566778899aabbccdd0011',
    'magnet:?xt=urn:btih:1122334455667788990011223344556677889900',
    'magnet:?xt=urn:btih:deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  ],
  invalid: ['not-magnet', 'http://example.com', 'magnet:', 'magnet:invalid'],
};
