import { RequiredValueException } from '../../exceptions/domain/required-value.exception';
import { isRequiredInstance } from '../required/required-mark';
import { isMissing } from './is-missing';

export function acceptValue<T>(
  type: object,
  value: unknown,
  filter: (value: unknown) => T | null,
): T | null {
  const accepted = isMissing(value) ? null : filter(value);
  if (accepted === null && isRequiredInstance(type)) {
    throw new RequiredValueException(type.constructor.name, value);
  }
  return accepted;
}
