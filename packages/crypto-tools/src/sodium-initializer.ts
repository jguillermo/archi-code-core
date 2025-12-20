export class SodiumInitializer {
  private static initializedPromise: Promise<void> | null = null;
  private static sodium: any = null;

  public static async ensureInitialized(): Promise<void> {
    if (!this.initializedPromise) {
      this.sodium = require('libsodium-wrappers-sumo');
      this.initializedPromise = this.sodium.ready
        .then(() => {
          console.debug('Sodium successfully initialized.');
        })
        .catch((error) => {
          console.error('Failed to initialize Sodium:', error);
          throw error;
        });
    }
    await this.initializedPromise;
  }

  public static async getSodium(): Promise<any> {
    await this.ensureInitialized();
    if (!this.sodium) {
      throw new Error('libsodium-wrappers-sumo is not available. Please install it if needed.');
    }
    return this.sodium;
  }
}
