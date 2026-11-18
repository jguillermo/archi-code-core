import { Required, StringSanitizer, StringType } from '../../../../ddd/domain';

export class AddressLine extends Required(StringType) {
  protected filter(value: unknown): string {
    return StringSanitizer.singleLine(super.filter(value));
  }
}
