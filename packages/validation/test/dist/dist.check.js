'use strict';

function smoke(m) {
  return [
    ['validator.isEmail', () => m.validator.isEmail('a@b.com') === true],
    [
      'toInteger',
      () =>
        JSON.stringify(m.toInteger('42')) === JSON.stringify({ ok: true, value: 42, error: null }),
    ],
    [
      'toBoolean failure',
      () => m.toBoolean('maybe').ok === false && typeof m.toBoolean('maybe').error === 'string',
    ],
    ['canBeDate', () => m.canBeDate('2024/01/31') === true],
    ['sanitizer.trim', () => m.sanitizer.trim('  a  ') === 'a'],
    [
      'runValidations',
      () => {
        class Age {}
        m.Validations([{ validator: 'isInt', properties: { min: 2 } }])(Age);
        const invalid = m.runValidations(Age, '1');
        const valid = m.runValidations(Age, '5');
        return (
          invalid.ok === false &&
          invalid.errors.length === 1 &&
          valid.ok === true &&
          valid.errors.length === 0
        );
      },
    ],
  ];
}

function crossBuild(cjs, esm) {
  return [
    [
      'share the @Validations registry',
      () => {
        class DecoratedWithCjs {}
        cjs.Validations([{ validator: 'isInt' }])(DecoratedWithCjs);
        class DecoratedWithEsm {}
        esm.Validations([{ validator: 'isEmail' }])(DecoratedWithEsm);
        return (
          esm.runValidations(DecoratedWithCjs, 'x').errors.length === 1 &&
          cjs.runValidations(DecoratedWithEsm, 'x').errors.length === 1
        );
      },
    ],
  ];
}

const WEB_INPUTS = [
  'a',
  '1',
  '-2.5',
  '2024/01/31',
  '',
  'a@b.com',
  'https://x.io',
  'true',
  '{"a":1}',
];

function publicFunctions(ns) {
  return [
    ...Object.entries(ns.validator)
      .filter(([, fn]) => typeof fn === 'function')
      .map(([name, fn]) => [`validator.${name}`, fn]),
    ...Object.entries(ns).filter(
      ([name, fn]) => typeof fn === 'function' && /^(to|canBe|anyToString$)/.test(name),
    ),
    ...Object.entries(ns.sanitizer)
      .filter(([, fn]) => typeof fn === 'function')
      .map(([name, fn]) => [`sanitizer.${name}`, fn]),
  ];
}

function outcome(fn, args) {
  try {
    return { value: JSON.stringify(fn(...args)) };
  } catch (e) {
    return { error: e && e.name };
  }
}

function sameAsNode(name, webFn, nodeFn) {
  if (!nodeFn) return `exists in the web build but not in the Node build`;
  for (const input of WEB_INPUTS) {
    for (const args of [[input], [input, 'en-US']]) {
      const web = outcome(webFn, args);
      const node = outcome(nodeFn, args);
      if (web.error === 'ReferenceError' && node.error !== 'ReferenceError') {
        return `(${JSON.stringify(args)}) uses an API missing in browsers (ReferenceError)`;
      }
      if (JSON.stringify(web) !== JSON.stringify(node)) {
        return `(${JSON.stringify(args)}) differs: web=${JSON.stringify(web)} node=${JSON.stringify(node)}`;
      }
    }
  }
  return true;
}

function web(m, node) {
  const nodeFns = new Map(publicFunctions(node));
  const webFns = publicFunctions(m);
  return [
    ...smoke(m),
    [
      'isLength graphemes (Intl.Segmenter)',
      () => m.validator.isLength('👨‍👩‍👧', { max: 1, graphemes: true }) === true,
    ],
    [
      'exposes the same public functions as Node',
      () => webFns.length === nodeFns.size || `web ${webFns.length}, Node ${nodeFns.size}`,
    ],
    ...webFns.map(([name, webFn]) => [name, () => sameAsNode(name, webFn, nodeFns.get(name))]),
  ];
}

module.exports = { smoke, crossBuild, web };
