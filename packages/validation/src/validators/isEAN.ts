import { toString } from '../convert/string';

const LENGTH_EAN_8 = 8;
const LENGTH_EAN_14 = 14;
const validEanRegex = /^(\d{8}|\d{13}|\d{14})$/;

function getPositionWeightThroughLengthAndIndex(length: number, index: number): number {
  if (length === LENGTH_EAN_8 || length === LENGTH_EAN_14) {
    return index % 2 === 0 ? 3 : 1;
  }

  return index % 2 === 0 ? 1 : 3;
}

// GS1 check digit: https://en.wikipedia.org/wiki/International_Article_Number#Calculation_of_checksum_digit
function calculateCheckDigit(ean: string): number {
  const checksum = ean
    .slice(0, -1)
    .split('')
    .map((char, index) => Number(char) * getPositionWeightThroughLengthAndIndex(ean.length, index))
    .reduce((acc, partialSum) => acc + partialSum, 0);

  const remainder = 10 - (checksum % 10);

  return remainder < 10 ? remainder : 0;
}

export function isEAN(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  const actualCheckDigit = Number(str.slice(-1));

  return validEanRegex.test(str) && actualCheckDigit === calculateCheckDigit(str);
}
