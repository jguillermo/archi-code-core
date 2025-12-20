export interface TypeValidatorInterface {
  isValid(): boolean;

  validatorMessageObj(customReplacement?: string): object;

  validatorMessageStr(customReplacement?: string): string;
}
