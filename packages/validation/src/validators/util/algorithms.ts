/**
 * Algorithmic validation functions
 * May be used as is or implemented in the workflow of other validators.
 */

/*
 * ISO 7064 validation function
 * Called with a string of numbers (incl. check digit)
 * to validate according to ISO 7064 (MOD 11, 10).
 */
export function iso7064Check(str: string): boolean {
  let checkvalue = 10;
  for (let i = 0; i < str.length - 1; i++) {
    const sum = (parseInt(str[i], 10) + checkvalue) % 10;
    checkvalue = sum === 0 ? (10 * 2) % 11 : (sum * 2) % 11;
  }
  checkvalue = checkvalue === 1 ? 0 : 11 - checkvalue;
  return checkvalue === parseInt(str[10], 10);
}

/*
 * Luhn (mod 10) validation function
 * Called with a string of numbers (incl. check digit)
 * to validate according to the Luhn algorithm.
 */
export function luhnCheck(str: string): boolean {
  let checksum = 0;
  let second = false;
  for (let i = str.length - 1; i >= 0; i--) {
    const digit = parseInt(str[i], 10);
    if (second) {
      const product = digit * 2;
      // For a doubled digit (0-18), the sum of its digits equals product - 9 when > 9.
      checksum += product > 9 ? product - 9 : product;
    } else {
      checksum += digit;
    }
    second = !second;
  }
  return checksum % 10 === 0;
}

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

/*
 * Verhoeff validation helper function
 * Called with a string of numbers
 * to validate according to the Verhoeff algorithm.
 */
const verhoeff_d_table = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const verhoeff_p_table = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeffCheck(str: string): boolean {
  // Iterate the string in reverse without allocating a reversed copy.
  const len = str.length;
  let checksum = 0;
  for (let i = 0; i < len; i++) {
    checksum =
      verhoeff_d_table[checksum][verhoeff_p_table[i % 8][parseInt(str[len - 1 - i], 10)]];
  }
  return checksum === 0;
}
