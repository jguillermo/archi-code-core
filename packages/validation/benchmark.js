#!/usr/bin/env node
// =============================================================================
// benchmark.js — Validation performance comparison
//
// Run: npm run benchmark
// Requires: npm run build:wasm
//
// Compares three WASM strategies against pure JS:
//   1. validate_json  — JSON string in/out, all work in WASM (2 boundary crossings)
//   2. Validator      — typed class API, many boundary crossings
//   3. direct checks  — one WASM call per single-value check
//   4. pure JS        — regex/native baseline
// =============================================================================
'use strict';

const wasm = require('./src/wasm/pkg-node/archi_validation.js');
const { Validator, validate_json, check_str, check_str_n, check_str_nn, check_num, check_num_nn } = wasm;

// ─── Pure JS validators ──────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_RE   = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const IPV4_RE  = /^(\d{1,3}\.){3}\d{1,3}$/;
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE  = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const jsValidators = {
  isNotEmpty:    (v) => typeof v === 'string' && v.trim().length > 0,
  isMinLength:   (v, min) => typeof v === 'string' && v.length >= min,
  isMaxLength:   (v, max) => typeof v === 'string' && v.length <= max,
  isAlpha:       (v) => typeof v === 'string' && /^[a-zA-Z]+$/.test(v),
  isAlphanumeric:(v) => typeof v === 'string' && /^[a-zA-Z0-9]+$/.test(v),
  isEmail:       (v) => typeof v === 'string' && EMAIL_RE.test(v),
  isUuid:        (v) => typeof v === 'string' && UUID_RE.test(v),
  isUrl:         (v) => typeof v === 'string' && URL_RE.test(v),
  isIpv4:        (v) => typeof v === 'string' && IPV4_RE.test(v) && v.split('.').every(n => +n <= 255),
  isDate:        (v) => typeof v === 'string' && DATE_RE.test(v) && !isNaN(Date.parse(v)),
  isInteger:     (v) => Number.isInteger(Number(v)),
  isInRange:     (v, min, max) => { const n = Number(v); return n >= min && n <= max; },
  isSlug:        (v) => typeof v === 'string' && SLUG_RE.test(v),
};

function runJs(fields) {
  const errors = {};
  let ok = true;
  for (const { field, value, validations } of fields) {
    const fieldErrors = [];
    for (const rule of validations) {
      const [name, ...params] = Array.isArray(rule) ? rule : [rule];
      const fn = jsValidators[name];
      if (fn && !fn(value, ...params)) fieldErrors.push(`${name} failed`);
    }
    errors[field] = fieldErrors;
    if (fieldErrors.length > 0) ok = false;
  }
  return { ok, errors };
}

// ─── WASM: Validator class (typed API, many boundary crossings) ───────────────

function runValidator(fields, locale) {
  const v = new Validator();
  if (locale) v.set_locale(locale);
  for (const { field, value, validations } of fields) {
    if (typeof value === 'string')       v.str_field(field, value);
    else if (typeof value === 'number')  v.num_field(field, value);
    else if (typeof value === 'boolean') v.bool_field(field, value);
    else                                 v.null_field(field);

    for (const rule of validations) {
      let name, p0, p1;
      if (typeof rule === 'string')    { name = rule; }
      else if (Array.isArray(rule))    { [name, p0, p1] = rule; }
      else                             { name = rule.rule; [p0, p1] = rule.params ?? []; }

      if (p1 !== undefined && typeof p0 === 'number' && typeof p1 === 'number') v.check_nn(name, p0, p1);
      else if (p0 !== undefined && typeof p0 === 'number')                      v.check_n(name, p0);
      else if (p0 !== undefined)                                                v.check_s(name, String(p0));
      else                                                                      v.check(name);
    }
  }
  const ok = v.run();
  const errors = {};
  for (let i = 0; i < fields.length; i++) {
    const n = v.field_error_count(i);
    errors[fields[i].field] = n === 0 ? [] : Array.from({ length: n }, (_, j) => v.field_error_at(i, j));
  }
  v.free();
  return { ok, errors };
}

// ─── WASM: validate_json (JSON in/out, 2 boundary crossings) ─────────────────

function runValidateJson(input) {
  return JSON.parse(validate_json(JSON.stringify(input)));
}

// ─── Test scenarios ──────────────────────────────────────────────────────────

const SCENARIOS = {
  'simple form (3 fields, 6 rules)': {
    fields: [
      { field: 'name',  value: 'John',             validations: ['isNotEmpty', ['isMinLength', 2], ['isMaxLength', 50], 'isAlpha'] },
      { field: 'email', value: 'john@example.com', validations: ['isEmail'] },
      { field: 'age',   value: 25,                 validations: [['isInRange', 0, 120]] },
    ],
    // Direct: validate the same data field-by-field with check_* functions
    direct: () => {
      check_str('isNotEmpty', 'John');
      check_str_n('isMinLength', 'John', 2);
      check_str_n('isMaxLength', 'John', 50);
      check_str('isAlpha', 'John');
      check_str('isEmail', 'john@example.com');
      check_num_nn('isInRange', 25, 0, 120);
    },
    directJs: () => {
      jsValidators.isNotEmpty('John');
      jsValidators.isMinLength('John', 2);
      jsValidators.isMaxLength('John', 50);
      jsValidators.isAlpha('John');
      jsValidators.isEmail('john@example.com');
      jsValidators.isInRange(25, 0, 120);
    },
  },
  'complex form (8 fields, 14 rules)': {
    fields: [
      { field: 'username', value: 'johndoe',                              validations: ['isNotEmpty', ['isMinLength', 3], ['isMaxLength', 20], 'isAlphanumeric'] },
      { field: 'email',    value: 'john@example.com',                     validations: ['isNotEmpty', 'isEmail'] },
      { field: 'id',       value: '550e8400-e29b-41d4-a716-446655440000', validations: ['isUuid'] },
      { field: 'website',  value: 'https://example.com',                  validations: ['isUrl'] },
      { field: 'ip',       value: '192.168.1.1',                          validations: ['isIpv4'] },
      { field: 'dob',      value: '1990-05-15',                           validations: ['isDate'] },
      { field: 'score',    value: 87,                                     validations: [['isInRange', 0, 100]] },
      { field: 'slug',     value: 'my-article-slug',                      validations: ['isSlug'] },
    ],
    direct: () => {
      check_str('isNotEmpty', 'johndoe'); check_str_n('isMinLength', 'johndoe', 3); check_str_n('isMaxLength', 'johndoe', 20); check_str('isAlphanumeric', 'johndoe');
      check_str('isNotEmpty', 'john@example.com'); check_str('isEmail', 'john@example.com');
      check_str('isUuid', '550e8400-e29b-41d4-a716-446655440000');
      check_str('isUrl', 'https://example.com');
      check_str('isIpv4', '192.168.1.1');
      check_str('isDate', '1990-05-15');
      check_num_nn('isInRange', 87, 0, 100);
      check_str('isSlug', 'my-article-slug');
    },
    directJs: () => {
      jsValidators.isNotEmpty('johndoe'); jsValidators.isMinLength('johndoe', 3); jsValidators.isMaxLength('johndoe', 20); jsValidators.isAlphanumeric('johndoe');
      jsValidators.isNotEmpty('john@example.com'); jsValidators.isEmail('john@example.com');
      jsValidators.isUuid('550e8400-e29b-41d4-a716-446655440000');
      jsValidators.isUrl('https://example.com');
      jsValidators.isIpv4('192.168.1.1');
      jsValidators.isDate('1990-05-15');
      jsValidators.isInRange(87, 0, 100);
      jsValidators.isSlug('my-article-slug');
    },
  },
  'all failing (worst case, 4 fields)': {
    fields: [
      { field: 'email',  value: 'not-an-email', validations: ['isEmail', 'isNotEmpty', ['isMinLength', 100]] },
      { field: 'uuid',   value: 'not-a-uuid',   validations: ['isUuid'] },
      { field: 'number', value: 999,             validations: [['isInRange', 0, 10], ['isMaxLength', 5]] },
      { field: 'text',   value: '',              validations: ['isNotEmpty', ['isMinLength', 5], 'isAlpha'] },
    ],
    direct: () => {
      check_str('isEmail', 'not-an-email'); check_str('isNotEmpty', 'not-an-email'); check_str_n('isMinLength', 'not-an-email', 100);
      check_str('isUuid', 'not-a-uuid');
      check_num_nn('isInRange', 999, 0, 10); check_str_n('isMaxLength', '999', 5);
      check_str('isNotEmpty', ''); check_str_n('isMinLength', '', 5); check_str('isAlpha', '');
    },
    directJs: () => {
      jsValidators.isEmail('not-an-email'); jsValidators.isNotEmpty('not-an-email'); jsValidators.isMinLength('not-an-email', 100);
      jsValidators.isUuid('not-a-uuid');
      jsValidators.isInRange(999, 0, 10); jsValidators.isMaxLength('999', 5);
      jsValidators.isNotEmpty(''); jsValidators.isMinLength('', 5); jsValidators.isAlpha('');
    },
  },
};

// ─── Benchmark runner ────────────────────────────────────────────────────────

function bench(fn, iterations) {
  for (let i = 0; i < 200; i++) fn(); // warmup

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const ms = performance.now() - start;

  return {
    opsPerSec: Math.round(iterations / (ms / 1000)),
    nsPerOp:   Math.round((ms / iterations) * 1_000_000),
    ms:        ms.toFixed(1),
  };
}

function row(label, r, winner) {
  const mark = winner ? ' ◀' : '';
  return `  ${label.padEnd(16)} │ ${String(r.opsPerSec).padStart(11)} ops/s │ ${String(r.nsPerOp).padStart(8)} ns/op │ ${r.ms.padStart(7)} ms${mark}`;
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const ITERATIONS = 100_000;

console.log(`\n${'═'.repeat(76)}`);
console.log(`  Validation Benchmark — ${ITERATIONS.toLocaleString()} iterations per scenario`);
console.log(`${'═'.repeat(76)}\n`);

const allResults = {};
for (const [name, scenario] of Object.entries(SCENARIOS)) {
  const { fields, direct, directJs } = scenario;
  const input = { fields };

  const results = {
    'validate_json':  bench(() => runValidateJson(input),    ITERATIONS),
    'Validator class': bench(() => runValidator(fields),     ITERATIONS),
    'direct (wasm)':  bench(direct,                         ITERATIONS),
    'direct (js)':    bench(directJs,                       ITERATIONS),
    'runJs':          bench(() => runJs(fields),            ITERATIONS),
  };

  const best = Object.values(results).reduce((a, b) => b.opsPerSec > a.opsPerSec ? b : a);

  console.log(`  Scenario: ${name}`);
  console.log(`  ${'─'.repeat(72)}`);
  console.log(`  ${'impl'.padEnd(16)} │ ${'ops/sec'.padStart(11)}       │ ${'ns/op'.padStart(8)}        │ total`);
  console.log(`  ${'─'.repeat(72)}`);
  for (const [label, r] of Object.entries(results)) {
    console.log(row(label, r, r === best));
  }
  console.log(`  ${'─'.repeat(72)}`);

  const wasmJson = results['validate_json'];
  const validator = results['Validator class'];
  const directWasm = results['direct (wasm)'];
  const jsBaseline = results['runJs'];

  const jsonVsValidator = wasmJson.opsPerSec > validator.opsPerSec
    ? `validate_json ${(wasmJson.opsPerSec / validator.opsPerSec).toFixed(2)}x faster than Validator`
    : `Validator ${(validator.opsPerSec / wasmJson.opsPerSec).toFixed(2)}x faster than validate_json`;
  const directComp = directWasm.opsPerSec > results['direct (js)'].opsPerSec
    ? `wasm ${(directWasm.opsPerSec / results['direct (js)'].opsPerSec).toFixed(2)}x faster than js`
    : `js ${(results['direct (js)'].opsPerSec / directWasm.opsPerSec).toFixed(2)}x faster than wasm`;
  console.log(`  ${jsonVsValidator}  |  direct: ${directComp}`);
  console.log();
  allResults[name] = results;
}

// ─── Summary & explanation ────────────────────────────────────────────────────

console.log(`${'═'.repeat(76)}`);
console.log(`  WHAT THESE NUMBERS MEAN`);
console.log(`${'═'.repeat(76)}`);
console.log(`
  ops/s  = operaciones por segundo. Más alto = más rápido.
  ns/op  = nanosegundos por operación. Más bajo = más rápido.

  ┌─────────────────┬──────────────────────────────────────────────────────┐
  │ Implementación  │ Descripción                                          │
  ├─────────────────┼──────────────────────────────────────────────────────┤
  │ direct (js)     │ Funciones JS puras (regex, Number.isInteger, etc.)   │
  │                 │ Sin overhead. V8 las optimiza e inlinea. El más      │
  │                 │ rápido en bruto, pero validaciones simples/inexactas. │
  ├─────────────────┼──────────────────────────────────────────────────────┤
  │ runJs (batch)   │ Loop JS sobre varios campos. Misma lógica que        │
  │                 │ direct(js) pero con la estructura del formato batch.  │
  ├─────────────────┼──────────────────────────────────────────────────────┤
  │ direct (wasm)   │ Una llamada WASM por regla (check_str, check_num…). │
  │                 │ Cada crossing JS↔WASM cuesta ~1 µs en overhead de   │
  │                 │ marshaling. Rápido si se usan pocas reglas.           │
  ├─────────────────┼──────────────────────────────────────────────────────┤
  │ Validator class │ API de clase: add field + add rules + run() + leer   │
  │                 │ errores. Múltiples crossings por formulario. Útil     │
  │                 │ cuando se necesitan los mensajes de error localizados.│
  ├─────────────────┼──────────────────────────────────────────────────────┤
  │ validate_json   │ Un solo JSON string entra, todo el trabajo ocurre    │
  │                 │ en WASM (parse + validar + serializar), un JSON       │
  │                 │ string sale. Solo 2 crossings totales, pero paga      │
  │                 │ JSON.stringify + JSON.parse en ambos extremos.        │
  └─────────────────┴──────────────────────────────────────────────────────┘

  POR QUÉ JS GANA EN VELOCIDAD BRUTA
  ───────────────────────────────────
  El cuello de botella no es la lógica de validación — es el crossing
  JS↔WASM. Cada llamada a WASM implica copiar strings (UTF-8 → linear
  memory), convertir tipos, y pasar por la ABI de wasm-bindgen. Para
  reglas simples como isEmail o isMinLength, ese overhead supera al
  tiempo de validación real.

  CUÁNDO VALE LA PENA WASM
  ─────────────────────────
  La ventaja de WASM no es la velocidad bruta sino la CALIDAD:

  • Email   → RFC 5321/5322 compliant (crate 'validator'), no solo regex.
  • UUID    → Parsing real con versión exacta (v4 random, v7 sortable).
  • URL     → Parsing con la crate 'url' (mismo estándar que browsers).
  • IP      → std::net::IpAddr, sin falsos positivos como "999.999.999.999".
  • Regex   → Compilado una vez en Rust, sin re-compilación en JS.
  • Crédito → Algoritmo de Luhn real, no solo longitud.

  En producción: usar validate_json o validate() para formularios
  completos donde la correctitud importa. Usar direct(wasm) para
  checks puntuales que requieren la validación de alta calidad de Rust.
`);
console.log(`${'═'.repeat(76)}\n`);
