#!/usr/bin/env node
// =============================================================================
// benchmark.js — Validation performance comparison
//
// Run: npm run benchmark
// Requires: npm run build:wasm
//
// Compares WASM strategies against pure JS:
//   1. validate_json     — JSON string in/out, all work in WASM (2 boundary crossings)
//   2. Validator (str)   — old string-name API, many crossings
//   3. Validator (codes) — NEW: integer codes + val_* + run_codes() — pool, zero string output
//   4. direct (str)      — old string rule name per call
//   5. direct (codes)    — NEW: integer code per call, no rule string
//   6. pure JS           — regex/native baseline
// =============================================================================
'use strict';

const wasm = require('./src/wasm/pkg-node/archi_validation.js');
const {
  Validator,
  validate_json,
  // string API
  check_str, check_str_n, check_str_nn, check_num, check_num_nn,
  // integer code API
  check_code_str, check_code_str_n, check_code_str_nn, check_code_num, check_code_num_nn,
} = wasm;

// Rule codes (must match orchestrator.rs)
const RC = {
  isNotEmpty:0, isMinLength:1, isMaxLength:2, isAlpha:5, isAlphanumeric:6,
  isEmail:25, isUuid:26, isUrl:29, isIpv4:32, isDate:34, isInRange:21, isSlug:42,
};

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

// ─── WASM: Validator (old string API) ────────────────────────────────────────

function runValidatorStr(fields) {
  const v = new Validator();
  for (const { field, value, validations } of fields) {
    if (typeof value === 'string')       v.str_field(field, value);
    else if (typeof value === 'number')  v.num_field(field, value);
    else if (typeof value === 'boolean') v.bool_field(field, value);
    else                                 v.null_field(field);
    for (const rule of validations) {
      let name, p0, p1;
      if (typeof rule === 'string')  { name = rule; }
      else if (Array.isArray(rule))  { [name, p0, p1] = rule; }
      else                           { name = rule.rule; [p0, p1] = rule.params ?? []; }
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

// ─── WASM: Validator (new integer-code API + pool + run_codes) ────────────────
//
// Optimizations vs the string API:
//   - Pooled instance (no constructor/destructor overhead)
//   - val_str/num/bool/null (no field name string marshal)
//   - chk/chk_n/chk_nn (integer codes, no rule name string marshal)
//   - run_codes() (1 crossing for all results — zero string marshaling for errors)

let _pool = null;
function getPool() { if (!_pool) _pool = new Validator(); return _pool; }

function runValidatorCodes(fields, scenario_rc) {
  const v = getPool();
  v.reset();
  for (const { value, validations } of fields) {
    if (typeof value === 'string')       v.val_str(value);
    else if (typeof value === 'number')  v.val_num(value);
    else if (typeof value === 'boolean') v.val_bool(value);
    else                                 v.val_null();
    for (const rule of validations) {
      let code, p0, p1;
      if (typeof rule === 'string')  { code = RC[rule]; }
      else if (Array.isArray(rule))  { code = RC[rule[0]]; p0 = rule[1]; p1 = rule[2]; }
      else                           { code = RC[rule.rule]; [p0, p1] = rule.params ?? []; }
      if (p1 !== undefined && typeof p0 === 'number' && typeof p1 === 'number') v.chk_nn(code, p0, p1);
      else if (p0 !== undefined && typeof p0 === 'number')                      v.chk_n(code, p0);
      else if (p0 !== undefined)                                                v.chk_s(code, String(p0));
      else                                                                      v.chk(code);
    }
  }
  const codes = v.run_codes();
  const ok = codes[0] === 1;
  const errors = {};
  let pos = 1;
  for (let i = 0; i < fields.length; i++) {
    const count = codes[pos++];
    errors[fields[i].field] = count === 0 ? [] : Array.from(codes.subarray(pos, pos + count));
    pos += count;
  }
  return { ok, errors };
}

// ─── WASM: validate_json (JSON in/out, 2 boundary crossings) ─────────────────

function runValidateJson(input) {
  return JSON.parse(validate_json(JSON.stringify(input)));
}

// ─── Test scenarios ──────────────────────────────────────────────────────────

const SCENARIOS = {
  'simple form (3 fields, 6 rules)': {
    description: [
      '3 campos: name (isNotEmpty + isMinLength:2 + isMaxLength:50 + isAlpha),',
      'email (isEmail), age (isInRange:0-120). Todos los valores son válidos.',
      'Mide el overhead de setup+dispatch para un formulario corto típico.',
    ],
    fields: [
      { field: 'name',  value: 'John',             validations: ['isNotEmpty', ['isMinLength', 2], ['isMaxLength', 50], 'isAlpha'] },
      { field: 'email', value: 'john@example.com', validations: ['isEmail'] },
      { field: 'age',   value: 25,                 validations: [['isInRange', 0, 120]] },
    ],
    directStr:   () => { check_str('isNotEmpty','John'); check_str_n('isMinLength','John',2); check_str_n('isMaxLength','John',50); check_str('isAlpha','John'); check_str('isEmail','john@example.com'); check_num_nn('isInRange',25,0,120); },
    directCodes: () => { check_code_str(0,'John'); check_code_str_n(1,'John',2); check_code_str_n(2,'John',50); check_code_str(5,'John'); check_code_str(25,'john@example.com'); check_code_num_nn(21,25,0,120); },
    directJs:    () => { jsValidators.isNotEmpty('John'); jsValidators.isMinLength('John',2); jsValidators.isMaxLength('John',50); jsValidators.isAlpha('John'); jsValidators.isEmail('john@example.com'); jsValidators.isInRange(25,0,120); },
  },
  'complex form (8 fields, 14 rules)': {
    description: [
      '8 campos: username (isNotEmpty+isMinLength+isMaxLength+isAlphanumeric),',
      'email (isNotEmpty+isEmail), id (isUuid), website (isUrl), ip (isIpv4),',
      'dob (isDate), score (isInRange:0-100), slug (isSlug). Todos válidos.',
      'Mide la escala: cómo crece el costo al aumentar campos y reglas.',
    ],
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
    directStr:   () => { check_str('isNotEmpty','johndoe'); check_str_n('isMinLength','johndoe',3); check_str_n('isMaxLength','johndoe',20); check_str('isAlphanumeric','johndoe'); check_str('isNotEmpty','john@example.com'); check_str('isEmail','john@example.com'); check_str('isUuid','550e8400-e29b-41d4-a716-446655440000'); check_str('isUrl','https://example.com'); check_str('isIpv4','192.168.1.1'); check_str('isDate','1990-05-15'); check_num_nn('isInRange',87,0,100); check_str('isSlug','my-article-slug'); },
    directCodes: () => { check_code_str(0,'johndoe'); check_code_str_n(1,'johndoe',3); check_code_str_n(2,'johndoe',20); check_code_str(6,'johndoe'); check_code_str(0,'john@example.com'); check_code_str(25,'john@example.com'); check_code_str(26,'550e8400-e29b-41d4-a716-446655440000'); check_code_str(29,'https://example.com'); check_code_str(32,'192.168.1.1'); check_code_str(34,'1990-05-15'); check_code_num_nn(21,87,0,100); check_code_str(42,'my-article-slug'); },
    directJs:    () => { jsValidators.isNotEmpty('johndoe'); jsValidators.isMinLength('johndoe',3); jsValidators.isMaxLength('johndoe',20); jsValidators.isAlphanumeric('johndoe'); jsValidators.isNotEmpty('john@example.com'); jsValidators.isEmail('john@example.com'); jsValidators.isUuid('550e8400-e29b-41d4-a716-446655440000'); jsValidators.isUrl('https://example.com'); jsValidators.isIpv4('192.168.1.1'); jsValidators.isDate('1990-05-15'); jsValidators.isInRange(87,0,100); jsValidators.isSlug('my-article-slug'); },
  },
  'all failing (worst case, 4 fields)': {
    description: [
      '4 campos con todos los valores inválidos: email="not-an-email" (isEmail+isNotEmpty+isMinLength:100),',
      'uuid="not-a-uuid" (isUuid), number=999 (isInRange:0-10+isMaxLength:5), text="" (isNotEmpty+isMinLength:5+isAlpha).',
      'Peor caso: todas las reglas fallan y se generan mensajes de error para cada una.',
    ],
    fields: [
      { field: 'email',  value: 'not-an-email', validations: ['isEmail', 'isNotEmpty', ['isMinLength', 100]] },
      { field: 'uuid',   value: 'not-a-uuid',   validations: ['isUuid'] },
      { field: 'number', value: 999,             validations: [['isInRange', 0, 10], ['isMaxLength', 5]] },
      { field: 'text',   value: '',              validations: ['isNotEmpty', ['isMinLength', 5], 'isAlpha'] },
    ],
    directStr:   () => { check_str('isEmail','not-an-email'); check_str('isNotEmpty','not-an-email'); check_str_n('isMinLength','not-an-email',100); check_str('isUuid','not-a-uuid'); check_num_nn('isInRange',999,0,10); check_str_n('isMaxLength','999',5); check_str('isNotEmpty',''); check_str_n('isMinLength','',5); check_str('isAlpha',''); },
    directCodes: () => { check_code_str(25,'not-an-email'); check_code_str(0,'not-an-email'); check_code_str_n(1,'not-an-email',100); check_code_str(26,'not-a-uuid'); check_code_num_nn(21,999,0,10); check_code_str_n(2,'999',5); check_code_str(0,''); check_code_str_n(1,'',5); check_code_str(5,''); },
    directJs:    () => { jsValidators.isEmail('not-an-email'); jsValidators.isNotEmpty('not-an-email'); jsValidators.isMinLength('not-an-email',100); jsValidators.isUuid('not-a-uuid'); jsValidators.isInRange(999,0,10); jsValidators.isMaxLength('999',5); jsValidators.isNotEmpty(''); jsValidators.isMinLength('',5); jsValidators.isAlpha(''); },
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
  return `  ${label.padEnd(20)} │ ${String(r.opsPerSec).padStart(11)} ops/s │ ${String(r.nsPerOp).padStart(8)} ns/op │ ${r.ms.padStart(7)} ms${mark}`;
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const ITERATIONS = 100_000;

console.log(`\n${'═'.repeat(76)}`);
console.log(`  Validation Benchmark — ${ITERATIONS.toLocaleString()} iterations per scenario`);
console.log(`${'═'.repeat(76)}\n`);

// ─── helpers ─────────────────────────────────────────────────────────────────

function faster(a, b) {
  if (a.opsPerSec >= b.opsPerSec) return `${(a.opsPerSec / b.opsPerSec).toFixed(2)}x más rápido`;
  return `${(b.opsPerSec / a.opsPerSec).toFixed(2)}x más lento`;
}

function rank(results) {
  return Object.entries(results)
    .sort((a, b) => b[1].opsPerSec - a[1].opsPerSec)
    .map(([label], i) => `${i + 1}. ${label}`)
    .join('  ');
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const allResults = {};
for (const [name, scenario] of Object.entries(SCENARIOS)) {
  const { fields, description, directStr, directCodes, directJs } = scenario;
  const input = { fields };

  const results = {
    'validate_json':       bench(() => runValidateJson(input),    ITERATIONS),
    'Validator (str API)': bench(() => runValidatorStr(fields),   ITERATIONS),
    'Validator (codes)':   bench(() => runValidatorCodes(fields), ITERATIONS),
    'direct (str)':        bench(directStr,                       ITERATIONS),
    'direct (codes)':      bench(directCodes,                     ITERATIONS),
    'direct (js)':         bench(directJs,                        ITERATIONS),
    'runJs (batch)':       bench(() => runJs(fields),             ITERATIONS),
  };

  const best   = Object.values(results).reduce((a, b) => b.opsPerSec > a.opsPerSec ? b : a);
  const worst  = Object.values(results).reduce((a, b) => b.opsPerSec < a.opsPerSec ? b : a);

  // ── Tabla con descripción del escenario ──────────────────────────────────
  console.log(`  Scenario: ${name}`);
  for (const line of description) console.log(`  │ ${line}`);
  console.log(`  ${'─'.repeat(76)}`);
  console.log(`  ${'impl'.padEnd(20)} │ ${'ops/sec'.padStart(11)}       │ ${'ns/op'.padStart(8)}        │ total`);
  console.log(`  ${'─'.repeat(76)}`);
  for (const [label, r] of Object.entries(results)) {
    console.log(row(label, r, r === best));
  }
  console.log(`  ${'─'.repeat(76)}`);

  // ── Análisis dinámico del escenario ──────────────────────────────────────
  const strApi  = results['Validator (str API)'];
  const codeApi = results['Validator (codes)'];
  const dStr    = results['direct (str)'];
  const dCodes  = results['direct (codes)'];
  const jsRef   = results['direct (js)'];
  const jsonApi = results['validate_json'];

  console.log(`  Validator (codes) vs (str API): ${faster(codeApi, strApi)}`);
  console.log(`  direct (codes) vs direct (str): ${faster(dCodes, dStr)}`);
  console.log(`  Mejor WASM vs JS:               ${faster(dCodes, jsRef)}`);
  console.log(`  validate_json vs Validator str: ${faster(jsonApi, strApi)}`);
  console.log();

  allResults[name] = results;
}

// ─── Resumen global dinámico ──────────────────────────────────────────────────

console.log(`${'═'.repeat(76)}`);
console.log(`  RESUMEN Y ANÁLISIS  (basado en los resultados de arriba)`);
console.log(`${'═'.repeat(76)}\n`);

// Calcular promedios por implementación
const implNames = ['validate_json', 'Validator (str API)', 'Validator (codes)', 'direct (str)', 'direct (codes)', 'direct (js)', 'runJs (batch)'];
const avgOps = {};
for (const impl of implNames) {
  const vals = Object.values(allResults).map(r => r[impl].opsPerSec);
  avgOps[impl] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
const sortedImpls = [...implNames].sort((a, b) => avgOps[b] - avgOps[a]);

console.log(`  Ranking promedio (todos los escenarios):`);
for (let i = 0; i < sortedImpls.length; i++) {
  const impl = sortedImpls[i];
  const nsAvg = Math.round(1_000_000_000 / avgOps[impl]);
  const vsNext = i < sortedImpls.length - 1
    ? `  (${(avgOps[impl] / avgOps[sortedImpls[i + 1]]).toFixed(2)}x faster than ${sortedImpls[i + 1]})`
    : '';
  const mark = i === 0 ? ' ◀ fastest' : '';
  console.log(`  ${String(i + 1).padStart(2)}. ${impl.padEnd(22)} avg ${String(avgOps[impl]).padStart(10)} ops/s  ${String(nsAvg).padStart(7)} ns/op${mark}${vsNext}`);
}

// Mejora de codes vs str
const validatorImprovement = (avgOps['Validator (codes)'] / avgOps['Validator (str API)'] * 100 - 100).toFixed(0);
const directImprovement    = (avgOps['direct (codes)']    / avgOps['direct (str)']        * 100 - 100).toFixed(0);
const gapToJs              = (avgOps['direct (js)']       / avgOps['direct (codes)']).toFixed(1);
const jsonVsStr            = avgOps['validate_json'] > avgOps['Validator (str API)']
  ? `${(avgOps['validate_json'] / avgOps['Validator (str API)']).toFixed(2)}x más rápido`
  : `${(avgOps['Validator (str API)'] / avgOps['validate_json']).toFixed(2)}x más lento`;

console.log(`
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  IMPACTO DE LAS OPTIMIZACIONES (promedio entre escenarios)              │
  ├─────────────────────────────────────────────────────────────────────────┤
  │  Validator (codes) vs (str API)  → +${validatorImprovement.padStart(3)}% más ops/s                      │
  │    • Pool singleton: elimina new Validator() + free() por llamada       │
  │    • val_str/num/bool: elimina string marshal del nombre de campo       │
  │    • chk/chk_n/chk_nn: código entero, sin malloc+copy por regla        │
  │    • run_codes(): 1 crossing, salida son códigos enteros (sin strings)  │
  ├─────────────────────────────────────────────────────────────────────────┤
  │  direct (codes) vs direct (str)  → +${directImprovement.padStart(3)}% más ops/s                      │
  │    • check_code_str(25, v) vs check_str("isEmail", v)                  │
  │    • Elimina 1 string marshal (el nombre de la regla) por cada check   │
  ├─────────────────────────────────────────────────────────────────────────┤
  │  validate_json vs Validator (str API) → ${jsonVsStr.padEnd(28)}│
  │    • Solo 2 crossings totales pero paga JSON.stringify + JSON.parse     │
  ├─────────────────────────────────────────────────────────────────────────┤
  │  Brecha WASM vs JS puro  → JS es ${gapToJs.padStart(4)}x más rápido en velocidad bruta  │
  │    • Cada crossing JS↔WASM cuesta ~${Math.round(1_000_000_000 / avgOps['direct (codes)'] - 1_000_000_000 / avgOps['direct (js)'])} ns de overhead (malloc+copy)    │
  │    • WASM gana en CALIDAD: email RFC, UUID con versión, IP real, Luhn  │
  └─────────────────────────────────────────────────────────────────────────┘

  RECOMENDACIÓN según caso de uso:
  • validate() / validateJson() — formularios completos, correctitud crítica
  • isEmail(v), isUuid(v)... — checks puntuales de alta calidad con WASM
  • Funciones JS propias — si la velocidad importa más que la exactitud
`);
console.log(`${'═'.repeat(76)}\n`);
