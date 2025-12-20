export abstract class DtoObjectMother<T extends object> {
  /**
   * Creates an instance of a DTO adjusted to the specified level, with optional property overrides and exclusions.
   * @param level Validation level and characteristics.
   * @param override Values that override the default ones (optional).
   * @param exclude Properties to be excluded from the final DTO (optional).
   * @returns An instance of the DTO with active properties according to the level and exclusions.
   */
  static create<T extends object>(this: new () => DtoObjectMother<T>, level: number, override: Partial<T> = {}, exclude: Array<keyof T> = []): T {
    const instance = new this();
    const defaultValues = instance.getDefaultValues();
    const activeProperties = instance.filterPropertiesByLevel(instance.getPropertiesByLevel(), level);

    // Include all overrides in the active properties
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

  /**
   * Provides a new instance of the specific DTO.
   * This method must be implemented in subclasses.
   */
  abstract getNewDto(): T;

  /**
   * Provides the default values for the properties based on the level.
   * This method must be implemented in subclasses.
   */
  abstract getDefaultValues(): Partial<T>;

  /**
   * Provides the properties grouped by level.
   * This method must be implemented in subclasses.
   */
  abstract getPropertiesByLevel(): Record<number, Array<keyof T>>;

  /**
   * Filters properties by the specified level.
   * @param propertiesByLevel A record of properties grouped by level.
   * @param level The level to filter properties for.
   * @returns An array of properties active for the given level.
   */
  protected filterPropertiesByLevel(propertiesByLevel: Record<number, Array<keyof T>>, level: number): Array<keyof T> {
    return Object.entries(propertiesByLevel)
      .filter(([lvl]) => Number(lvl) <= level)
      .flatMap(([, properties]) => properties);
  }
}
