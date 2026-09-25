import type { IsTimeOptions } from '../types';
import merge from './util/merge';
import tryToString from './util/tryToString';
import { ValidationConfigError } from './util/errors';
import hasOwn from './util/hasOwn';

const default_time_options = {
  hourFormat: 'hour24',
  mode: 'default',
};

const formats = {
  hour24: {
    default: /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/,
    withSeconds: /^([01]?[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/,
    withOptionalSeconds: /^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$/,
  },
  hour12: {
    default: /^(0?[1-9]|1[0-2]):([0-5][0-9]) (A|P)M$/,
    withSeconds: /^(0?[1-9]|1[0-2]):([0-5][0-9]):([0-5][0-9]) (A|P)M$/,
    withOptionalSeconds: /^(0?[1-9]|1[0-2]):([0-5][0-9])(?::([0-5][0-9]))? (A|P)M$/,
  },
};

export default function isTime(input: unknown, options?: IsTimeOptions | null): boolean {
  const { hourFormat, mode } = merge(options, default_time_options);
  if (!hasOwn(formats, hourFormat))
    throw new ValidationConfigError(`Invalid hourFormat '${hourFormat}'`);
  const byMode = formats[hourFormat];
  if (!hasOwn(byMode, mode)) throw new ValidationConfigError(`Invalid mode '${mode}'`);
  const s = tryToString(input);
  if (s === false) return false;
  return byMode[mode].test(s);
}
