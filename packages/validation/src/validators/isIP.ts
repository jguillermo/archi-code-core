import { toString } from '../convert/string';
import { optionsOf } from '../helpers/config';

export type IsIPVersion = 4 | 6 | '4' | '6' | (number & {}) | (string & {});

export interface IsIPOptions {
  version?: IsIPVersion;
}

const IPv4SegmentFormat = '(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])';
const IPv4AddressFormat = `(${IPv4SegmentFormat}[.]){3}${IPv4SegmentFormat}`;
const IPv4AddressRegExp = new RegExp(`^${IPv4AddressFormat}$`);

const IPv6SegmentFormat = '(?:[0-9a-fA-F]{1,4})';
// RFC 4007 section 11.3 zone index, e.g. fe80::1234%1 or fe80::1234%ne0
const optionalIPv6ZoneIdFormat = '(%[0-9a-zA-Z.]{1,})?';
const IPv6AddressRegExp = new RegExp(
  '^(' +
    `(?:${IPv6SegmentFormat}:){7}(?:${IPv6SegmentFormat}|:)|` +
    `(?:${IPv6SegmentFormat}:){6}(?:${IPv4AddressFormat}|:${IPv6SegmentFormat}|:)|` +
    `(?:${IPv6SegmentFormat}:){5}(?::${IPv4AddressFormat}|(:${IPv6SegmentFormat}){1,2}|:)|` +
    `(?:${IPv6SegmentFormat}:){4}(?:(:${IPv6SegmentFormat}){0,1}:${IPv4AddressFormat}|(:${IPv6SegmentFormat}){1,3}|:)|` +
    `(?:${IPv6SegmentFormat}:){3}(?:(:${IPv6SegmentFormat}){0,2}:${IPv4AddressFormat}|(:${IPv6SegmentFormat}){1,4}|:)|` +
    `(?:${IPv6SegmentFormat}:){2}(?:(:${IPv6SegmentFormat}){0,3}:${IPv4AddressFormat}|(:${IPv6SegmentFormat}){1,5}|:)|` +
    `(?:${IPv6SegmentFormat}:){1}(?:(:${IPv6SegmentFormat}){0,4}:${IPv4AddressFormat}|(:${IPv6SegmentFormat}){1,6}|:)|` +
    `(?::((?::${IPv6SegmentFormat}){0,5}:${IPv4AddressFormat}|(?::${IPv6SegmentFormat}){1,7}|:))` +
    `)${optionalIPv6ZoneIdFormat}$`,
);

export function isIP(value: unknown, options?: IsIPOptions): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const ip: string = s;

  const version = optionsOf(options).version || '';

  if (!version) {
    return IPv4AddressRegExp.test(ip) || IPv6AddressRegExp.test(ip);
  }

  if (version.toString() === '4') {
    return IPv4AddressRegExp.test(ip);
  }

  if (version.toString() === '6') {
    return IPv6AddressRegExp.test(ip);
  }

  return false;
}
