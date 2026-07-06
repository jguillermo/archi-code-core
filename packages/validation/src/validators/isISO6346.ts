import tryToString from './util/tryToString';

// https://en.wikipedia.org/wiki/ISO_6346
// according to ISO6346 standard, checksum digit is mandatory for freight container but recommended
// for other container types (J and Z)
const isISO6346Str = /^[A-Z]{3}(U[0-9]{7})|([J,Z][0-9]{6,7})$/;
const isDigit = /^[0-9]$/;

export function isISO6346(str: unknown): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  let container = s;

  container = container.toUpperCase();

  if (!isISO6346Str.test(container)) return false;

  if (container.length === 11) {
    let sum = 0;
    for (let i = 0; i < container.length - 1; i++) {
      if (!isDigit.test(container[i])) {
        let convertedCode;
        const letterCode = container.charCodeAt(i) - 55;
        if (letterCode < 11) convertedCode = letterCode;
        else if (letterCode >= 11 && letterCode <= 20) convertedCode = 12 + (letterCode % 11);
        else if (letterCode >= 21 && letterCode <= 30) convertedCode = 23 + (letterCode % 21);
        else convertedCode = 34 + (letterCode % 31);
        sum += convertedCode * 2 ** i;
      } else sum += parseInt(container[i], 10) * 2 ** i;
    }

    let checkSumDigit = sum % 11;
    if (checkSumDigit === 10) checkSumDigit = 0;
    return Number(container[container.length - 1]) === checkSumDigit;
  }

  return true;
}

export const isFreightContainerID = isISO6346;
