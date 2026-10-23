import { describe, expect, it } from 'vitest';
import { ApplicationExceptionCode } from '../../../src/application/exceptions/application-exception-code';

describe('ApplicationExceptionCode', () => {
  it('gives the stable codes of the application an entry point can switch on', () => {
    expect({ ...ApplicationExceptionCode }).toStrictEqual({
      ApplicationException: 'APP000',
      ConcurrencyConflict: 'APP001',
      AggregateNotFound: 'APP002',
      NotAllowed: 'APP003',
      UnexpectedError: 'APP004',
    });
  });
});
