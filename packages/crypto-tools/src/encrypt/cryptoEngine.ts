export class CryptoEngine {
  private CHARACTER_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  private CHARACTER_SET_LENGTH = this.CHARACTER_SET.length;

  private plugboardMapping: Map<number, number>;
  private reflectorMap: number[];
  private wheels: { mapping: number[]; turnover: number; position: number }[];
  private initialWheelPositions: number[];

  constructor(seedKey: string) {
    const encodedSeedKey = this.toBase64(seedKey);
    this.plugboardMapping = this.createPlugboardMapping(encodedSeedKey);
    this.reflectorMap = this.createReflectorMap(encodedSeedKey);
    this.wheels = this.createWheels(encodedSeedKey);
    this.initialWheelPositions = this.wheels.map((wheel) => wheel.position);
  }

  private toBase64(input: string): string {
    return Buffer.from(input, 'utf-8').toString('base64');
  }

  private fromBase64(input: string): string {
    return Buffer.from(input, 'base64').toString('utf-8');
  }

  public resetWheels(): void {
    this.wheels.forEach((wheel, index) => {
      wheel.position = this.initialWheelPositions[index];
    });
  }

  private charToIndex(char: string): number {
    return this.CHARACTER_SET.indexOf(char);
  }

  private indexToChar(index: number): string {
    return this.CHARACTER_SET[index % this.CHARACTER_SET_LENGTH];
  }

  private keyToSeed(key: string): number {
    let seed = 0;
    for (const char of key) {
      seed = (seed * 31 + char.charCodeAt(0)) % 233280;
    }
    return seed;
  }

  private createRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  private createPlugboardMapping(seedKey: string): Map<number, number> {
    const mapping = new Map<number, number>();
    const random = this.createRandom(this.keyToSeed(seedKey));

    const indices = Array.from({ length: this.CHARACTER_SET_LENGTH }, (_, i) => i);
    while (indices.length > 1) {
      const a = indices.splice(Math.floor(random() * indices.length), 1)[0];
      const b = indices.splice(Math.floor(random() * indices.length), 1)[0];
      mapping.set(a, b);
      mapping.set(b, a);
    }

    return mapping;
  }

  private createReflectorMap(seedKey: string): number[] {
    const random = this.createRandom(this.keyToSeed(seedKey + '_reflector'));
    const indices = Array.from({ length: this.CHARACTER_SET_LENGTH }, (_, i) => i);
    const mapping = new Array<number>(this.CHARACTER_SET_LENGTH);

    while (indices.length > 1) {
      const a = indices.splice(Math.floor(random() * indices.length), 1)[0];
      const b = indices.splice(Math.floor(random() * indices.length), 1)[0];
      mapping[a] = b;
      mapping[b] = a;
    }

    if (indices.length === 1) {
      const remaining = indices[0];
      mapping[remaining] = remaining;
    }

    return mapping;
  }

  private createWheels(seedKey: string) {
    const firstNumberInKey = parseInt(seedKey.match(/\d+/)?.[0] || '0', 10);
    const numWheels = firstNumberInKey + 3;

    return Array.from({ length: numWheels }, (_, i) => {
      const random = this.createRandom(this.keyToSeed(seedKey + i));
      const mapping = Array.from({ length: this.CHARACTER_SET_LENGTH }, (_, i) => i).sort(() => random() - 0.5);
      const turnover = Math.floor(random() * this.CHARACTER_SET_LENGTH);
      const position = Math.floor(random() * this.CHARACTER_SET_LENGTH);

      return { mapping, turnover, position };
    });
  }

  private advanceWheels(): void {
    for (let i = this.wheels.length - 1; i >= 0; i--) {
      if (i === this.wheels.length - 1 || this.wheels[i + 1].position === this.wheels[i + 1].turnover) {
        this.wheels[i].position = (this.wheels[i].position + 1) % this.CHARACTER_SET_LENGTH;
      } else {
        break;
      }
    }
  }

  private forwardThroughWheel(index: number, wheel: { mapping: number[]; position: number }): number {
    const shiftedIndex = (index + wheel.position) % this.CHARACTER_SET_LENGTH;
    return (wheel.mapping[shiftedIndex] - wheel.position + this.CHARACTER_SET_LENGTH) % this.CHARACTER_SET_LENGTH;
  }

  private backwardThroughWheel(index: number, wheel: { mapping: number[]; position: number }): number {
    return (wheel.mapping.indexOf((index + wheel.position) % this.CHARACTER_SET_LENGTH) - wheel.position + this.CHARACTER_SET_LENGTH) % this.CHARACTER_SET_LENGTH;
  }

  encode(message: string): string {
    this.resetWheels();
    return this.transform(this.toBase64(message));
  }

  decode(message: string): string {
    this.resetWheels();
    return this.fromBase64(this.transform(message));
  }

  private transform(message: string): string {
    return message
      .split('')
      .map((char) => {
        if (!this.CHARACTER_SET.includes(char)) return char;

        let index = this.charToIndex(char);
        this.advanceWheels();

        index = this.plugboardMapping.get(index) ?? index;

        for (const wheel of this.wheels) {
          index = this.forwardThroughWheel(index, wheel);
        }

        index = this.reflectorMap[index];

        for (const wheel of [...this.wheels].reverse()) {
          index = this.backwardThroughWheel(index, wheel);
        }

        index = this.plugboardMapping.get(index) ?? index;

        return this.indexToChar(index);
      })
      .join('');
  }
}
