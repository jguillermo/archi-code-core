import { Validations } from '@archi-code/validation';
import { Required, StringSanitizer, StringType } from '../../../../ddd/domain';

@Validations([{ validator: 'isLength', properties: { min: 2, max: 80 } }])
export class RecipientName extends Required(StringType) {
  protected filter(value: unknown): string {
    return StringSanitizer.singleLine(super.filter(value));
  }
}
