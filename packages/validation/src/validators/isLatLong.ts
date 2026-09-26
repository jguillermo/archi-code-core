import { toString } from '../convert/string';
import { merge } from '../helpers/merge';

export interface IsLatLongOptions {
  checkDMS?: boolean;
}
const lat = /^\(?[+-]?(90(\.0+)?|[1-8]?\d(\.\d+)?)$/;
const long = /^\s?[+-]?(180(\.0+)?|1[0-7]\d(\.\d+)?|\d{1,2}(\.\d+)?)\)?$/;

const latDMS = /^(([1-8]?\d)\D+([1-5]?\d|60)\D+([1-5]?\d|60)(\.\d+)?|90\D+0\D+0)\D+[NSns]?$/i;
const longDMS =
  /^\s*([1-7]?\d{1,2}\D+([1-5]?\d|60)\D+([1-5]?\d|60)(\.\d+)?|180\D+0\D+0)\D+[EWew]?$/i;

const defaultLatLongOptions = {
  checkDMS: false,
};

export function isLatLong(str: unknown, options?: IsLatLongOptions): boolean {
  const stringResult = toString(str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  options = merge(options, defaultLatLongOptions);

  const pair = s.split(',');
  // Exactly "lat,long": anything after a second comma (`'1,2,<script>'`) used to be ignored.
  if (pair.length !== 2) return false;
  if (
    (pair[0].startsWith('(') && !pair[1].endsWith(')')) ||
    (pair[1].endsWith(')') && !pair[0].startsWith('('))
  )
    return false;

  if (options.checkDMS) {
    return latDMS.test(pair[0]) && longDMS.test(pair[1]);
  }
  return lat.test(pair[0]) && long.test(pair[1]);
}
