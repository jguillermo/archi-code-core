export class ImmutableDate extends Date {
  private static readonly setters = [
    'setDate',
    'setFullYear',
    'setHours',
    'setMilliseconds',
    'setMinutes',
    'setMonth',
    'setSeconds',
    'setTime',
    'setUTCDate',
    'setUTCFullYear',
    'setUTCHours',
    'setUTCMilliseconds',
    'setUTCMinutes',
    'setUTCMonth',
    'setUTCSeconds',
    'setYear',
  ];

  static {
    for (const setter of ImmutableDate.setters) {
      Object.defineProperty(ImmutableDate.prototype, setter, {
        value(): never {
          throw new TypeError(`Cannot call ${setter}: the date is immutable`);
        },
      });
    }
  }

  constructor(date: Date) {
    super(date.getTime());
    Object.freeze(this);
  }
}
