import { RequiredValueException } from '../../exceptions/domain/required-value.exception';
import { RequiredMark } from '../required/required-mark';

export class TypeInput {
  static isMissing(value: unknown): boolean {
    return (
      value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
    );
  }

  static accept<T>(type: object, value: unknown, filter: (value: unknown) => T | null): T | null {
    const accepted = TypeInput.isMissing(value) ? null : filter(value);
    if (accepted === null && RequiredMark.isMarked(type)) {
      throw new RequiredValueException(type.constructor.name, value);
    }
    return accepted;
  }
}
