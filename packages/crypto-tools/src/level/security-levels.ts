import { callCrypto } from '../worker/workers';
import type { SecurityLevels } from './security-level';

export async function securityLevels(): Promise<SecurityLevels> {
  return JSON.parse(await callCrypto('securityLevels')) as SecurityLevels;
}
