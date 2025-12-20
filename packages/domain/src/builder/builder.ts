export type IBuilder<T> = {
  [P in keyof T]-?: (value: T[P]) => IBuilder<T>;
} & {
  build(): T;
};

type Constructor<T> = new (...args: unknown[]) => T;

export function Builder<T>(cls: Constructor<T>, defaults?: Partial<T>, overrides?: Partial<T>): IBuilder<T> {
  if (typeof cls !== 'function') {
    throw new Error('The first argument to Builder must be a valid class constructor.');
  }
  const accumulatedValues: Record<string, unknown> = defaults ? { ...defaults } : {};

  const proxyHandler = new Proxy(
    {},
    {
      get(_, property) {
        if (property === 'build') {
          return () => {
            if (overrides) {
              Object.assign(accumulatedValues, overrides);
            }
            const instance = new cls();
            return Object.assign(instance as Record<string, unknown>, accumulatedValues) as T;
          };
        }

        return (value: unknown) => {
          accumulatedValues[property.toString()] = value;
          return proxyHandler;
        };
      },
    },
  );

  return proxyHandler as IBuilder<T>;
}
