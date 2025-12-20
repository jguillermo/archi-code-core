export class BooleanValidator {
  static canBeBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
      return true;
    }
    if (typeof value === 'string') {
      value = value.toLowerCase().trim();
      if (value === 'false' || value === 'true' || value === '1' || value === '0') {
        return true;
      }
    }
    if (typeof value === 'number') {
      if (value === 1 || value === 0) {
        return true;
      }
    }
    return false;
  }
}
