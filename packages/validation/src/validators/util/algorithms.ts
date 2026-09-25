/**
 * Algorithmic validation functions
 * May be used as is or implemented in the workflow of other validators.
 */

/*
 * Reverse TIN multiplication and summation helper function
 * Called with an array of single-digit integers and a base multiplier
 * to calculate the sum of the digits multiplied in reverse.
 * Normally used in variations of MOD 11 algorithmic checks.
 */
export function reverseMultiplyAndSum(digits: number[], base: number): number {
  let total = 0;
  for (let i = 0; i < digits.length; i++) {
    total += digits[i] * (base - i);
  }
  return total;
}
