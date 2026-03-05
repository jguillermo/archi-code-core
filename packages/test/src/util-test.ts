import { isString, ValidationError } from 'class-validator';
import { universalToString } from '@code-core/common';
import { expect, it } from '@jest/globals';

interface ITestValidation {
  hastTwoValues: boolean;
  title: string;
  input: any;
  expectValue: any;
}

export function testValidation({
  validator,
  valid,
  invalid,
}: {
  validator: any;
  valid: any[];
  invalid: any[];
}): void {
  functionTestSpec(
    validator,
    valid.map((value) => [value, true]),
  );
  functionTestSpec(
    validator,
    invalid.map((value) => [value, false]),
  );
}

export function splitString(input: string): {
  name: string | null;
  property: string | null;
} {
  const [name, property] = input.split(':');
  return {
    name: name || null,
    property: property || null,
  };
}

export function titleGenerate(
  objectName: string,
  input: any,
  expectValue: any,
  hastTwoValues: boolean,
  result: any = null,
): string {
  const txtExpectValue = isString(expectValue)
    ? `'${expectValue}'`
    : universalToString(expectValue);
  const txtInput = !hastTwoValues ? '' : isString(input) ? `'${input}'` : universalToString(input);
  const objectNameProperty = splitString(objectName);
  const titleObject = objectNameProperty.property
    ? `(new ${objectNameProperty.name}(${txtInput})).${objectNameProperty.property}()`
    : `${objectName}(${txtInput})`;
  if (result) {
    return `${titleObject} Expected: ${txtExpectValue}, but return: ${universalToString(result)}`;
  } else {
    return `validate ${titleObject} toEqual ${txtExpectValue}`;
  }
}

export function processValidator(
  name: string,
  objectItem: any,
  property: string | null = null,
): ITestValidation {
  const hastTwoValues = Array.isArray(objectItem) && objectItem.length === 2;
  const voProperties = property ? `${name}:${property}` : `${name}`;
  const input = hastTwoValues ? objectItem[0] : '';
  const expectValue = hastTwoValues ? objectItem[1] : objectItem;
  const title = titleGenerate(voProperties, input, expectValue, hastTwoValues);
  return {
    hastTwoValues,
    title,
    input,
    expectValue,
  };
}

export function classTestSpec(cls: any, objectList: Record<string, any[]>): void {
  for (const property in objectList) {
    objectList[property].forEach((value) => {
      const dataInput = processValidator(cls.name, value, property);
      it(dataInput.title, () => {
        const type = dataInput.hastTwoValues ? new cls(dataInput.input) : new cls();
        expect(type[property]).toEqual(dataInput.expectValue);
      });
    });
  }
}

export function typeValidationSpec(
  validateTypeFn: Function,
  cls: any,
  objectList: Record<string, any[]>,
): void {
  for (const property in objectList) {
    objectList[property].forEach((value) => {
      const dataInput = processValidator(cls.name, value, property);
      it(dataInput.title + ' and not error', async () => {
        const type = dataInput.hastTwoValues ? new cls(dataInput.input) : new cls();
        expect(type[property]).toEqual(dataInput.expectValue);
        const errors = validateTypeFn(type);
        expect(errors).toEqual([]);
      });
    });
  }
}

//valuesTxt: { typePrimitive: ['$1', universalToString] },
export function errorTypeValidValueSpec<T>(
  validateTypeFn: Function,
  TypePrimitiveExceptionFn: Function,
  cls: any,
  errorData: any,
  items: {
    constraints: T[];
    values: any[];
    valuesTxt?: Record<string, Record<string, Function>>;
  }[],
): void {
  items.forEach((item) => {
    item.values.forEach((value) => {
      it(`type error validate (${item.constraints.join(', ')}) : ${classTxt(cls, value)}`, async () => {
        const constraints = item.constraints.reduce((acc, key) => {
          acc[String(key)] = errorData[key];
          return acc;
        }, {});

        let type;
        let errors: ValidationError[] = [];
        try {
          type = new cls(value);
          errors = validateTypeFn(type);
        } catch (e) {
          if (!(e instanceof TypePrimitiveExceptionFn)) {
            throw e;
          }
          errors = [
            {
              property: 'value',
              constraints: {
                typePrimitive: e?.['message'] ?? '',
              },
            },
          ];
        }

        expect(errors[0]).toBeDefined();
        expect(errors[0].constraints).toBeDefined();

        if (item.valuesTxt) {
          Object.keys(item.valuesTxt).forEach((errorKey) => {
            let txtTransform = constraints?.[errorKey];

            Object.keys(item.valuesTxt?.[errorKey] ?? {}).forEach((txtReplace) => {
              if (typeof value === 'string') {
                value = `"${value}"`;
              }
              txtTransform = txtTransform?.replace(
                txtReplace,
                item.valuesTxt?.[errorKey]?.[txtReplace](value),
              );
            });

            expect(errors[0]?.constraints?.[errorKey]).toEqual(txtTransform);
          });
        } else {
          expect(errors[0].constraints).toEqual(constraints);
        }
      });
    });
  });
}

export function typeValidValueSpec(
  validateTypeFn: Function,
  cls: any,
  items: any[],
  validateTypeOf?: string,
): void {
  items.forEach((value) => {
    it(`Valid type: ${classTxt(cls, value)}`, async () => {
      const type = new cls(value);
      const errors = validateTypeFn(type);
      expect(errors).toEqual([]);
    });
  });
  if (validateTypeOf) {
    items.forEach((value) => {
      if (value === null || value === undefined) {
        it(`Valid type: typeof (${classTxt(cls, value)}).isNull is true`, async () => {
          expect(new cls(value).isNull).toEqual(true);
        });
      } else {
        it(`Valid type: typeof (${classTxt(cls, value)}).value === ${validateTypeOf}`, async () => {
          expect(typeof new cls(value).value).toEqual(validateTypeOf);
        });
      }
    });
  }
}

function classTxt(cls: any, value: any): string {
  const txtInput = isString(value) ? `'${value}'` : universalToString(value);
  return `new ${cls.name}(${txtInput})`;
}

export function classExceptionSpec(
  cls: any,
  exceptionList: Record<string, { message: string; values: any[] }>,
): void {
  for (const exceptionItem in exceptionList) {
    exceptionList[exceptionItem]['values'].forEach((value) => {
      const valueText = isString(value) ? `'${value}'` : universalToString(value);
      it(`validate ${exceptionItem} exception with ${valueText}`, () => {
        expect(() => {
          new cls(value);
        }).toThrow(exceptionList[exceptionItem]['message']);
      });
    });
  }
}

export function functionTestSpec(fn: any, objectList: any[]): void {
  objectList.forEach((value) => {
    const dataInput = processValidator(fn.name, value);
    it(dataInput.title, () => {
      const result = dataInput.hastTwoValues ? fn(dataInput.input) : fn();
      expect(result).toEqual(dataInput.expectValue);
    });
  });
}

export function toEqualArray(data: any[]): void {
  data.forEach((value) => {
    expect(value[0]).toEqual(value[1]);
  });
}
