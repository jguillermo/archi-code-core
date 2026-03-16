#!/usr/bin/env node
// =============================================================================
// benchmark.js — Validation performance comparison
//
// Run:     npm run benchmark
// Requires: npm run build:wasm  (WASM must be compiled first)
//
// Compares:
//   1. Rust/WASM  — pooled Validator with integer-code API (run_codes)
//   2. class-validator — npm library functional validators
//
// Scenarios:
//   A. simple form          — 3 fields, 6 rules
//   B. complex form         — 8 fields, 14 rules
//   C. all failing          — 4 fields, 9 rules (worst case: all invalid)
//   D. array of strings     — 10 emails (20 rules)
//   E. array of objects     — 5 user records, 3 fields each (35 rules)
//   F. nested object        — user + address + preferences (10 fields, 22 rules)
//   G. advanced validators  — credit card, base64, hex color, UUID v4 (10 fields)
//   H. array of objects     — 10 items, all invalid (worst case arrays)
// =============================================================================
'use strict';

const wasm = require('./src/wasm/pkg-node/archi_validation.js');
const cv = require('class-validator');

const { Validator } = wasm;

// ── Rule codes (must match orchestrator.rs) ───────────────────────────────────

const RC = {
  isNotEmpty: 0, isMinLength: 1, isMaxLength: 2, isExactLength: 3,
  isAlpha: 5, isAlphanumeric: 6, isNumeric: 7, isAscii: 8,
  isLowercase: 9, isUppercase: 10,
  isInRange: 21, isMinValue: 22, isMaxValue: 23,
  isEmail: 25, isUuid: 26, isUuidV4: 27,
  isUrl: 29, isIpv4: 32, isDate: 34, isDatetime: 35,
  isCreditCard: 38, isHexColor: 40, isBase64: 41, isSlug: 42,
};

// ── WASM: pooled Validator with integer-code API ───────────────────────────────

let _pool = null;
function getPool() {
  if (!_pool) _pool = new Validator();
  return _pool;
}

function runWasm(fields) {
  const v = getPool();
  v.reset();
  for (const { value, validations } of fields) {
    if (typeof value === 'string')       v.val_str(value);
    else if (typeof value === 'number')  v.val_num(value);
    else if (typeof value === 'boolean') v.val_bool(value);
    else                                 v.val_null();
    for (const rule of validations) {
      const [name, p0, p1] = Array.isArray(rule) ? rule : [rule];
      const code = RC[name];
      if (p1 !== undefined) v.chk_nn(code, p0, p1);
      else if (p0 !== undefined) v.chk_n(code, p0);
      else v.chk(code);
    }
  }
  const codes = v.run_codes();
  return codes[0] === 1;
}

// ── class-validator: functional validators ────────────────────────────────────

const SLUG_RE  = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NUM_RE   = /^\d+$/;

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

// D — 10 email strings each validated with isNotEmpty + isEmail (20 rules)
const EMAIL_ARRAY = [
  'alice@example.com', 'bob@company.org', 'charlie@test.net',
  'diana@domain.co', 'eve@mail.io', 'frank@web.dev',
  'grace@portal.com', 'henry@service.org', 'iris@cloud.net', 'jack@api.io',
].map((email, i) => ({
  field: `emails[${i}]`,
  value: email,
  validations: ['isNotEmpty', 'isEmail'],
}));

// E — 5 user objects × (username:4 + email:2 + age:1) = 35 rules
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

// F — user + address + preferences (10 fields, 22 rules)
const NESTED_OBJECT = [
  { field: 'user.name',         value: 'John Doe',           validations: ['isNotEmpty', ['isMinLength', 2], ['isMaxLength', 100]] },
  { field: 'user.email',        value: 'john@example.com',   validations: ['isNotEmpty', 'isEmail'] },
  { field: 'user.website',      value: 'https://john.dev',   validations: ['isNotEmpty', 'isUrl'] },
  { field: 'user.dob',          value: '1990-05-15',         validations: ['isDate'] },
  { field: 'address.street',    value: '123 Main Street',    validations: ['isNotEmpty', ['isMinLength', 5], ['isMaxLength', 200]] },
  { field: 'address.city',      value: 'Springfield',        validations: ['isNotEmpty', ['isMinLength', 2], 'isAlpha'] },
  { field: 'address.zip',       value: '12345',              validations: ['isNotEmpty', 'isNumeric', ['isExactLength', 5]] },
  { field: 'address.country',   value: 'US',                 validations: ['isNotEmpty', 'isAlpha', ['isExactLength', 2], 'isUppercase'] },
  { field: 'prefs.theme',       value: 'dark',               validations: ['isNotEmpty', 'isAlpha', 'isLowercase'] },
  { field: 'prefs.locale',      value: 'en',                 validations: ['isNotEmpty', 'isAlpha', ['isExactLength', 2], 'isLowercase'] },
];

// G — advanced/format validators (10 fields, 16 rules)
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

// H — 10 user objects all invalid (worst case arrays: 35 rules, all failing)
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
  'A — simple form         (3f, 6r)':  [
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
  'C — all failing         (4f, 9r)':  [
    { field: 'email',  value: 'not-an-email', validations: ['isEmail', 'isNotEmpty', ['isMinLength', 100]] },
    { field: 'uuid',   value: 'not-a-uuid',   validations: ['isUuid'] },
    { field: 'number', value: 999,            validations: [['isInRange', 0, 10], ['isMaxLength', 5]] },
    { field: 'text',   value: '',             validations: ['isNotEmpty', ['isMinLength', 5], 'isAlpha'] },
  ],
  'D — array of strings    (10f, 20r)': EMAIL_ARRAY,
  'E — array of objects    (15f, 35r)': USER_RECORDS,
  'F — nested object       (10f, 22r)': NESTED_OBJECT,
  'G — advanced validators (10f, 16r)': ADVANCED_VALIDATORS,
  'H — invalid array       (15f, 35r)': INVALID_USERS,
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

const LINE = '═'.repeat(72);
const SEP  = '─'.repeat(72);

console.log(`\n${LINE}`);
console.log(`  Validation Benchmark — ${ITERATIONS.toLocaleString()} iterations per scenario`);
console.log(`  Rust/WASM  vs  class-validator (npm)`);
console.log(`${LINE}\n`);

const allResults = {};

for (const [name, fields] of Object.entries(SCENARIOS)) {
  const rWasm = bench(() => runWasm(fields));
  const rCv   = bench(() => runClassValidator(fields));

  allResults[name] = { wasm: rWasm, cv: rCv };

  const wasmWins = rWasm.opsPerSec >= rCv.opsPerSec;
  const ratio = wasmWins
    ? (rWasm.opsPerSec / rCv.opsPerSec).toFixed(2)
    : (rCv.opsPerSec / rWasm.opsPerSec).toFixed(2);
  const winner = wasmWins ? 'Rust/WASM' : 'class-validator';

  console.log(`  Scenario: ${name}`);
  console.log(`  ${SEP}`);
  console.log(`  ${'implementation'.padEnd(22)} │ ${'ops/sec'.padStart(12)} │ ${'ns/op'.padStart(8)} │ ${'total'.padStart(9)}`);
  console.log(`  ${SEP}`);
  console.log(`  ${'Rust/WASM'.padEnd(22)} │ ${String(rWasm.opsPerSec).padStart(12)} │ ${String(rWasm.nsPerOp).padStart(8)} │ ${String(rWasm.ms).padStart(7)} ms${wasmWins ? '  ◀ winner' : ''}`);
  console.log(`  ${'class-validator'.padEnd(22)} │ ${String(rCv.opsPerSec).padStart(12)} │ ${String(rCv.nsPerOp).padStart(8)} │ ${String(rCv.ms).padStart(7)} ms${!wasmWins ? '  ◀ winner' : ''}`);
  console.log(`  ${SEP}`);
  console.log(`  ${winner} is ${ratio}x faster\n`);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`${LINE}`);
console.log(`  SUMMARY — average across all scenarios`);
console.log(`${LINE}`);

let totalWasm = 0, totalCv = 0, wasmWins = 0;
for (const { wasm, cv } of Object.values(allResults)) {
  totalWasm += wasm.opsPerSec;
  totalCv   += cv.opsPerSec;
  if (wasm.opsPerSec >= cv.opsPerSec) wasmWins++;
}

const n = Object.keys(allResults).length;
const avgWasm = Math.round(totalWasm / n);
const avgCv   = Math.round(totalCv / n);
const avgWasmFaster = avgWasm >= avgCv;
const avgRatio = avgWasmFaster
  ? (avgWasm / avgCv).toFixed(2)
  : (avgCv / avgWasm).toFixed(2);

console.log();
console.log(`  ${'Rust/WASM'.padEnd(22)} avg ${String(avgWasm).padStart(12)} ops/s  ${String(Math.round(1e9 / avgWasm)).padStart(6)} ns/op${avgWasmFaster ? '  ◀ faster' : ''}`);
console.log(`  ${'class-validator'.padEnd(22)} avg ${String(avgCv).padStart(12)} ops/s  ${String(Math.round(1e9 / avgCv)).padStart(6)} ns/op${!avgWasmFaster ? '  ◀ faster' : ''}`);
console.log();
console.log(`  Rust/WASM wins: ${wasmWins}/${n} scenarios`);
console.log(`  Overall: ${avgWasmFaster ? 'Rust/WASM' : 'class-validator'} is ${avgRatio}x faster on average`);
console.log(`\n${LINE}\n`);
