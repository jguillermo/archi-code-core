#!/usr/bin/env node
// =============================================================================
// benchmark.js — Validation performance comparison
//
// Run:     npm run benchmark
// Requires: npm run build  (package must be compiled first)
//
// Compares:
//   1. @archi-code/validation — Rust/WASM via validate()
//   2. class-validator        — npm library functional validators
//
// Scenarios:
//   A. simple form          — 3 fields, 6 rules
//   B. complex form         — 8 fields, 14 rules
//   C. all failing          — 4 fields, 9 rules (worst case: all invalid)
//   D. array of strings     — 10 emails (20 rules)
//   E. array of objects     — 5 user records, 3 fields each (35 rules)
//   F. nested object        — user + address + preferences (10 fields, 22 rules)
//   G. advanced validators  — credit card, base64, hex color, UUID v4 (10 fields)
//   H. invalid array        — 5 user records, all invalid (worst case arrays)
// =============================================================================
'use strict';

const { createValidator } = require('./dist/cjs/index.js');
const cv = require('class-validator');

// ── @archi-code/validation ────────────────────────────────────────────────────

function makeCompiled(fields) {
  const schemaDef = fields.map(({ field, validations }) => ({ field, validations }));
  const validator  = createValidator(schemaDef);
  return function runCompiled(fields) {
    const values = {};
    for (const { field, value } of fields) values[field] = value;
    return validator.validate(values).ok;
  };
}

// ── class-validator: functional validators ────────────────────────────────────

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NUM_RE  = /^\d+$/;

function runClassValidator(fields) {
  let ok = true;
  for (const { value, validations } of fields) {
    const str = String(value);
    const num = Number(value);
    for (const rule of validations) {
      const [name, p0, p1] = Array.isArray(rule) ? rule : [rule];
      let valid = true;
      switch (name) {
        case 'isNotEmpty':     valid = !cv.isEmpty(str); break;
        case 'isMinLength':    valid = cv.minLength(str, p0); break;
        case 'isMaxLength':    valid = cv.maxLength(str, p0); break;
        case 'isExactLength':  valid = str.length === p0; break;
        case 'isAlpha':        valid = cv.isAlpha(str); break;
        case 'isAlphanumeric': valid = cv.isAlphanumeric(str); break;
        case 'isNumeric':      valid = NUM_RE.test(str); break;
        case 'isAscii':        valid = cv.isAscii(str); break;
        case 'isLowercase':    valid = cv.isLowercase(str); break;
        case 'isUppercase':    valid = cv.isUppercase(str); break;
        case 'isInRange':      valid = cv.min(num, p0) && cv.max(num, p1); break;
        case 'isMinValue':     valid = cv.min(num, p0); break;
        case 'isMaxValue':     valid = cv.max(num, p0); break;
        case 'isEmail':        valid = cv.isEmail(str); break;
        case 'isUuid':         valid = cv.isUUID(str); break;
        case 'isUuidV4':       valid = cv.isUUID(str, '4'); break;
        case 'isUrl':          valid = cv.isURL(str); break;
        case 'isIpv4':         valid = cv.isIP(str, 4); break;
        case 'isDate':         valid = cv.isDateString(str); break;
        case 'isDatetime':     valid = cv.isISO8601(str); break;
        case 'isCreditCard':   valid = cv.isCreditCard(str); break;
        case 'isHexColor':     valid = cv.isHexColor(str); break;
        case 'isBase64':       valid = cv.isBase64(str); break;
        case 'isSlug':         valid = SLUG_RE.test(str); break;
      }
      if (!valid) ok = false;
    }
  }
  return ok;
}

// ── Scenario data ─────────────────────────────────────────────────────────────

const EMAIL_ARRAY = [
  'alice@example.com', 'bob@company.org', 'charlie@test.net',
  'diana@domain.co', 'eve@mail.io', 'frank@web.dev',
  'grace@portal.com', 'henry@service.org', 'iris@cloud.net', 'jack@api.io',
].map((email, i) => ({
  field: `emails[${i}]`, value: email, validations: ['isNotEmpty', 'isEmail'],
}));

const USER_RECORDS = [
  { username: 'alice99',  email: 'alice@example.com',  age: 28 },
  { username: 'bob2025',  email: 'bob@company.org',    age: 35 },
  { username: 'charlie',  email: 'charlie@test.net',   age: 22 },
  { username: 'diana77',  email: 'diana@domain.co',    age: 31 },
  { username: 'eve2k',    email: 'eve@mail.io',        age: 44 },
].flatMap(({ username, email, age }, i) => [
  { field: `users[${i}].username`, value: username, validations: ['isNotEmpty', ['isMinLength', 3], ['isMaxLength', 30], 'isAlphanumeric'] },
  { field: `users[${i}].email`,    value: email,    validations: ['isNotEmpty', 'isEmail'] },
  { field: `users[${i}].age`,      value: age,      validations: [['isInRange', 18, 120]] },
]);

const NESTED_OBJECT = [
  { field: 'user.name',       value: 'John Doe',          validations: ['isNotEmpty', ['isMinLength', 2], ['isMaxLength', 100]] },
  { field: 'user.email',      value: 'john@example.com',  validations: ['isNotEmpty', 'isEmail'] },
  { field: 'user.website',    value: 'https://john.dev',  validations: ['isNotEmpty', 'isUrl'] },
  { field: 'user.dob',        value: '1990-05-15',        validations: ['isDate'] },
  { field: 'addr.street',     value: '123 Main Street',   validations: ['isNotEmpty', ['isMinLength', 5], ['isMaxLength', 200]] },
  { field: 'addr.city',       value: 'Springfield',       validations: ['isNotEmpty', ['isMinLength', 2], 'isAlpha'] },
  { field: 'addr.zip',        value: '12345',             validations: ['isNotEmpty', 'isNumeric', ['isExactLength', 5]] },
  { field: 'addr.country',    value: 'US',                validations: ['isNotEmpty', 'isAlpha', ['isExactLength', 2], 'isUppercase'] },
  { field: 'prefs.theme',     value: 'dark',              validations: ['isNotEmpty', 'isAlpha', 'isLowercase'] },
  { field: 'prefs.locale',    value: 'en',                validations: ['isNotEmpty', 'isAlpha', ['isExactLength', 2], 'isLowercase'] },
];

const ADVANCED_VALIDATORS = [
  { field: 'id',         value: '550e8400-e29b-41d4-a716-446655440000', validations: ['isUuid'] },
  { field: 'session_id', value: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', validations: ['isUuidV4'] },
  { field: 'token',      value: 'SGVsbG8gV29ybGQ=',                     validations: ['isNotEmpty', 'isBase64'] },
  { field: 'color',      value: '#FF5733',                              validations: ['isHexColor'] },
  { field: 'bg_color',   value: '#abc',                                 validations: ['isHexColor'] },
  { field: 'card',       value: '4532015112830366',                     validations: ['isNotEmpty', 'isCreditCard'] },
  { field: 'ip',         value: '192.168.1.100',                        validations: ['isIpv4'] },
  { field: 'created_at', value: '2024-01-15T10:30:00Z',                 validations: ['isDatetime'] },
  { field: 'slug',       value: 'my-blog-post-2024',                    validations: ['isNotEmpty', 'isSlug'] },
  { field: 'api_key',    value: 'a1B2c3D4e5F6',                        validations: ['isNotEmpty', 'isAscii', ['isMinLength', 8], ['isMaxLength', 64]] },
];

const INVALID_USERS = [
  { username: '',      email: 'not-email',  age: -5  },
  { username: 'ab',    email: 'bad@',       age: 200 },
  { username: '!!bad', email: '@nodomain',  age: -1  },
  { username: '',      email: 'missing',    age: 999 },
  { username: 'x',     email: 'fail',       age: 0   },
].flatMap(({ username, email, age }, i) => [
  { field: `users[${i}].username`, value: username, validations: ['isNotEmpty', ['isMinLength', 3], ['isMaxLength', 30], 'isAlphanumeric'] },
  { field: `users[${i}].email`,    value: email,    validations: ['isNotEmpty', 'isEmail'] },
  { field: `users[${i}].age`,      value: age,      validations: [['isInRange', 18, 120]] },
]);

// ── Scenarios registry ────────────────────────────────────────────────────────

const SCENARIOS = {
  'A — simple form         (3f,  6r)': [
    { field: 'name',  value: 'John',             validations: ['isNotEmpty', ['isMinLength', 2], ['isMaxLength', 50], 'isAlpha'] },
    { field: 'email', value: 'john@example.com', validations: ['isEmail'] },
    { field: 'age',   value: 25,                 validations: [['isInRange', 0, 120]] },
  ],
  'B — complex form        (8f, 14r)': [
    { field: 'username', value: 'johndoe',                              validations: ['isNotEmpty', ['isMinLength', 3], ['isMaxLength', 20], 'isAlphanumeric'] },
    { field: 'email',    value: 'john@example.com',                     validations: ['isNotEmpty', 'isEmail'] },
    { field: 'id',       value: '550e8400-e29b-41d4-a716-446655440000', validations: ['isUuid'] },
    { field: 'website',  value: 'https://example.com',                  validations: ['isUrl'] },
    { field: 'ip',       value: '192.168.1.1',                          validations: ['isIpv4'] },
    { field: 'dob',      value: '1990-05-15',                           validations: ['isDate'] },
    { field: 'score',    value: 87,                                     validations: [['isInRange', 0, 100]] },
    { field: 'slug',     value: 'my-article-slug',                      validations: ['isSlug'] },
  ],
  'C — all failing         (4f,  9r)': [
    { field: 'email',  value: 'not-an-email', validations: ['isEmail', 'isNotEmpty', ['isMinLength', 100]] },
    { field: 'uuid',   value: 'not-a-uuid',   validations: ['isUuid'] },
    { field: 'number', value: 999,            validations: [['isInRange', 0, 10], ['isMaxLength', 5]] },
    { field: 'text',   value: '',             validations: ['isNotEmpty', ['isMinLength', 5], 'isAlpha'] },
  ],
  'D — array of strings   (10f, 20r)': EMAIL_ARRAY,
  'E — array of objects   (15f, 35r)': USER_RECORDS,
  'F — nested object      (10f, 22r)': NESTED_OBJECT,
  'G — advanced validators(10f, 16r)': ADVANCED_VALIDATORS,
  'H — invalid array      (15f, 35r)': INVALID_USERS,
};

// ── Benchmark runner ──────────────────────────────────────────────────────────

const ITERATIONS = 100_000;
const WARMUP = 500;

function bench(fn) {
  for (let i = 0; i < WARMUP; i++) fn();
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) fn();
  const ms = performance.now() - start;
  return {
    opsPerSec: Math.round(ITERATIONS / (ms / 1000)),
    nsPerOp:   Math.round((ms / ITERATIONS) * 1_000_000),
    ms:        +ms.toFixed(1),
  };
}

// ── Run ───────────────────────────────────────────────────────────────────────

const LINE = '═'.repeat(76);
const SEP  = '─'.repeat(76);

console.log(`\n${LINE}`);
console.log(`  Validation Benchmark — ${ITERATIONS.toLocaleString()} iterations per scenario`);
console.log(`  @archi-code/validation (createValidator)  vs  class-validator`);
console.log(`${LINE}\n`);

const allResults = {};

for (const [name, fields] of Object.entries(SCENARIOS)) {
  const runCompiled = makeCompiled(fields);

  const rCompiled = bench(() => runCompiled(fields));
  const rCv       = bench(() => runClassValidator(fields));

  allResults[name] = { compiled: rCompiled, cv: rCv };

  const best = rCompiled.opsPerSec >= rCv.opsPerSec ? rCompiled : rCv;
  const ratio = rCompiled.opsPerSec >= rCv.opsPerSec
    ? `wasm ${(rCompiled.opsPerSec / rCv.opsPerSec).toFixed(2)}x faster than cv`
    : `cv   ${(rCv.opsPerSec / rCompiled.opsPerSec).toFixed(2)}x faster than wasm`;

  const rows = [
    ['@archi-code/validation', rCompiled],
    ['class-validator',        rCv],
  ];

  console.log(`  Scenario: ${name}`);
  console.log(`  ${SEP}`);
  console.log(`  ${'implementation'.padEnd(26)} │ ${'ops/sec'.padStart(11)} │ ${'ns/op'.padStart(8)} │ ${'total'.padStart(9)}`);
  console.log(`  ${SEP}`);
  for (const [label, r] of rows) {
    const mark = r === best ? '  ◀ winner' : '';
    console.log(`  ${label.padEnd(26)} │ ${String(r.opsPerSec).padStart(11)} │ ${String(r.nsPerOp).padStart(8)} │ ${String(r.ms).padStart(7)} ms${mark}`);
  }
  console.log(`  ${SEP}`);
  console.log(`  ${ratio}\n`);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`${LINE}`);
console.log(`  SUMMARY — average across all scenarios`);
console.log(`${LINE}`);

let totCompiled = 0, totCv = 0;
let compiledWins = 0, cvWins = 0;

for (const { compiled, cv } of Object.values(allResults)) {
  totCompiled += compiled.opsPerSec;
  totCv       += cv.opsPerSec;
  if (compiled.opsPerSec >= cv.opsPerSec) compiledWins++;
  else cvWins++;
}

const n = Object.keys(allResults).length;
const avgCompiled = Math.round(totCompiled / n);
const avgCv       = Math.round(totCv       / n);

const sorted = [
  ['@archi-code/validation', avgCompiled, Math.round(1e9 / avgCompiled)],
  ['class-validator',        avgCv,       Math.round(1e9 / avgCv)],
].sort((a, b) => b[1] - a[1]);

console.log();
for (let i = 0; i < sorted.length; i++) {
  const [label, ops, ns] = sorted[i];
  const mark = i === 0 ? '  ◀ fastest' : '';
  console.log(`  ${(i + 1) + '. ' + label.padEnd(24)} avg ${String(ops).padStart(11)} ops/s  ${String(ns).padStart(6)} ns/op${mark}`);
}

const overallRatio = avgCompiled >= avgCv
  ? `@archi-code/validation is ${(avgCompiled / avgCv).toFixed(2)}x faster than class-validator`
  : `class-validator is ${(avgCv / avgCompiled).toFixed(2)}x faster than @archi-code/validation`;

console.log();
console.log(`  @archi-code/validation wins: ${compiledWins}/${n} scenarios`);
console.log(`  class-validator wins:        ${cvWins}/${n} scenarios`);
console.log();
console.log(`  Overall: ${overallRatio}`);
console.log(`\n${LINE}\n`);
