import { describe, expect, it } from 'vitest';
import { StringSanitizer } from '../../../../src/domain/type/sanitize/string-sanitizer';

const URL_SAFE_SLUG = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

function slugOf(text: string): string {
  const slug = StringSanitizer.slug(text);
  expect(slug).toMatch(URL_SAFE_SLUG);
  expect(encodeURIComponent(slug)).toBe(slug);
  return slug;
}

describe('StringSanitizer', () => {
  describe('the slug of a Spanish product title for its URL', () => {
    describe('vowels with an acute accent', () => {
      it.each([
        ['á', 'a'],
        ['é', 'e'],
        ['í', 'i'],
        ['ó', 'o'],
        ['ú', 'u'],
        ['Á', 'a'],
        ['É', 'e'],
        ['Í', 'i'],
        ['Ó', 'o'],
        ['Ú', 'u'],
      ])('%s becomes %s', (letter, plain) => {
        expect(slugOf(letter)).toBe(plain);
      });

      it.each([
        ['Camión', 'camion'],
        ['MÁSCARA', 'mascara'],
        ['Electrodo rutílico', 'electrodo-rutilico'],
        ['Fusión térmica', 'fusion-termica'],
        ['ÚLTIMA EDICIÓN', 'ultima-edicion'],
        ['Árbol de levas', 'arbol-de-levas'],
        ['Ínsula Barataria', 'insula-barataria'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('the letter ñ', () => {
      it.each([
        ['ñ', 'n'],
        ['Ñ', 'n'],
        ['Año', 'ano'],
        ['AÑO', 'ano'],
        ['Señal de soldadura', 'senal-de-soldadura'],
        ['Ñandú', 'nandu'],
        ['España y Peñíscola', 'espana-y-peniscola'],
        ['Muñeca, uña y niño', 'muneca-una-y-nino'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('the diaeresis', () => {
      it.each([
        ['ü', 'u'],
        ['Ü', 'u'],
        ['Pingüino', 'pinguino'],
        ['CIGÜEÑA', 'ciguena'],
        ['Vergüenza ajena', 'verguenza-ajena'],
        ['Lingüística aplicada', 'linguistica-aplicada'],
        ['ä ë ï ö ÿ', 'a-e-i-o-y'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('the cedilla', () => {
      it.each([
        ['ç', 'c'],
        ['Ç', 'c'],
        ['Façade', 'facade'],
        ['Plaça Major', 'placa-major'],
        ['FRANÇAIS', 'francais'],
        ['Açúcar', 'acucar'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('other accents of the languages of Spain', () => {
      it.each([
        ['à è ì ò ù', 'a-e-i-o-u'],
        ['À È Ì Ò Ù', 'a-e-i-o-u'],
        ['â ê î ô û', 'a-e-i-o-u'],
        ['ã õ', 'a-o'],
        ['Cançó catalana', 'canco-catalana'],
        ['Col·legi', 'col-legi'],
        ['Irunõ', 'iruno'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('inverted question and exclamation marks', () => {
      it.each([
        ['¿Qué casco elijo?', 'que-casco-elijo'],
        ['¡Oferta!', 'oferta'],
        ['¡¿Cómo?!', 'como'],
        ['¿?', ''],
        ['¡!', ''],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('parentheses and brackets', () => {
      it.each([
        ['Casco (nuevo)', 'casco-nuevo'],
        ['(Oferta) Guantes', 'oferta-guantes'],
        ['Electrodo [E6013]', 'electrodo-e6013'],
        ['Kit {básico}', 'kit-basico'],
        ['Careta <automática>', 'careta-automatica'],
        ['((doble))', 'doble'],
        ['()[]{}<>', ''],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('quotes and apostrophes', () => {
      it.each([
        ['«Soldamatic»', 'soldamatic'],
        ['“Curso” de MIG', 'curso-de-mig'],
        ['‘Prácticas’', 'practicas'],
        ['"Nivel" básico', 'nivel-basico'],
        ["L'Hospitalet", 'l-hospitalet'],
        ['D’Artagnan', 'd-artagnan'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('slashes and backslashes', () => {
      it.each([
        ['a slash between words', 'MIG/MAG', 'mig-mag'],
        ['a slash with spaces', 'Casco / guantes', 'casco-guantes'],
        ['several slashes', 'TIG/MIG/MMA', 'tig-mig-mma'],
        ['repeated slashes', 'casco//pro///mig', 'casco-pro-mig'],
        ['a leading and a trailing slash', '/casco/', 'casco'],
        ['a path', '/catálogo/cascos/máscara-pro/', 'catalogo-cascos-mascara-pro'],
        ['a date with slashes', '15/11/2026', '15-11-2026'],
        ['a fraction with a slash', '3/4 pulgada', '3-4-pulgada'],
        ['a fraction slash', '3\u20444', '3-4'],
        ['a division slash', '6\u22152', '6-2'],
        ['a full-width slash', 'MIG\uFF0FMAG', 'mig-mag'],
        ['a backslash between words', 'MIG\\MAG', 'mig-mag'],
        ['a backslash with spaces', 'Casco \\ guantes', 'casco-guantes'],
        ['repeated backslashes', 'casco\\\\pro', 'casco-pro'],
        ['a Windows path', 'C:\\Usuarios\\José\\Documentos', 'c-usuarios-jose-documentos'],
        ['a network path', '\\\\servidor\\compartido', 'servidor-compartido'],
        ['an escaped quote', 'casco \\"pro\\"', 'casco-pro'],
        ['escape sequences written as text', 'casco\\npro\\t', 'casco-npro-t'],
        ['a full-width backslash', 'MIG\uFF3CMAG', 'mig-mag'],
        ['slashes and backslashes mixed', '/a\\b/c\\', 'a-b-c'],
        ['only slashes and backslashes', '/\\//\\\\', ''],
      ])('%s', (_, title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('text inside quotes', () => {
      it.each([
        ['double quotes', '"Casco pro"', 'casco-pro'],
        ['single quotes', "'Casco pro'", 'casco-pro'],
        ['backticks', '`Casco pro`', 'casco-pro'],
        ['double backticks', '``Casco pro``', 'casco-pro'],
        ['triple backticks', '```Casco pro```', 'casco-pro'],
        ['a backtick between words', 'casco`pro', 'casco-pro'],
        ['only backticks', '```', ''],
        ['Spanish angle quotes', '«Casco pro»', 'casco-pro'],
        ['reversed angle quotes', '»Casco pro«', 'casco-pro'],
        ['single angle quotes', '‹Casco pro›', 'casco-pro'],
        ['curly double quotes', '“Casco pro”', 'casco-pro'],
        ['curly single quotes', '‘Casco pro’', 'casco-pro'],
        ['low-9 quotes', '„Casco pro“', 'casco-pro'],
        ['a low-9 single quote', '‚Casco pro‘', 'casco-pro'],
        ['prime marks', '′Casco pro″', 'casco-pro'],
        ['full-width quotes', '＂Casco pro＂', 'casco-pro'],
        ['CJK corner brackets', '「Casco pro」', 'casco-pro'],
        ['an acute accent used as a quote', '´Casco pro´', 'casco-pro'],
        ['a grave accent used as a quote', 'ˋCasco proˋ', 'casco-pro'],
        ['quotes inside a title', 'Curso "Soldadura" básico', 'curso-soldadura-basico'],
        ['backticks inside a title', 'Usa `slug()` en la URL', 'usa-slug-en-la-url'],
        ['nested quotes', '«Curso “Soldamatic” ‘MIG’»', 'curso-soldamatic-mig'],
        ['quotes glued to words', 'el"casco"pro', 'el-casco-pro'],
        ['accents inside quotes', '«Máscara añeja»', 'mascara-aneja'],
        ['empty quotes', '"" \'\' `` «»', ''],
        ['an unclosed quote', '"Casco pro', 'casco-pro'],
        ['quotes inside parentheses', '("Casco") [`pro`]', 'casco-pro'],
      ])('%s', (_, title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('punctuation', () => {
      it.each([
        ['Hola, mundo', 'hola-mundo'],
        ['Fin.', 'fin'],
        ['Nota: importante', 'nota-importante'],
        ['Uno; dos', 'uno-dos'],
        ['Y así…', 'y-asi'],
        ['Y así...', 'y-asi'],
        ['Soldadura — guía rápida', 'soldadura-guia-rapida'],
        ['Páginas 10–20', 'paginas-10-20'],
        ['Corte-y-confección', 'corte-y-confeccion'],
        ['Corte - y - confección', 'corte-y-confeccion'],
        ['tig_mig_mma', 'tig-mig-mma'],
        ['--casco__pro--', 'casco-pro'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('symbols', () => {
      it.each([
        ['Guantes & casco', 'guantes-casco'],
        ['50% de descuento', '50-de-descuento'],
        ['Precio: 10,50 €', 'precio-10-50'],
        ['$100 USD', '100-usd'],
        ['info@seabery.example', 'info-seabery-example'],
        ['#soldadura', 'soldadura'],
        ['MIG/MAG', 'mig-mag'],
        ['C:\\ruta\\fichero', 'c-ruta-fichero'],
        ['a+b=c', 'a-b-c'],
        ['3 * 4', '3-4'],
        ['Opción A | Opción B', 'opcion-a-opcion-b'],
        ['~^`', ''],
        ['Grado 90°', 'grado-90'],
        ['© Seabery ® ™', 'seabery-tm'],
        ['Sección § 3', 'seccion-3'],
        ['casco 🔥 pro', 'casco-pro'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('ordinals, superscripts and fractions', () => {
      it.each([
        ['1.º piso', '1-piso'],
        ['1.ª planta', '1-planta'],
        ['2.ª edición', '2-edicion'],
        ['3º curso', '3-curso'],
        ['4ª fila', '4-fila'],
        ['Piso 1.º B', 'piso-1-b'],
        ['10 m²', '10-m2'],
        ['5 cm³', '5-cm3'],
        ['½ kg', '1-2-kg'],
        ['Nº 7', 'n-7'],
        ['n.º 7', 'n-7'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('spaces and invisible characters', () => {
      it.each([
        ['surrounding spaces', '  casco  ', 'casco'],
        ['repeated spaces', 'casco    pro', 'casco-pro'],
        ['tabs and line breaks', 'casco\t\n\r\npro', 'casco-pro'],
        ['a non-breaking space', 'casco\u00A0pro', 'casco-pro'],
        ['a narrow no-break space', '10\u202Fkg', '10-kg'],
        ['a soft hyphen inside a word', 'sol\u00ADdadura', 'soldadura'],
        ['a zero-width space inside a word', 'sol\u200Bdadura', 'soldadura'],
        ['a zero-width joiner inside a word', 'sol\u200Ddadura', 'soldadura'],
        ['a byte order mark at the start', '\uFEFFcasco', 'casco'],
        ['only spaces', '   ', ''],
        ['an empty text', '', ''],
      ])('%s', (_, title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('the same letter written in other Unicode forms', () => {
      it.each([
        ['an accent as a separate combining mark', 'pa\u0301gina', 'pagina'],
        ['an ñ as n plus a combining tilde', 'an\u0303o', 'ano'],
        ['a ü as u plus a combining diaeresis', 'pingu\u0308ino', 'pinguino'],
        ['a ç as c plus a combining cedilla', 'fac\u0327ade', 'facade'],
        ['ligatures', 'ﬁltro ﬂuido', 'filtro-fluido'],
        ['full-width letters and digits', 'ＭＩＧ ２０２６', 'mig-2026'],
      ])('%s', (_, title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });

      it('gives the same slug for the composed and the decomposed text', () => {
        const composed = 'Señal de cigüeña en la façade: ¡Ágil!';

        expect(slugOf(composed.normalize('NFD'))).toBe(slugOf(composed.normalize('NFC')));
      });
    });

    describe('letters with no accent to strip', () => {
      it.each([
        ['Straße', 'strasse'],
        ['Æther', 'aether'],
        ['Œuvre', 'oeuvre'],
        ['Øre', 'ore'],
        ['Đak', 'dak'],
        ['ðe', 'de'],
        ['Łódź', 'lodz'],
        ['Þór', 'thor'],
        ['Iıd', 'iid'],
        ['İstanbul', 'istanbul'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('text with no latin form', () => {
      it.each([
        ['溶接', ''],
        ['Сварка', ''],
        ['لحام', ''],
        ['Casco 溶接 pro', 'casco-pro'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('real titles of a welding catalogue', () => {
      it.each([
        ['Máscara de Soldar Año 2026', 'mascara-de-soldar-ano-2026'],
        ['¡Oferta! 50% en casco (nuevo) & guantes?', 'oferta-50-en-casco-nuevo-guantes'],
        [
          '¿Cuál es la guía de soldadura MIG/MAG para pingüinos con façade?',
          'cual-es-la-guia-de-soldadura-mig-mag-para-pinguinos-con-facade',
        ],
        ['Curso «Soldamatic» — 2.ª edición (Huelva)', 'curso-soldamatic-2-edicion-huelva'],
        ['Electrodo E-6013 Ø 3,2 mm', 'electrodo-e-6013-o-3-2-mm'],
        ['Café «Crème» / Niño #1 · ½ kg', 'cafe-creme-nino-1-1-2-kg'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('latin letters with a stroke or a hook, which Unicode does not decompose', () => {
      it.each([
        ['ħ Ħ', 'h-h'],
        ['Ħamrun', 'hamrun'],
        ['ŧ Ŧ', 't-t'],
        ['ŋ Ŋ', 'n-n'],
        ['ĸ', 'k'],
        ['ƒ Ƒ', 'f-f'],
        ['ə Ə', 'e-e'],
        ['Azərbaycan', 'azerbaycan'],
        ['ɛ Ɛ', 'e-e'],
        ['ɔ Ɔ', 'o-o'],
        ['ɨ Ɨ', 'i-i'],
        ['ʉ Ʉ', 'u-u'],
        ['ʋ Ʋ', 'v-v'],
        ['ƀ Ƀ', 'b-b'],
        ['ɓ Ɓ', 'b-b'],
        ['ɗ Ɗ', 'd-d'],
        ['ɖ Ɖ', 'd-d'],
        ['ƈ Ƈ', 'c-c'],
        ['ƥ Ƥ', 'p-p'],
        ['ɠ Ɠ', 'g-g'],
        ['ǥ Ǥ', 'g-g'],
        ['ɉ Ɉ', 'j-j'],
        ['ɍ Ɍ', 'r-r'],
        ['ƴ Ƴ', 'y-y'],
        ['ɏ Ɏ', 'y-y'],
        ['ȥ Ȥ', 'z-z'],
        ['ƶ Ƶ', 'z-z'],
        ['ƚ', 'l'],
        ['ƭ', 't'],
        ['ɲ Ɲ', 'n-n'],
        ['ɦ', 'h'],
        ['ǝ', 'e'],
        ['ꜳ Ꜳ', 'aa-aa'],
        ['ꝏ Ꝏ', 'oo-oo'],
        ['ẞ GROSS', 'ss-gross'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('letters built from a base letter and a mark in other languages', () => {
      it.each([
        ['Phở Nguyễn', 'pho-nguyen'],
        ['Đà Nẵng', 'da-nang'],
        ['Ærøskøbing', 'aeroskobing'],
        ['Kraków Gdańsk Wrocław', 'krakow-gdansk-wroclaw'],
        ['Český Krumlov', 'cesky-krumlov'],
        ['Şişli Ğ', 'sisli-g'],
        ['Brașov Țară', 'brasov-tara'],
        ['Reykjavík Þingvellir', 'reykjavik-thingvellir'],
        ['Mallorca Sóller', 'mallorca-soller'],
        ['coŀlegi', 'col-legi'],
      ])('%o becomes %o', (title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('compatibility forms that hide a plain latin letter or digit', () => {
      it.each([
        ['digraphs', 'ǅ ǆ ĳ Ĳ', 'dz-dz-ij-ij'],
        ['the long s', 'ſ', 's'],
        ['the apostrophe n', 'ŉ', 'n'],
        ['roman numerals', 'Ⅻ ⅻ', 'xii-xii'],
        ['circled digits', '① ⑳', '1-20'],
        ['circled letters', 'ⓐⓑ', 'ab'],
        ['mathematical letters outside the basic plane', '𝐀𝐁𝐂 𝒳', 'abc-x'],
        ['the Kelvin and Angstrom signs', 'K Å', 'k-a'],
        ['letter-like symbols', 'ℌ ℓ ℕ', 'h-l-n'],
        ['unit symbols', '㎏ ㎡ ℃', 'kg-m2-c'],
        ['more ligatures', 'ﬀ ﬃ ﬆ', 'ff-ffi-st'],
        ['superscript and subscript digits', 'H₂O x¹⁰', 'h2o-x10'],
        ['a superscript letter', 'ᵃ', 'a'],
      ])('%s', (_, title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('emoji and pictographs', () => {
      it.each([
        ['a flag', 'España 🇪🇸', 'espana'],
        ['a family joined with zero-width joiners', 'Familia 👨‍👩‍👧', 'familia'],
        ['a skin tone modifier glued to a word', '👍🏽ok', 'ok'],
        ['a keycap digit', '1️⃣ paso', '1-paso'],
        ['a keycap symbol', '#️⃣', ''],
        ['a variation selector inside a word', 'ca️sco', 'casco'],
        ['only emoji', '🔥🔥🔥', ''],
      ])('%s', (_, title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('other spaces, dashes and control characters', () => {
      it.each([
        ['an em space', 'casco pro', 'casco-pro'],
        ['an ideographic space', 'casco　pro', 'casco-pro'],
        ['a thin and a hair space', 'casco  pro', 'casco-pro'],
        ['a line and a paragraph separator', 'casco pro mig', 'casco-pro-mig'],
        ['a vertical tab and a form feed', 'casco\u000B\u000Cpro', 'casco-pro'],
        ['hyphen, non-breaking hyphen, minus and bullet', 'a‐b‑c−d⁃e', 'a-b-c-d-e'],
        ['a null and a bell character', '\u0000casco\u0007pro', 'casco-pro'],
        ['a delete character', 'casco\u007Fpro', 'casco-pro'],
        ['right-to-left and left-to-right marks inside a word', 'cas‏co‎pro', 'cascopro'],
        ['a word joiner inside a word', 'cas⁠co', 'casco'],
        ['a lone surrogate', '\uD800casco\uDC00', 'casco'],
      ])('%s', (_, title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('stacked combining marks', () => {
      it.each([
        ['several marks on one letter', 'á̧̈', 'a'],
        ['text full of marks', 'z̸̢̛͉a̴l͎g̷o̵', 'zalgo'],
        ['a mark with no letter before it', '́casco', 'casco'],
        ['a dotted i written with a combining dot', 'ı̇', 'i'],
      ])('%s', (_, title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('text that tries to break out of a URL, a path or a page', () => {
      it.each([
        ['a path traversal', '../../etc/passwd', 'etc-passwd'],
        ['a Windows path traversal', '..\\..\\windows\\system32', 'windows-system32'],
        ['a script tag', '<script>alert(1)</script>', 'script-alert-1-script'],
        ['a javascript URL', 'javascript:alert(1)', 'javascript-alert-1'],
        ['an absolute URL', 'https://example.com/a?b=1#c', 'https-example-com-a-b-1-c'],
        ['a protocol-relative URL', '//evil.example', 'evil-example'],
        ['percent escapes', '%2F%2e%2e%20x', '2f-2e-2e-20x'],
        ['a query string', '?a=1&b=2#x', 'a-1-b-2-x'],
        ['an SQL injection', "' OR 1=1 --", 'or-1-1'],
        ['an HTML entity', '&lt;b&gt;&amp;', 'lt-b-gt-amp'],
        ['a header injection', 'casco\r\nSet-Cookie: x=1', 'casco-set-cookie-x-1'],
        ['a dot and a double dot', '. ..', ''],
      ])('%s', (_, title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('digits', () => {
      it.each([
        ['a single zero', '0', '0'],
        ['leading zeros', '007', '007'],
        ['a negative number', '-12', '12'],
        ['a decimal number', '3,14', '3-14'],
        ['a date', '15/11/2026', '15-11-2026'],
        ['a time', '10:30 h', '10-30-h'],
        ['a phone number', '+34 959 00 00 00', '34-959-00-00-00'],
        ['digits of other scripts, which have no latin form', '٣ ३', ''],
      ])('%s', (_, title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('letters of other scripts are not latin', () => {
      it.each([
        ['a Greek word', 'Αθήνα', ''],
        ['a Greek symbol', 'ϑ', ''],
        ['a Hebrew word', 'ריתוך', ''],
        ['a Korean word', '용접', ''],
        ['a Japanese word in kana', 'ようせつ', ''],
        ['a Hindi word', 'वेल्डिंग', ''],
        ['latin and other scripts mixed', 'MIG Αθήνα 2026', 'mig-2026'],
      ])('%s', (_, title, slug) => {
        expect(slugOf(title)).toBe(slug);
      });
    });

    describe('very long text', () => {
      it('keeps a long title whole', () => {
        const words = Array.from({ length: 2000 }, (_, index) => `Señal${index}`).join(' ');

        const slug = slugOf(words);

        expect(slug.split('-')).toHaveLength(2000);
        expect(slug.startsWith('senal0-senal1-')).toBe(true);
        expect(slug.endsWith('-senal1999')).toBe(true);
      });

      it('collapses a million separators into nothing', () => {
        expect(slugOf(`${'-'.repeat(1_000_000)}casco${' ¿?'.repeat(100_000)}`)).toBe('casco');
      });

      it('strips the accent of a million letters', () => {
        expect(slugOf('á'.repeat(1_000_000))).toBe('a'.repeat(1_000_000));
      });
    });

    describe('properties that hold for any text', () => {
      const POOL = [
        ...Array.from('abcxyzABCXYZ0189'),
        ...Array.from('áéíóúÁÉÍÓÚñÑüÜçÇàèâêãõ'),
        ...Array.from('¿¡?!()[]{}<>«»“”‘’‹›„‚"\'`´.,;:…—–-_/\\|&%€$@#*+=~^°©®™§ºª'),
        ...Array.from('ßæœøđðłþıħŋŧƒəɛɔẞİ'),
        ' ',
        '\t',
        '\n',
        ' ',
        '­',
        '​',
        '‍',
        '﻿',
        '́',
        '̃',
        '̈',
        '̧',
        'ﬁ',
        '①',
        '²',
        '½',
        'Ⅻ',
        '𝐀',
        '🔥',
        '🇪🇸',
        '溶',
        'Α',
        '٣',
        '\uD800',
      ];

      function randomTitles(count: number): string[] {
        let seed = 20261115;
        const next = (limit: number): number => {
          seed = (seed * 1103515245 + 12345) % 2147483648;
          return seed % limit;
        };
        return Array.from({ length: count }, () =>
          Array.from({ length: next(40) }, () => POOL[next(POOL.length)]).join(''),
        );
      }

      const titles = randomTitles(3000);

      it('always gives only lowercase latin letters, digits and single inner dashes', () => {
        for (const title of titles) {
          expect(StringSanitizer.slug(title)).toMatch(URL_SAFE_SLUG);
        }
      });

      it('gives a slug that a second pass leaves as it is', () => {
        for (const title of titles) {
          const slug = StringSanitizer.slug(title);
          expect(StringSanitizer.slug(slug)).toBe(slug);
        }
      });

      it('ignores the case and the Unicode form of the text', () => {
        for (const title of titles) {
          const slug = StringSanitizer.slug(title);
          expect(StringSanitizer.slug(title.toUpperCase())).toBe(slug);
          expect(StringSanitizer.slug(title.normalize('NFC'))).toBe(slug);
          expect(StringSanitizer.slug(title.normalize('NFD'))).toBe(slug);
        }
      });

      it('never grows a slug with spaces or separators around the text', () => {
        for (const title of titles) {
          expect(StringSanitizer.slug(` ¿(${title})? `)).toBe(StringSanitizer.slug(title));
        }
      });

      it('does not depend on the locale of the machine', () => {
        expect(slugOf('INGILIZCE IŞIK')).toBe('ingilizce-isik');
      });
    });

    it('gives a slug that a second pass leaves as it is', () => {
      const slug = slugOf('¿Señal de cigüeña en la façade (nueva)?');

      expect(slugOf(slug)).toBe(slug);
    });
  });
});
