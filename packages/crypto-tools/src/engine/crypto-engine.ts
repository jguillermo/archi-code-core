import { requireText } from '../wasm/input';
import { callCrypto } from '../worker/workers';

export class CryptoEngine {
  private readonly seedKey: string;

  constructor(seedKey: string) {
    this.seedKey = requireText(seedKey, 'seedKey');
  }

  async encode(message: string): Promise<string> {
    return callCrypto('engineEncode', this.seedKey, requireText(message, 'message'));
  }

  async decode(message: string): Promise<string> {
    return callCrypto('engineDecode', this.seedKey, requireText(message, 'message'));
  }
}
