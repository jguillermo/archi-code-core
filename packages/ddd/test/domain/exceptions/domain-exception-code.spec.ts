import { describe, expect, it } from 'vitest';
import { DomainExceptionCode } from '../../../src/domain/exceptions/domain-exception-code';

describe('DomainExceptionCode', () => {
  it('gives the stable codes of the domain an entry point can switch on', () => {
    expect({ ...DomainExceptionCode }).toStrictEqual({
      DomainException: 'DOM000',
      ValidationFailed: 'DOM001',
      TypeFailed: 'DOM003',
      RequiredValue: 'DOM004',
      InvalidEventDefinition: 'DOM005',
    });
  });
});
