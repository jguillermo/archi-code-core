// Every ASCII symbol of the validator.js historic set (space included) is in \p{P} ∪ \p{S} ∪ \p{Zs}.
const upperCaseRegex = /^\p{Lu}$/u;
const lowerCaseRegex = /^\p{Ll}$/u;
const numberRegex = /^\p{Nd}$/u;
const symbolRegex = /^[\p{P}\p{S}\p{Zs}]$/u;

export interface PasswordAnalysis {
  length: number;
  uniqueChars: number;
  uppercaseCount: number;
  lowercaseCount: number;
  numberCount: number;
  symbolCount: number;
}

function countCodePoints(codePoints: string[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const char of codePoints) {
    result.set(char, (result.get(char) ?? 0) + 1);
  }
  return result;
}

export function analyzePassword(password: string): PasswordAnalysis {
  const codePoints = Array.from(password);
  const charMap = countCodePoints(codePoints);
  const analysis = {
    length: codePoints.length,
    uniqueChars: charMap.size,
    uppercaseCount: 0,
    lowercaseCount: 0,
    numberCount: 0,
    symbolCount: 0,
  };
  charMap.forEach((count, char) => {
    if (upperCaseRegex.test(char)) {
      analysis.uppercaseCount += count;
    } else if (lowerCaseRegex.test(char)) {
      analysis.lowercaseCount += count;
    } else if (numberRegex.test(char)) {
      analysis.numberCount += count;
    } else if (symbolRegex.test(char)) {
      analysis.symbolCount += count;
    }
  });
  return analysis;
}
