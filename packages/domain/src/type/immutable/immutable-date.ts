const DATE_SETTERS = [
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

export class ImmutableDate extends Date {
  constructor(date: Date) {
    super(date.getTime());
    Object.freeze(this);
  }
}

for (const setter of DATE_SETTERS) {
  Object.defineProperty(ImmutableDate.prototype, setter, {
    value(): never {
      throw new TypeError(`Cannot call ${setter}: the date is immutable`);
    },
  });
}
