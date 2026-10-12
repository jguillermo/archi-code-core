import * as sanitizer from '../../src/sanitizer';
import { test } from '../cross/support/sanitizerTest';

describe('Sanitizers', () => {
  it('should normalize an email based on domain', () => {
    test({
      sanitizer: 'normalizeEmail',
      expect: {
        'test@me.com': 'test@me.com',
        'some.name@gmail.com': 'somename@gmail.com',
        'some.name@googleMail.com': 'somename@gmail.com',
        'some.name+extension@gmail.com': 'somename@gmail.com',
        'some.Name+extension@GoogleMail.com': 'somename@gmail.com',
        'some.name.middleName+extension@gmail.com': 'somenamemiddlename@gmail.com',
        'some.name.middleName+extension@GoogleMail.com': 'somenamemiddlename@gmail.com',
        'some.name.midd.leNa.me.+extension@gmail.com': 'somenamemiddlename@gmail.com',
        'some.name.midd.leNa.me.+extension@GoogleMail.com': 'somenamemiddlename@gmail.com',
        'some.name+extension@unknown.com': 'some.name+extension@unknown.com',
        'hans@m端ller.com': 'hans@m端ller.com',
        'some.name.midd..leNa...me...+extension@GoogleMail.com':
          'somenamemidd..lena...me...@gmail.com',
        'matthew..example@gmail.com': 'matthew..example@gmail.com',
        '"foo@bar"@baz.com': '"foo@bar"@baz.com',
        'test@ya.ru': 'test@yandex.ru',
        'test@yandex.kz': 'test@yandex.ru',
        'test@yandex.ru': 'test@yandex.ru',
        'test@yandex.ua': 'test@yandex.ru',
        'test@yandex.com': 'test@yandex.ru',
        'test@yandex.by': 'test@yandex.ru',
        '@gmail.com': false,
        '@icloud.com': false,
        '@outlook.com': false,
        '@yahoo.com': false,
      },
    });

    test({
      sanitizer: 'normalizeEmail',
      args: [{ all_lowercase: false }],
      expect: {
        'test@foo.com': 'test@foo.com',
        'hans@m端ller.com': 'hans@m端ller.com',
        'test@FOO.COM': 'test@foo.com',
        'blAH@x.com': 'blAH@x.com',
        'TEST@me.com': 'test@me.com',
        'TEST@ME.COM': 'test@me.com',
        'SOME.name@GMAIL.com': 'somename@gmail.com',
        'SOME.name.middleName+extension@GoogleMail.com': 'somenamemiddlename@gmail.com',
        'SOME.name.midd.leNa.me.+extension@gmail.com': 'somenamemiddlename@gmail.com',
        'SOME.name@gmail.com': 'somename@gmail.com',
        'SOME.name@yahoo.ca': 'some.name@yahoo.ca',
        'SOME.name@outlook.ie': 'some.name@outlook.ie',
        'SOME.name@me.com': 'some.name@me.com',
        'SOME.name@yandex.ru': 'some.name@yandex.ru',
      },
    });

    test({
      sanitizer: 'normalizeEmail',
      args: [
        {
          all_lowercase: false,
          gmail_lowercase: false,
          icloud_lowercase: false,
          outlookdotcom_lowercase: false,
          yahoo_lowercase: false,
          yandex_lowercase: false,
        },
      ],
      expect: {
        'TEST@FOO.COM': 'TEST@foo.com',
        'ME@gMAil.com': 'ME@gmail.com',
        'ME@me.COM': 'ME@me.com',
        'ME@icloud.COM': 'ME@icloud.com',
        'ME@outlook.COM': 'ME@outlook.com',
        'JOHN@live.CA': 'JOHN@live.ca',
        'ME@ymail.COM': 'ME@ymail.com',
        'ME@yandex.RU': 'ME@yandex.ru',
      },
    });

    test({
      sanitizer: 'normalizeEmail',
      args: [
        {
          all_lowercase: true,
          gmail_lowercase: false,
          icloud_lowercase: false,
          outlookdotcom_lowercase: false,
          yahoo_lowercase: false,
        },
      ],
      expect: {
        'TEST@FOO.COM': 'test@foo.com',
        'ME@gMAil.com': 'me@gmail.com',
        'ME@me.COM': 'me@me.com',
        'ME@icloud.COM': 'me@icloud.com',
        'ME@outlook.COM': 'me@outlook.com',
        'JOHN@live.CA': 'john@live.ca',
        'ME@ymail.COM': 'me@ymail.com',
      },
    });

    test({
      sanitizer: 'normalizeEmail',
      args: [
        {
          gmail_remove_dots: false,
        },
      ],
      expect: {
        'SOME.name@GMAIL.com': 'some.name@gmail.com',
        'SOME.name+me@GMAIL.com': 'some.name@gmail.com',
        'my.self@foo.com': 'my.self@foo.com',
      },
    });

    test({
      sanitizer: 'normalizeEmail',
      args: [
        {
          gmail_remove_dots: true,
        },
      ],
      expect: {
        'SOME.name@GMAIL.com': 'somename@gmail.com',
        'SOME.name+me@GMAIL.com': 'somename@gmail.com',
        'some.name..multiple@gmail.com': 'somename..multiple@gmail.com',
        'my.self@foo.com': 'my.self@foo.com',
      },
    });

    test({
      sanitizer: 'normalizeEmail',
      args: [
        {
          gmail_remove_subaddress: false,
          icloud_remove_subaddress: false,
          outlookdotcom_remove_subaddress: false,
          yahoo_remove_subaddress: false,
        },
      ],
      expect: {
        'foo+bar@unknown.com': 'foo+bar@unknown.com',
        'foo+bar@gmail.com': 'foo+bar@gmail.com',
        'foo+bar@me.com': 'foo+bar@me.com',
        'foo+bar@icloud.com': 'foo+bar@icloud.com',
        'foo+bar@live.fr': 'foo+bar@live.fr',
        'foo+bar@hotmail.co.uk': 'foo+bar@hotmail.co.uk',
        'foo-bar@yahoo.com': 'foo-bar@yahoo.com',
        'foo+bar@yahoo.com': 'foo+bar@yahoo.com',
      },
    });

    test({
      sanitizer: 'normalizeEmail',
      args: [
        {
          gmail_remove_subaddress: true,
          icloud_remove_subaddress: true,
          outlookdotcom_remove_subaddress: true,
          yahoo_remove_subaddress: true,
        },
      ],
      expect: {
        'foo+bar@unknown.com': 'foo+bar@unknown.com',
        'foo+bar@gmail.com': 'foo@gmail.com',
        'foo+bar@me.com': 'foo@me.com',
        'foo+bar@icloud.com': 'foo@icloud.com',
        'foo+bar@live.fr': 'foo@live.fr',
        'foo+bar@hotmail.co.uk': 'foo@hotmail.co.uk',
        'foo-bar@yahoo.com': 'foo@yahoo.com',
        'foo+bar@yahoo.com': 'foo+bar@yahoo.com',
      },
    });

    test({
      sanitizer: 'normalizeEmail',
      args: [
        {
          gmail_convert_googlemaildotcom: false,
        },
      ],
      expect: {
        'SOME.name@GMAIL.com': 'somename@gmail.com',
        'SOME.name+me@GMAIL.com': 'somename@gmail.com',
        'SOME.name+me@googlemail.com': 'somename@googlemail.com',
        'SOME.name+me@googlemail.COM': 'somename@googlemail.com',
        'SOME.name+me@googlEmail.com': 'somename@googlemail.com',
        'my.self@foo.com': 'my.self@foo.com',
      },
    });

    test({
      sanitizer: 'normalizeEmail',
      args: [
        {
          gmail_convert_googlemaildotcom: true,
        },
      ],
      expect: {
        'SOME.name@GMAIL.com': 'somename@gmail.com',
        'SOME.name+me@GMAIL.com': 'somename@gmail.com',
        'SOME.name+me@googlemail.com': 'somename@gmail.com',
        'SOME.name+me@googlemail.COM': 'somename@gmail.com',
        'SOME.name+me@googlEmail.com': 'somename@gmail.com',
        'my.self@foo.com': 'my.self@foo.com',
      },
    });

    test({
      sanitizer: 'normalizeEmail',
      args: [
        {
          yandex_convert_yandexru: false,
        },
      ],
      expect: {
        'test@yandex.kz': 'test@yandex.kz',
        'test@yandex.ru': 'test@yandex.ru',
        'test@yandex.ua': 'test@yandex.ua',
        'test@yandex.com': 'test@yandex.com',
        'test@yandex.by': 'test@yandex.by',
      },
    });

    test({
      sanitizer: 'normalizeEmail',
      args: [
        {
          yandex_convert_yandexru: true,
        },
      ],
      expect: {
        'test@yandex.kz': 'test@yandex.ru',
        'test@yandex.ru': 'test@yandex.ru',
        'test@yandex.ua': 'test@yandex.ru',
        'test@yandex.com': 'test@yandex.ru',
        'test@yandex.by': 'test@yandex.ru',
      },
    });
  });
});

describe('normalizeEmail input contract', () => {
  it('non-strings throw a clear TypeError; strings without "@" → false', () => {
    expect(() => sanitizer.normalizeEmail(null as unknown as string)).toThrow(TypeError);
    expect(() => sanitizer.normalizeEmail(null as unknown as string)).toThrow(/Expected a string/);
    expect(sanitizer.normalizeEmail('NoAt')).toBe(false);
    expect(sanitizer.normalizeEmail('A@Example.COM')).toBe('a@example.com');
  });
});
