import { Validations } from '@archi-code/validation';
import { Required, StringSanitizer, StringType } from '@archi-code/ddd/domain';

@Validations([
  { validator: 'isLength', properties: { min: 1, max: 120 }, message: 'From 1 to 120 characters' },
])
export class CourseTitle extends Required(StringType) {
  protected filter(value: unknown): string {
    return StringSanitizer.singleLine(super.filter(value));
  }
}
