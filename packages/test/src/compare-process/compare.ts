export abstract class Compare {
  abstract readonly regexp: RegExp;

  abstract compare(value: any): boolean;
}
