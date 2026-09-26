// Unicode-aware classes: 'Ñ'/'ñ' count as upper/lower case, '€'/'¿' as symbols, etc.
// Every ASCII symbol of the historic set (including space) is in \p{P} ∪ \p{S} ∪ \p{Zs}.
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

/* Counts occurrences of each character (code point, so emoji/astral chars count once). */
function countChars(chars: string[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const char of chars) {
    result.set(char, (result.get(char) ?? 0) + 1);
  }
  return result;
}

/* Return information about a password */
export function analyzePassword(password: string): PasswordAnalysis {
  const chars = Array.from(password);
  const charMap = countChars(chars);
  const analysis = {
    // Length in characters (code points), consistent with how unique characters are counted.
    length: chars.length,
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
