import { anyToString } from '@archi-code/validation';

export class ReceivedValue {
  static readonly maxLength = 64;

  static describe(value: unknown): string {
    const text = typeof value === 'string' ? value : anyToString(value);
    const shown =
      text.length > ReceivedValue.maxLength ? `${text.slice(0, ReceivedValue.maxLength)}…` : text;
    return typeof value === 'string' ? `"${shown}"` : shown;
  }
}
