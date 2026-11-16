import { AbstractType, TypePrimitiveException } from '@archi-code/ddd/domain';

export class CentsAmount extends AbstractType<number> {
  protected filter(value: unknown): number {
    const cents = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (typeof cents !== 'number' || !Number.isSafeInteger(cents) || cents < 0) {
      throw new TypePrimitiveException('amount in cents', value);
    }
    return cents;
  }
}
