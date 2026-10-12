export interface ValidatorSample {
  name: string;
  run: (input: unknown) => boolean;
  valid: unknown[];
  invalid: unknown[];
}
