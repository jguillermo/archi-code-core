export class StringValidator {
  static isString(value: any): boolean {
    return typeof value === 'string';
  }

  static canBeString(value: any): boolean {
    if (typeof value === 'string') {
      return true;
    }
    if (typeof value === 'number' && isFinite(value)) {
      return true;
    }

    if (typeof value === 'boolean') {
      return true;
    }
    return false;
  }
}
