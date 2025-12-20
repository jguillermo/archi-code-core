import { PasswordEncryptor } from '../password-encryptor';
import { SodiumInitializer } from '../../sodium-initializer';

export class SodiumPasswordEncryptor extends PasswordEncryptor {
  private getOpsAndMemLimits(sodium): { opslimit: number; memlimit: number } {
    if (this._saltRounds <= 10) {
      return {
        opslimit: sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        memlimit: sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      };
    } else if (this._saltRounds <= 20) {
      return {
        opslimit: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        memlimit: sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      };
    } else {
      return {
        opslimit: sodium.crypto_pwhash_OPSLIMIT_SENSITIVE,
        memlimit: sodium.crypto_pwhash_MEMLIMIT_SENSITIVE,
      };
    }
  }

  async hashPassword(password: string): Promise<string> {
    const sodium = await SodiumInitializer.getSodium();
    const { opslimit, memlimit } = this.getOpsAndMemLimits(sodium);

    return sodium.crypto_pwhash_str(password, opslimit, memlimit);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const sodium = await SodiumInitializer.getSodium();
    return sodium.crypto_pwhash_str_verify(hash, password);
  }
}
