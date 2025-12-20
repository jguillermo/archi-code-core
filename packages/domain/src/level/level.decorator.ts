import 'reflect-metadata';

const LEVEL = 'level';

export function Level(level: number): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(LEVEL, normalizeLevel(level), target);

    if (level > 1) {
      const staticEmpty = target['empty'];

      // Check if `empty` is a function
      if (typeof staticEmpty !== 'function') {
        throw new Error(`Class ${target.name} with level ${level} must implement a static 'empty()' method as a function.`);
      }

      // Check if `empty()` returns a valid instance of the class
      const instance = staticEmpty();
      if (!(instance instanceof target)) {
        throw new Error(`The static 'empty()' method of class ${target.name} must return a valid instance of the class.`);
      }
    }
  };
}

export function getLevel(target: any): number {
  return Reflect.getMetadata(LEVEL, target) ?? 1;
}

/**
 * Normalizes the input level value to ensure it meets strict validation rules:
 * 1. If the value is a floating-point number, it is floored to the nearest integer.
 * 2. If the value is a numeric string, it is converted to a number.
 * 3. If the result is not a positive integer (>= 1), it defaults to 1.
 * 4. Non-numeric values are considered invalid and default to 1.
 *
 * @param level - The input level to normalize (any type).
 * @returns A normalized positive integer >= 1.
 */
export function normalizeLevel(level: any): number {
  // Attempt to convert numeric strings to numbers
  if (typeof level === 'string' && !isNaN(Number(level))) {
    level = Number(level);
  }

  // Ensure the value is a finite number and floor it if it's a float
  if (typeof level === 'number' && isFinite(level)) {
    const normalizedLevel = Math.floor(level); // Floor the number
    return normalizedLevel >= 1 ? normalizedLevel : 1; // Ensure it is >= 1
  }

  // Return default value if the input is not valid
  return 1;
}
