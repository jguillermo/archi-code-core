import { Validations } from '@archi-code/validation';
import { Required, StringSanitizer, StringType } from '../../../../ddd/domain';

@Validations([{ validator: 'isLength', properties: { min: 3, max: 120 } }])
export class Street extends Required(StringType) {
  protected filter(value: unknown): string {
    return StringSanitizer.singleLine(super.filter(value));
  }
}
