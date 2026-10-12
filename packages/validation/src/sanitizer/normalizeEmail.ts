import { merge } from '../helpers/merge';
import { assertString } from '../helpers/assertString';

export interface NormalizeEmailOptions {
  all_lowercase?: boolean;
  gmail_lowercase?: boolean;
  gmail_remove_dots?: boolean;
  gmail_remove_subaddress?: boolean;
  gmail_convert_googlemaildotcom?: boolean;
  outlookdotcom_lowercase?: boolean;
  outlookdotcom_remove_subaddress?: boolean;
  yahoo_lowercase?: boolean;
  yahoo_remove_subaddress?: boolean;
  yandex_lowercase?: boolean;
  yandex_convert_yandexru?: boolean;
  icloud_lowercase?: boolean;
  icloud_remove_subaddress?: boolean;
}

const default_normalize_email_options = {
  all_lowercase: true,
  gmail_lowercase: true,
  gmail_remove_dots: true,
  gmail_remove_subaddress: true,
  gmail_convert_googlemaildotcom: true,
  outlookdotcom_lowercase: true,
  outlookdotcom_remove_subaddress: true,
  yahoo_lowercase: true,
  yahoo_remove_subaddress: true,
  yandex_lowercase: true,
  yandex_convert_yandexru: true,
  icloud_lowercase: true,
  icloud_remove_subaddress: true,
};

const icloud_domains = ['icloud.com', 'me.com'];

const outlookdotcom_domains = [
  'hotmail.at',
  'hotmail.be',
  'hotmail.ca',
  'hotmail.cl',
  'hotmail.co.il',
  'hotmail.co.nz',
  'hotmail.co.th',
  'hotmail.co.uk',
  'hotmail.com',
  'hotmail.com.ar',
  'hotmail.com.au',
  'hotmail.com.br',
  'hotmail.com.gr',
  'hotmail.com.mx',
  'hotmail.com.pe',
  'hotmail.com.tr',
  'hotmail.com.vn',
  'hotmail.cz',
  'hotmail.de',
  'hotmail.dk',
  'hotmail.es',
  'hotmail.fr',
  'hotmail.hu',
  'hotmail.id',
  'hotmail.ie',
  'hotmail.in',
  'hotmail.it',
  'hotmail.jp',
  'hotmail.kr',
  'hotmail.lv',
  'hotmail.my',
  'hotmail.ph',
  'hotmail.pt',
  'hotmail.sa',
  'hotmail.sg',
  'hotmail.sk',
  'live.be',
  'live.co.uk',
  'live.com',
  'live.com.ar',
  'live.com.mx',
  'live.de',
  'live.es',
  'live.eu',
  'live.fr',
  'live.it',
  'live.nl',
  'msn.com',
  'outlook.at',
  'outlook.be',
  'outlook.cl',
  'outlook.co.il',
  'outlook.co.nz',
  'outlook.co.th',
  'outlook.com',
  'outlook.com.ar',
  'outlook.com.au',
  'outlook.com.br',
  'outlook.com.gr',
  'outlook.com.pe',
  'outlook.com.tr',
  'outlook.com.vn',
  'outlook.cz',
  'outlook.de',
  'outlook.dk',
  'outlook.es',
  'outlook.fr',
  'outlook.hu',
  'outlook.id',
  'outlook.ie',
  'outlook.in',
  'outlook.it',
  'outlook.jp',
  'outlook.kr',
  'outlook.lv',
  'outlook.my',
  'outlook.ph',
  'outlook.pt',
  'outlook.sa',
  'outlook.sg',
  'outlook.sk',
  'passport.com',
];

const yahoo_domains = [
  'rocketmail.com',
  'yahoo.ca',
  'yahoo.co.uk',
  'yahoo.com',
  'yahoo.de',
  'yahoo.fr',
  'yahoo.in',
  'yahoo.it',
  'ymail.com',
];

const yandex_domains = ['yandex.ru', 'yandex.ua', 'yandex.kz', 'yandex.com', 'yandex.by', 'ya.ru'];

function removeSingleDotKeepRuns(match: string): string {
  if (match.length > 1) {
    return match;
  }
  return '';
}

export function normalizeEmail(email: string, options?: NormalizeEmailOptions): string | false {
  assertString(email);
  const opts = merge(options, default_normalize_email_options);

  const raw_parts = email.split('@');
  if (raw_parts.length < 2) {
    return false;
  }
  const domain = raw_parts.pop() as string;
  const user = raw_parts.join('@');
  const parts: [string, string] = [user, domain];

  parts[1] = parts[1].toLowerCase();

  if (parts[1] === 'gmail.com' || parts[1] === 'googlemail.com') {
    if (opts.gmail_remove_subaddress) {
      parts[0] = parts[0].split('+')[0];
    }
    if (opts.gmail_remove_dots) {
      parts[0] = parts[0].replace(/\.+/g, removeSingleDotKeepRuns);
    }
    if (!parts[0].length) {
      return false;
    }
    if (opts.all_lowercase || opts.gmail_lowercase) {
      parts[0] = parts[0].toLowerCase();
    }
    parts[1] = opts.gmail_convert_googlemaildotcom ? 'gmail.com' : parts[1];
  } else if (icloud_domains.indexOf(parts[1]) >= 0) {
    if (opts.icloud_remove_subaddress) {
      parts[0] = parts[0].split('+')[0];
    }
    if (!parts[0].length) {
      return false;
    }
    if (opts.all_lowercase || opts.icloud_lowercase) {
      parts[0] = parts[0].toLowerCase();
    }
  } else if (outlookdotcom_domains.indexOf(parts[1]) >= 0) {
    if (opts.outlookdotcom_remove_subaddress) {
      parts[0] = parts[0].split('+')[0];
    }
    if (!parts[0].length) {
      return false;
    }
    if (opts.all_lowercase || opts.outlookdotcom_lowercase) {
      parts[0] = parts[0].toLowerCase();
    }
  } else if (yahoo_domains.indexOf(parts[1]) >= 0) {
    if (opts.yahoo_remove_subaddress) {
      const components = parts[0].split('-');
      parts[0] = components.length > 1 ? components.slice(0, -1).join('-') : components[0];
    }
    if (!parts[0].length) {
      return false;
    }
    if (opts.all_lowercase || opts.yahoo_lowercase) {
      parts[0] = parts[0].toLowerCase();
    }
  } else if (yandex_domains.indexOf(parts[1]) >= 0) {
    if (opts.all_lowercase || opts.yandex_lowercase) {
      parts[0] = parts[0].toLowerCase();
    }
    parts[1] = opts.yandex_convert_yandexru ? 'yandex.ru' : parts[1];
  } else if (opts.all_lowercase) {
    parts[0] = parts[0].toLowerCase();
  }
  return parts.join('@');
}
