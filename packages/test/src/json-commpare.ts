import { CompareValue } from './compare-process/CompareValue';
import { universalToString } from '@code-core/common';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

interface JsonObject {
  [key: string]: JsonValue;
}

type JsonArray = Array<JsonValue>;

export class JsonCompare {
  private _differences: string[] = [];
  private _strictMode: boolean;

  static strict(data: any, reference: any): string[] {
    return new JsonCompare(data, reference, true).differences;
  }

  static include(data: any, reference: any): string[] {
    return new JsonCompare(data, reference, false).differences;
  }

  get differences(): string[] {
    return this._differences;
  }

  constructor(data: any, reference: any, strict = false) {
    this._strictMode = strict;
    this._differences = [];
    this.compareValues(data, reference, '');
  }

  private compareArrays(data: JsonArray, reference: JsonArray, path: string) {
    if (this._strictMode && data.length !== reference.length) {
      this._differences.push(`${path}: length of ${universalToString(data)} is not equal to length of ${universalToString(reference)}`);
      return;
    }
    for (let i = 0; i < data.length; i++) {
      this.compareValues(data[i], reference[i], `${path}[${i}]`);
    }
  }

  private processPath(path: string, afterPath: string): string {
    if (path === '') {
      return afterPath;
    }
    return `${path}.${afterPath}`;
  }

  private compareObjects(data: JsonObject, reference: JsonObject, path: string) {
    if (this._strictMode) {
      Object.keys(reference).forEach((key) => {
        const processPath = this.processPath(path, key);
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
          this._differences.push(`${processPath}: key not found`);
        } else {
          this.compareValues(data[key], reference[key], `${processPath}`);
        }
      });
      Object.keys(data).forEach((key) => {
        const processPath = this.processPath(path, key);
        if (!Object.prototype.hasOwnProperty.call(reference, key)) {
          this._differences.push(`${processPath}: extra key found`);
        }
      });
    } else {
      Object.keys(data).forEach((key) => {
        const processPath = this.processPath(path, key);
        if (Object.prototype.hasOwnProperty.call(reference, key)) {
          this.compareValues(data[key], reference[key], `${processPath}`);
        } else {
          this._differences.push(`${processPath}: extra key found`);
        }
      });
    }
  }

  private compareValues(data: JsonValue, reference: JsonValue, path: string) {
    if (Array.isArray(data)) {
      if (!Array.isArray(reference)) {
        this._differences.push(`${path}: must not be an array; it must be ${universalToString(reference)}`);
      } else {
        this.compareArrays(data, reference, path);
      }
    } else if (this.isObject(data)) {
      if (!this.isObject(reference)) {
        this._differences.push(`${path}: must not be an object; it must be ${universalToString(reference)}`);
      } else {
        this.compareObjects(data as JsonObject, reference as JsonObject, path);
      }
    } else {
      const isEquals = CompareValue.getInstance().compare(data, reference);
      if (!isEquals) {
        path = path === '' ? path : `${path}: `;
        this._differences.push(`${path}${universalToString(data)} -> ${universalToString(reference)}`);
      }
    }
  }

  private isObject(data: JsonValue): boolean {
    return typeof data === 'object' && data !== null;
  }
}
