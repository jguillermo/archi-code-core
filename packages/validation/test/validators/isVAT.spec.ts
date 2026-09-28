import test from '../cross/support/testFunctions';

describe('Validators', () => {
  it('should validate VAT numbers', () => {
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'AT' }],
      valid: ['ATU12345678', 'U12345678'],
      invalid: ['AT 12345678', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'BE' }],
      valid: ['BE1234567890', '1234567890'],
      invalid: ['BE 1234567890', '123456789'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'BG' }],
      valid: ['BG1234567890', '1234567890', 'BG123456789', '123456789'],
      invalid: ['BG 1234567890', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'HR' }],
      valid: ['HR12345678901', '12345678901'],
      invalid: ['HR 12345678901', '1234567890'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'CY' }],
      valid: ['CY123456789', '123456789'],
      invalid: ['CY 123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'CZ' }],
      valid: ['CZ1234567890', 'CZ123456789', 'CZ12345678', '1234567890', '123456789', '12345678'],
      invalid: ['CZ 123456789', '1234567'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'DK' }],
      valid: ['DK12345678', '12345678'],
      invalid: ['DK 12345678', '1234567'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'EE' }],
      valid: ['EE123456789', '123456789'],
      invalid: ['EE 123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'FI' }],
      valid: ['FI12345678', '12345678'],
      invalid: ['FI 12345678', '1234567'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'FR' }],
      valid: ['FRAA123456789', 'FR83404833048', 'FR40123456789', 'FRA1123456789', 'FR1A123456789'],
      invalid: [
        'FR AA123456789',
        '123456789',
        'FRAA123456789A',
        'FR123456789',
        'FR 83404833048',
        'FRaa123456789',
      ],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'DE' }],
      valid: ['DE123456789', '123456789'],
      invalid: ['DE 123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'EL' }],
      valid: ['EL123456789', '123456789'],
      invalid: ['EL 123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'HU' }],
      valid: ['HU12345678', '12345678'],
      invalid: ['HU 12345678', '1234567'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'IE' }],
      valid: ['IE1234567AW', '1234567AW'],
      invalid: ['IE 1234567', '1234567'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'IT' }],
      valid: ['IT12345678910', '12345678910'],
      invalid: [
        'IT12345678 910',
        'IT 123456789101',
        'IT123456789101',
        'GB12345678910',
        'IT123456789',
      ],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'LV' }],
      valid: ['LV12345678901', '12345678901'],
      invalid: ['LV 12345678901', '1234567890'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'LT' }],
      valid: [
        'LT123456789012',
        '123456789012',
        'LT12345678901',
        '12345678901',
        'LT1234567890',
        '1234567890',
        'LT123456789',
        '123456789',
      ],
      invalid: ['LT 123456789012', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'LU' }],
      valid: ['LU12345678', '12345678'],
      invalid: ['LU 12345678', '1234567'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'MT' }],
      valid: ['MT12345678', '12345678'],
      invalid: ['MT 12345678', '1234567'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'NL' }],
      valid: ['NL123456789B10', '123456789B10'],
      invalid: [
        'NL12345678 910',
        'NL 123456789101',
        'NL123456789B1',
        'GB12345678910',
        'NL123456789',
      ],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'PL' }],
      valid: [
        'PL1234567890',
        '1234567890',
        'PL123-456-78-90',
        '123-456-78-90',
        'PL123-45-67-890',
        '123-45-67-890',
      ],
      invalid: ['PL 1234567890', '123456789'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'PT' }],
      valid: ['PT123456789', '123456789'],
      invalid: ['PT 123456789', '000000001'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'RO' }],
      valid: ['RO1234567890', '1234567890', 'RO12', '12'],
      invalid: ['RO 12', '1'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'SK' }],
      valid: ['SK1234567890', '1234567890'],
      invalid: ['SK 1234567890', '123456789'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'SI' }],
      valid: ['SI12345678', '12345678'],
      invalid: ['SI 12345678', '1234567'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'ES' }],
      valid: ['ESA1234567A', 'A1234567A'],
      invalid: ['ES 1234567A', '123456789'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'SE' }],
      valid: ['SE123456789012', '123456789012'],
      invalid: ['SE 123456789012', '12345678901'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'AL' }],
      valid: ['AL123456789A', '123456789A'],
      invalid: ['AL 123456789A', '123456789'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'MK' }],
      valid: ['MK1234567890123', '1234567890123'],
      invalid: ['MK 1234567890123', '123456789012'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'AU' }],
      valid: [
        'AU53004085616',
        '53004085616',
        'AU65613309809',
        '65613309809',
        'AU34118972998',
        '34118972998',
      ],
      invalid: [
        'AU65613309808',
        '65613309808',
        'AU55613309809',
        '55613309809',
        'AU65613319809',
        '65613319809',
        'AU34117972998',
        '34117972998',
        'AU12345678901',
        '12345678901',
        'AU 12345678901',
        '1234567890',
      ],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'BY' }],
      valid: ['УНП 123456789', '123456789'],
      invalid: ['BY 123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'CA' }],
      valid: ['CA123456789', '123456789'],
      invalid: ['CA 123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'IS' }],
      valid: ['IS123456', '12345'],
      invalid: ['IS 12345', '1234'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'IN' }],
      valid: ['IN123456789012345', '123456789012345'],
      invalid: ['IN 123456789012345', '12345678901234'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'ID' }],
      valid: [
        'ID123456789012345',
        '123456789012345',
        'ID12.345.678.9-012.345',
        '12.345.678.9-012.345',
      ],
      invalid: ['ID 123456789012345', '12345678901234'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'IL' }],
      valid: ['IL123456789', '123456789'],
      invalid: ['IL 123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'KZ' }],
      valid: ['KZ123456789012', '123456789012'],
      invalid: ['KZ 123456789012', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'NZ' }],
      valid: ['NZ123456789', '123456789'],
      invalid: ['NZ 123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'NG' }],
      valid: ['NG123456789012', '123456789012', 'NG12345678-9012', '12345678-9012'],
      invalid: ['NG 123456789012', '12345678901'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'NO' }],
      valid: ['NO123456789MVA', '123456789MVA'],
      invalid: ['NO 123456789MVA', '123456789'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'PH' }],
      valid: ['PH123456789012', '123456789012', 'PH123 456 789 012', '123 456 789 012'],
      invalid: ['PH 123456789012', '12345678901'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'RU' }],
      valid: ['RU1234567890', '1234567890', 'RU123456789012', '123456789012'],
      invalid: ['RU 123456789012', '12345678901'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'SM' }],
      valid: ['SM12345', '12345'],
      invalid: ['SM 12345', '1234'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'SA' }],
      valid: ['SA123456789012345', '123456789012345'],
      invalid: ['SA 123456789012345', '12345678901234'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'RS' }],
      valid: ['RS123456789', '123456789'],
      invalid: ['RS 123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'CH' }],
      valid: [
        // strictly valid
        'CHE-116.281.710 MWST',
        'CHE-116.281.710 IVA',
        'CHE-116.281.710 TVA',
        // loosely valid presentation variants
        'CHE 116 281 710 IVA', // all separators are spaces
        'CHE-191.398.369MWST', // no space before suffix
        'CHE-116281710 MWST', // no number separators
        'CHE-116281710MWST', // no number separators and no space before suffix
        'CHE105854263MWST', // no separators
        'CHE-116.285.524', // no suffix (vat abbreviation)
        'CHE116281710', // no suffix and separators
        '116.281.710 TVA', // no prefix (CHE, ISO-3166-1 Alpha-3)
        '116281710MWST', // no prefix and separators
        '100.218.485', // no prefix and suffix
        '123456788', // no prefix, separators and suffix
      ],
      invalid: [
        'CH-116.281.710 MWST', // invalid prefix (should be CHE)
        'CHE-116.281 MWST', // invalid number of digits (should be 9)
        'CHE-123.456.789 MWST', // invalid last digit (should match the calculated check-number 8)
        'CHE-123.356.780 MWST', // invalid check-number (there are no swiss UIDs with the calculated check number 10)
        'CH-116.281.710 VAT', // invalid suffix (should be MWST, IVA or TVA)
        'CHE-116/281/710 IVA', // invalid number separators (should be all dots or all spaces)
      ],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'TR' }],
      valid: ['TR1234567890', '1234567890'],
      invalid: ['TR 1234567890', '123456789'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'UA' }],
      valid: ['UA123456789012', '123456789012'],
      invalid: ['UA 123456789012', '12345678901'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'GB' }],
      valid: [
        'GB999 9999 00',
        'GB999 9999 96',
        'GB999999999 999',
        'GBGD000',
        'GBGD499',
        'GBHA500',
        'GBHA999',
      ],
      invalid: [
        'GB999999900',
        'GB999999996',
        'GB999 9999 97',
        'GB999999999999',
        'GB999999999 9999',
        'GB9999999999 999',
        'GBGD 000',
        'GBGD 499',
        'GBHA 500',
        'GBHA 999',
        'GBGD500',
        'GBGD999',
        'GBHA000',
        'GBHA499',
      ],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'UZ' }],
      valid: ['UZ123456789', '123456789'],
      invalid: ['UZ 123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'AR' }],
      valid: ['AR12345678901', '12345678901'],
      invalid: ['AR 12345678901', '1234567890'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'BO' }],
      valid: ['BO1234567', '1234567'],
      invalid: ['BO 1234567', '123456'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'BR' }],
      valid: ['BR12.345.678/9012-34', '12.345.678/9012-34', 'BR123.456.789-01', '123.456.789-01'],
      invalid: ['BR 12.345.678/9012-34', '12345678901234'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'CL' }],
      valid: ['CL12345678-9', '12345678-9'],
      invalid: ['CL 12345678-9', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'CO' }],
      valid: ['CO1234567890', '1234567890'],
      invalid: ['CO 1234567890', '123456789'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'CR' }],
      valid: ['CR123456789012', '123456789012', 'CR123456789', '123456789'],
      invalid: ['CR 123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'EC' }],
      valid: ['EC1234567890123', '1234567890123'],
      invalid: ['EC 1234567890123', '123456789012'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'SV' }],
      valid: ['SV1234-567890-123-1', '1234-567890-123-1'],
      invalid: ['SV 1234-567890-123-1', '1234567890123'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'GT' }],
      valid: ['GT1234567-8', '1234567-8'],
      invalid: ['GT 1234567-8', '1234567'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'HN' }],
      valid: ['HN'],
      invalid: ['HN '],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'MX' }],
      valid: ['MXABCD123456EFG', 'ABCD123456EFG', 'MXABC123456DEF', 'ABC123456DEF'],
      invalid: ['MX ABC123456EFG', '123456'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'NI' }],
      valid: ['NI123-456789-0123A', '123-456789-0123A'],
      invalid: ['NI 123-456789-0123A', '1234567890123'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'PA' }],
      // structural check only — see isVAT.ts
      valid: ['PA8-123-4567', '8-123-4567', 'PA155596713-2-2015'],
      invalid: ['', 'PA', 'PA ', 'PA-', 'PA8 123'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'PY' }],
      valid: ['PY12345678-9', '12345678-9', 'PY123456-7', '123456-7'],
      invalid: ['PY 123456-7', '123456'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'PE' }],
      valid: ['PE12345678901', '12345678901'],
      invalid: ['PE 12345678901', '1234567890'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'DO' }],
      valid: [
        'DO12345678901',
        '12345678901',
        'DO123-4567890-1',
        '123-4567890-1',
        'DO123456789',
        '123456789',
        'DO1-23-45678-9',
        '1-23-45678-9',
      ],
      invalid: ['DO 12345678901', '1234567890'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'UY' }],
      valid: ['UY123456789012', '123456789012'],
      invalid: ['UY 123456789012', '12345678901'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'VE' }],
      valid: ['VEJ-123456789', 'J-123456789', 'VEJ-12345678-9', 'J-12345678-9'],
      invalid: ['VE J-123456789', '12345678'],
    });
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'invalidCountryCode' }],
      error: ['GB999 9999 00'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isVAT',
      args: [{ countryCode: 'AT' }],
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});
