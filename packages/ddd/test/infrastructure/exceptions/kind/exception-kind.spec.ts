import { describe, expect, it } from 'vitest';
import { ExceptionKind } from '../../../../src/infrastructure/exceptions/kind/exception-kind';

describe('ExceptionKind', () => {
  it('names the kinds of failure every protocol adapter translates to its own codes', () => {
    expect({ ...ExceptionKind }).toStrictEqual({
      NotFound: 'not_found',
      NotAllowed: 'not_allowed',
      Conflict: 'conflict',
      Malformed: 'malformed',
      Invalid: 'invalid',
      Rejected: 'rejected',
      Internal: 'internal',
    });
  });
});
