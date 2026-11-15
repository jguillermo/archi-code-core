export class StringSanitizer {
  private static readonly SPACES_AND_LINE_BREAKS = /[\s\u0085]+/g;

  private static readonly MARKS_AND_INVISIBLE_CHARACTERS = new RegExp('[\\p{M}\\p{Cf}]', 'gu');

  private static readonly LETTERS_WITHOUT_DECOMPOSITION: Readonly<Record<string, string>> = {
    ß: 'ss',
    æ: 'ae',
    œ: 'oe',
    ꜳ: 'aa',
    ꝏ: 'oo',
    ø: 'o',
    đ: 'd',
    ð: 'd',
    ɖ: 'd',
    ɗ: 'd',
    ł: 'l',
    ƚ: 'l',
    þ: 'th',
    ı: 'i',
    ɨ: 'i',
    ħ: 'h',
    ɦ: 'h',
    ŧ: 't',
    ƭ: 't',
    ŋ: 'n',
    ɲ: 'n',
    ĸ: 'k',
    ƙ: 'k',
    ƒ: 'f',
    ə: 'e',
    ǝ: 'e',
    ɛ: 'e',
    ɔ: 'o',
    ʉ: 'u',
    ʋ: 'v',
    ƀ: 'b',
    ɓ: 'b',
    ƈ: 'c',
    ƥ: 'p',
    ɠ: 'g',
    ǥ: 'g',
    ɉ: 'j',
    ɍ: 'r',
    ƴ: 'y',
    ɏ: 'y',
    ȥ: 'z',
    ƶ: 'z',
  };

  private static readonly LETTER_WITHOUT_DECOMPOSITION = new RegExp(
    `[${Object.keys(StringSanitizer.LETTERS_WITHOUT_DECOMPOSITION).join('')}]`,
    'g',
  );

  static singleLine(text: string): string {
    return text.replace(StringSanitizer.SPACES_AND_LINE_BREAKS, ' ').trim();
  }

  static slug(text: string): string {
    return text
      .replace(/[ºª]/g, '')
      .normalize('NFKD')
      .toLowerCase()
      .replace(StringSanitizer.MARKS_AND_INVISIBLE_CHARACTERS, '')
      .replace(
        StringSanitizer.LETTER_WITHOUT_DECOMPOSITION,
        (letter) => StringSanitizer.LETTERS_WITHOUT_DECOMPOSITION[letter],
      )
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
