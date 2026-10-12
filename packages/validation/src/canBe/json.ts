import { toJson } from '../convert/json';

export function canBeJson(v: unknown): boolean {
  return toJson(v).ok;
}

export const canBeJsonObject = canBeJson;
