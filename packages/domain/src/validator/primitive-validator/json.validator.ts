// type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
//
// interface JsonObject {
//   [key: string]: JsonValue;
// }
//
// type JsonArray = Array<JsonValue>;

export class JsonValidator {
  static canBeJson(value: any, requireKeys: boolean = true): boolean {
    let parsedObj: any;

    if (value === null || value === 'null') {
      return false;
    }

    if (typeof value === 'string') {
      try {
        parsedObj = JSON.parse(value);
      } catch {
        return false;
      }
    } else {
      parsedObj = value;
    }

    if (typeof parsedObj !== 'object' || Array.isArray(parsedObj)) {
      return false;
    }

    if (requireKeys && Object.keys(parsedObj).length === 0) {
      return false;
    }

    try {
      JSON.stringify(parsedObj);
      return true;
    } catch {
      return false;
    }
  }
}
