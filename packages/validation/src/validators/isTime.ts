import type { IsTimeOptions } from '../types';
import merge from './util/merge';

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

export default function isTime(input: unknown, options?: IsTimeOptions): boolean {
  const mergedOptions = merge(options, default_time_options);
  if (typeof input !== 'string') return false;
  return formats[mergedOptions.hourFormat][mergedOptions.mode].test(input);
}
