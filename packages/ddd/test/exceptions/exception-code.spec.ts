import { describe, expect, it } from 'vitest';
import { ExceptionCode } from '../../src/exceptions/exception-code';

describe('ExceptionCode', () => {
  it('gives the stable codes an HTTP or message mapper can switch on', () => {
    expect({ ...ExceptionCode }).toStrictEqual({
      DomainException: 'DOM000',
      ValidationFailed: 'DOM001',
      TypeFailed: 'DOM003',
      RequiredValue: 'DOM004',
      ApplicationException: 'APP000',
      ConcurrencyConflict: 'APP001',
      AggregateNotFound: 'APP002',
      NotAllowed: 'APP003',
      InfrastructureException: 'INF000',
      InternalError: 'INF001',
      UnknownEvent: 'INF002',
      EventDelivery: 'INF003',
      ErrorException: 'E000',
    });
  });

  it('groups the codes by layer prefix', () => {
    const layerOf = (code: string) => code.replace(/\d+$/, '');

    expect(new Set(Object.values(ExceptionCode).map(layerOf))).toStrictEqual(
      new Set(['DOM', 'APP', 'INF', 'E']),
    );
  });
});
