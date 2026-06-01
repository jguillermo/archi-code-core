export default function assertString(input: unknown = undefined): asserts input is string {
  if (input === undefined || input === null)
    throw new TypeError(`Expected a string but received a ${input}`);
  if (typeof input !== 'string')
    throw new TypeError(`Expected a string but received a ${typeof input}`);
}
