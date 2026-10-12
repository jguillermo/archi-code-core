export function reverseMultiplyAndSum(digits: number[], base: number): number {
  let total = 0;
  for (let i = 0; i < digits.length; i++) {
    total += digits[i] * (base - i);
  }
  return total;
}
