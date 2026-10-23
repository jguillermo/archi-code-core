import { describe, expect, it } from 'vitest';
import { InfrastructureExceptionCode } from '../../../src/infrastructure/exceptions/infrastructure-exception-code';

describe('InfrastructureExceptionCode', () => {
  it('gives the stable codes of the infrastructure an entry point can switch on', () => {
    expect({ ...InfrastructureExceptionCode }).toStrictEqual({
      InfrastructureException: 'INF000',
      InternalError: 'INF001',
      UnknownEvent: 'INF002',
      EventDelivery: 'INF003',
    });
  });
});
