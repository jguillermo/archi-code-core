#!/usr/bin/env node
// =============================================================================
// benchmark.js — Validation performance comparison
//
// Run:     npm run benchmark
// Requires: npm run build:wasm  (WASM must be compiled first)
//
// Compares:
//   1. Rust/WASM (flat)  — single binary crossing via run_flat()
//   2. class-validator   — npm library functional validators
//
// Key idea behind "flat":
//   Encodes the entire scenario to a binary buffer (once, outside the hot loop),
//   then each iteration is just: run_flat(buf) — 1 crossing for the whole batch.
//
// Binary format for run_flat (little-endian):
//   [num_fields: u16]
//   For each field:
//     [type: u8]   0=null 1=bool_false 2=bool_true 3=num 4=str
//     if type==3:  [f64: 8 bytes]
//     if type==4:  [len: u16][utf8 bytes...]
//     [num_rules: u8]
//     For each rule:
//       [code: u8]
//       [param_type: u8]  0=none  1=one_f64  2=two_f64  3=one_str
//       if param_type==1: [p0: f64, 8 bytes]
//       if param_type==2: [p0: f64][p1: f64, 8 bytes each]
//       if param_type==3: [len: u16][utf8 bytes...]
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

const wasm = require('./src/wasm/pkg-node/archi_validation.js');
const cv = require('class-validator');

const { run_flat } = wasm;

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

// ── WASM flat: single binary crossing via run_flat() ─────────────────────────
//   Encode the scenario once to a Buffer (outside the hot loop), then each
//   iteration is just:  run_flat(preEncodedBuf) — 1 crossing, no string alloc.

function encodeScenario(fields) {
  // ── Pass 1: calculate buffer size ─────────────────────────────────────────
  let size = 2; // num_fields u16
  for (const { value, validations } of fields) {
    size += 1; // type byte
    if (typeof value === 'number') size += 8;
    else if (typeof value === 'string') {
      size += 2 + Buffer.byteLength(value, 'utf8');
    }
    // bool/null/object/array: only the type byte
    size += 1; // num_rules
    for (const rule of validations) {
      const [, p0, p1] = Array.isArray(rule) ? rule : [rule];
      size += 2; // code + param_type
      if (p1 !== undefined)       size += 16;
      else if (p0 !== undefined)  size += 8;
    }
  }

  // ── Pass 2: write buffer ──────────────────────────────────────────────────
  const buf = Buffer.allocUnsafe(size);
  let pos = 0;

  buf.writeUInt16LE(fields.length, pos); pos += 2;

  for (const { value, validations } of fields) {
    if (value === null || value === undefined || typeof value === 'object') {
      buf[pos++] = 0;
    } else if (typeof value === 'boolean') {
      buf[pos++] = value ? 2 : 1;
    } else if (typeof value === 'number') {
      buf[pos++] = 3;
      buf.writeDoubleLE(value, pos); pos += 8;
    } else {
      buf[pos++] = 4;
      const written = buf.write(String(value), pos + 2, 'utf8');
      buf.writeUInt16LE(written, pos); pos += 2 + written;
    }

    buf[pos++] = validations.length;
    for (const rule of validations) {
      const [name, p0, p1] = Array.isArray(rule) ? rule : [rule];
      buf[pos++] = RC[name];
      if (p1 !== undefined) {
        buf[pos++] = 2;
        buf.writeDoubleLE(p0, pos); pos += 8;
        buf.writeDoubleLE(p1, pos); pos += 8;
      } else if (p0 !== undefined) {
        buf[pos++] = 1;
        buf.writeDoubleLE(p0, pos); pos += 8;
      } else {
        buf[pos++] = 0;
      }
    }
  }

  return buf;
}

function runWasmFlat(encoded) {
  return run_flat(encoded) === 1;
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

// ── Pre-encode all scenarios outside the hot loop ─────────────────────────────
//   Each encoded buffer is built once and reused every iteration.

const ENCODED = Object.fromEntries(
  Object.entries(SCENARIOS).map(([name, fields]) => [name, encodeScenario(fields)])
);

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
console.log(`  Rust/WASM (flat binary)  vs  class-validator`);
console.log(`${LINE}\n`);

const allResults = {};

for (const [name, fields] of Object.entries(SCENARIOS)) {
  const encoded = ENCODED[name];

  const rFlat  = bench(() => runWasmFlat(encoded));
  const rCv    = bench(() => runClassValidator(fields));

  allResults[name] = { flat: rFlat, cv: rCv };

  const best = rFlat.opsPerSec >= rCv.opsPerSec ? rFlat : rCv;
  const winner = best === rFlat ? 'WASM flat' : 'class-validator';

  const ratio = rFlat.opsPerSec >= rCv.opsPerSec
    ? `flat ${(rFlat.opsPerSec / rCv.opsPerSec).toFixed(2)}x faster than cv`
    : `cv   ${(rCv.opsPerSec / rFlat.opsPerSec).toFixed(2)}x faster than flat`;

  const bufSize = encoded.length;

  console.log(`  Scenario: ${name}  [flat buf: ${bufSize}B]`);
  console.log(`  ${SEP}`);
  console.log(`  ${'implementation'.padEnd(26)} │ ${'ops/sec'.padStart(11)} │ ${'ns/op'.padStart(8)} │ ${'total'.padStart(9)}`);
  console.log(`  ${SEP}`);
  const rows = [
    ['WASM (flat binary)', rFlat],
    ['class-validator', rCv],
  ];
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

let totFlat = 0, totCv = 0;
let flatWins = 0, cvWins = 0;

for (const { flat, cv } of Object.values(allResults)) {
  totFlat  += flat.opsPerSec;
  totCv    += cv.opsPerSec;
  if (flat.opsPerSec >= cv.opsPerSec) flatWins++;
  else cvWins++;
}

const n = Object.keys(allResults).length;
const avgFlat  = Math.round(totFlat  / n);
const avgCv    = Math.round(totCv    / n);

const nsFlat  = Math.round(1e9 / avgFlat);
const nsCv    = Math.round(1e9 / avgCv);

const sorted = [
  ['WASM (flat binary)', avgFlat, nsFlat],
  ['class-validator', avgCv, nsCv],
].sort((a, b) => b[1] - a[1]);

console.log();
for (let i = 0; i < sorted.length; i++) {
  const [label, ops, ns] = sorted[i];
  const mark = i === 0 ? '  ◀ fastest' : '';
  console.log(`  ${(i + 1) + '. ' + label.padEnd(24)} avg ${String(ops).padStart(11)} ops/s  ${String(ns).padStart(6)} ns/op${mark}`);
}

const flatVsCvRatio = avgFlat >= avgCv
  ? `WASM flat is ${(avgFlat / avgCv).toFixed(2)}x faster than class-validator`
  : `class-validator is ${(avgCv / avgFlat).toFixed(2)}x faster than WASM flat`;

console.log();
console.log(`  WASM flat wins:       ${flatWins}/${n} scenarios`);
console.log(`  class-validator wins: ${cvWins}/${n} scenarios`);
console.log();
console.log(`  Overall: ${flatVsCvRatio}`);
console.log(`\n${LINE}\n`);
