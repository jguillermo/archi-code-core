export abstract class DtoObjectMother<T extends object> {
  static create<T extends object>(
    this: new () => DtoObjectMother<T>,
    level: number,
    override: Partial<T> = {},
    exclude: (keyof T)[] = [],
  ): T {
    const instance = new this();
    const defaultValues = instance.getDefaultValues();
    const activeProperties = instance.filterPropertiesByLevel(
      instance.getPropertiesByLevel(),
      level,
    );

    const finalProperties = Array.from(new Set([...activeProperties, ...Object.keys(override)]));

    const result = finalProperties.reduce((dto, key) => {
      if (!exclude.includes(key as keyof T)) {
        dto[key as keyof T] = override[key as keyof T] ?? defaultValues[key as keyof T];
      }
      return dto;
    }, {} as Partial<T>);

    result['levelValidation'] = level;

    return Object.assign(instance.getNewDto(), result);
  }

  abstract getNewDto(): T;

  abstract getDefaultValues(): Partial<T>;

  abstract getPropertiesByLevel(): Record<number, (keyof T)[]>;

  protected filterPropertiesByLevel(
    propertiesByLevel: Record<number, (keyof T)[]>,
    level: number,
  ): (keyof T)[] {
    return Object.entries(propertiesByLevel)
      .filter(([lvl]) => Number(lvl) <= level)
      .flatMap(([, properties]) => properties);
  }
}
