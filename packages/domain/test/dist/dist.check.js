'use strict';

function throwsInstanceOf(create, ExceptionClass) {
  try {
    create();
  } catch (e) {
    return e instanceof ExceptionClass;
  }
  return false;
}

function smoke(m) {
  return [
    ['StringType converts', () => new m.StringType(12).value === '12'],
    ['StringType keeps blanks as null', () => new m.StringType('  ').value === null],
    [
      'Required throws RequiredValueException',
      () => {
        class Name extends m.Required(m.StringType) {}
        return throwsInstanceOf(() => new Name(null), m.RequiredValueException);
      },
    ],
    [
      'NumberType rejects text',
      () => throwsInstanceOf(() => new m.NumberType('abc'), m.TypePrimitiveException),
    ],
    [
      'DateType reads ISO',
      () => new m.DateType('2018-03-23').toString === '2018-03-23T00:00:00.000Z',
    ],
    [
      'IdType is required',
      () => throwsInstanceOf(() => new m.IdType(null), m.RequiredValueException),
    ],
    [
      'validate',
      () => {
        const result = new m.StringType('abc').validate();
        return result.ok === true && result.value === 'abc' && result.errors.length === 0;
      },
    ],
  ];
}

function crossBuild(cjs, esm) {
  return [
    [
      'share the required mark',
      () => {
        class RequiredAcrossBuilds extends esm.Required(cjs.StringType) {}
        return throwsInstanceOf(() => new RequiredAcrossBuilds(null), cjs.RequiredValueException);
      },
    ],
  ];
}

module.exports = { smoke, crossBuild };
