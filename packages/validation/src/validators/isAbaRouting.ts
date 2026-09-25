import { toString } from '../convert/string';

// http://www.brainjar.com/js/validation/
// https://www.aba.com/news-research/research-analysis/routing-number-policy-procedures
// series reserved for future use are excluded
const isRoutingReg =
  /^(?!(1[3-9])|(20)|(3[3-9])|(4[0-9])|(5[0-9])|(60)|(7[3-9])|(8[1-9])|(9[0-2])|(9[3-9]))[0-9]{9}$/;

export function isAbaRouting(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;

  if (!isRoutingReg.test(str)) return false;

  let checkSumVal = 0;
  for (let i = 0; i < str.length; i++) {
    if (i % 3 === 0) checkSumVal += Number(str[i]) * 3;
    else if (i % 3 === 1) checkSumVal += Number(str[i]) * 7;
    else checkSumVal += Number(str[i]);
  }
  return checkSumVal % 10 === 0;
}
