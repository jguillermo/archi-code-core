'use strict';

const SECRET = 'a-secret-key-with-more-than-32-characters';
const FILE = [9, 8, 7];

async function withNode(use) {
  const node = require('../../dist/cjs/index.js');
  try {
    return await use(node);
  } finally {
    node.workers.terminate();
  }
}

function smoke(m) {
  return [
    [
      'runs in worker_threads',
      () => m.workers.runtime() === 'worker-threads' || `runtime ${m.workers.runtime()}`,
    ],
    [
      'password hashes and verifies',
      async () => {
        const hash = await m.password.hash('secret', { algorithm: 'bcrypt', cost: 4 });
        return (
          (await m.password.verify('secret', hash)) === true &&
          (await m.password.verify('other', hash)) === false
        );
      },
    ],
    [
      'cipher encrypts and decrypts with every level',
      async () => {
        for (const level of ['basic', 'standard', 'strong', 'cnsa']) {
          const encrypted = await m.cipher.encrypt('hola', SECRET, { level });
          if ((await m.cipher.decrypt(encrypted, SECRET)) !== 'hola') return `level ${level}`;
        }
        return true;
      },
    ],
    [
      'rsa encrypts and signature signs a file',
      async () => {
        const pair = await m.rsa.generateKeyPair({ level: 'basic' });
        const file = new Uint8Array([1, 2, 3, 4]);
        const encrypted = await m.rsa.encrypt(file, pair.publicKey);
        const decrypted = await m.rsa.decryptBytes(encrypted, pair.privateKey);
        const signed = await m.signature.sign(file, pair.privateKey);
        return (
          decrypted.join() === '1,2,3,4' && (await m.signature.verify(file, signed, pair.publicKey))
        );
      },
    ],
    [
      'hash digests the known sha256 vector',
      async () =>
        (await m.hash.digest('abc')) ===
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    ],
    [
      'token and jwt round-trip a JSON payload',
      async () => {
        const encrypted = await m.token.encrypt({ id: 7 }, SECRET, { expiresIn: 60 });
        const signed = await m.jwt.sign({ id: 7 }, SECRET, { expiresIn: 60 });
        return (
          (await m.token.decrypt(encrypted, SECRET)).id === 7 &&
          (await m.jwt.verify(signed, SECRET)).id === 7
        );
      },
    ],
    [
      'errors carry a code',
      async () => {
        try {
          await m.cipher.decrypt('nope', SECRET);
          return 'decrypt did not fail';
        } catch (error) {
          return (error instanceof m.CryptoError && error.code === 'MALFORMED') || String(error);
        }
      },
    ],
    [
      'workers terminate',
      () => {
        m.workers.terminate();
        return true;
      },
    ],
  ];
}

const STRICT_CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'";

async function everyToolInAWebWorker(entry) {
  const m = await import(entry);
  const secret = 'a-secret-key-with-more-than-32-characters';
  if (m.workers.runtime() !== 'web-worker') return `runtime ${m.workers.runtime()}`;
  let ticks = 0;
  const timer = setInterval(() => {
    ticks += 1;
  }, 5);
  const hash = await m.password.hash('secret', { level: 'strong' });
  clearInterval(timer);
  if (ticks < 3) return `the page was blocked while hashing (${ticks} ticks)`;
  if (!(await m.password.verify('secret', hash))) return 'password did not verify';
  const encrypted = await m.cipher.encrypt('hola', secret, { level: 'cnsa' });
  if ((await m.cipher.decrypt(encrypted, secret)) !== 'hola') return 'cipher round trip';
  const pair = await m.rsa.generateKeyPair({ level: 'basic' });
  const file = new Uint8Array([1, 2, 3]);
  const sealed = await m.rsa.encrypt(file, pair.publicKey);
  if ((await m.rsa.decryptBytes(sealed, pair.privateKey)).join() !== '1,2,3') return 'rsa';
  const signed = await m.signature.sign(file, pair.privateKey);
  if (!(await m.signature.verify(file, signed, pair.publicKey))) return 'signature';
  const token = await m.token.encrypt({ id: 7 }, secret, { expiresIn: 60 });
  if ((await m.token.decrypt(token, secret)).id !== 7) return 'token';
  const jwt = await m.jwt.sign({ id: 8 }, secret, { expiresIn: 60 });
  if ((await m.jwt.verify(jwt, secret)).id !== 8) return 'jwt';
  const digest = await m.hash.digest('abc');
  m.workers.terminate();
  return digest === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' || digest;
}

function browser() {
  return [
    ['runs every tool in a Web Worker without blocking the page', everyToolInAWebWorker],
    [
      'runs in a Web Worker under the documented CSP',
      everyToolInAWebWorker,
      { csp: `${STRICT_CSP}; worker-src blob:` },
    ],
    [
      'falls back to the page thread when the CSP blocks blob workers',
      async (entry) => {
        const warnings = [];
        console.warn = (...values) => warnings.push(values.join(' '));
        const m = await import(entry);
        const digest = await m.hash.digest('abc');
        const runtime = m.workers.runtime();
        if (digest !== 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
          return `digest ${digest}`;
        if (runtime !== 'inline') return `runtime ${runtime}`;
        return (
          (warnings.length === 1 && warnings[0].includes('workers are blocked')) ||
          `warnings ${JSON.stringify(warnings)}`
        );
      },
      { csp: `${STRICT_CSP} 'unsafe-eval'` },
    ],
    [
      'rejects with a WORKER error when the CSP allows neither blob workers nor eval',
      async (entry) => {
        console.warn = () => undefined;
        const m = await import(entry);
        try {
          await m.hash.digest('abc');
          return 'the call did not fail';
        } catch (error) {
          return (
            (error instanceof m.CryptoError && error.code === 'WORKER') ||
            `${error && error.name}: ${error && error.message}`
          );
        }
      },
      { csp: STRICT_CSP },
    ],
    [
      'web encrypts what Node decrypts and the other way round',
      async ({ entry, input }) => {
        const m = await import(entry);
        return {
          fromWeb: await m.cipher.encrypt('hola', input.secret, { level: 'strong' }),
          decrypted: await m.cipher.decrypt(input.fromNode, input.secret),
        };
      },
      {
        input: () =>
          withNode(async (node) => ({
            secret: SECRET,
            fromNode: await node.cipher.encrypt('adiós', SECRET, { level: 'cnsa' }),
          })),
        verify: (result) =>
          withNode(async (node) => {
            if (result.decrypted !== 'adiós') return `web decrypted ${result.decrypted}`;
            const decrypted = await node.cipher.decrypt(result.fromWeb, SECRET);
            return decrypted === 'hola' || `Node decrypted ${decrypted}`;
          }),
      },
    ],
    [
      'web signs a file that Node verifies',
      async ({ entry, input }) => {
        const m = await import(entry);
        return m.signature.sign(new Uint8Array(input.file), input.privateKey);
      },
      {
        input: () =>
          withNode(async (node) => ({
            file: FILE,
            ...(await node.rsa.generateKeyPair({ level: 'basic' })),
          })),
        verify: (signed, input) =>
          withNode(
            async (node) =>
              (await node.signature.verify(new Uint8Array(FILE), signed, input.publicKey)) ||
              'Node rejected the signature made in the page',
          ),
      },
    ],
    [
      'web hashes a password that Node verifies',
      async (entry) => {
        const m = await import(entry);
        return m.password.hash('secret', { algorithm: 'bcrypt', cost: 4 });
      },
      {
        verify: (hash) =>
          withNode(
            async (node) =>
              (await node.password.verify('secret', hash)) ||
              `Node rejected the hash made in the page: ${hash}`,
          ),
      },
    ],
    [
      'web and Node agree on tokens, JWT and hashes',
      async ({ entry, input }) => {
        const m = await import(entry);
        return {
          encrypted: await m.token.encrypt({ id: 7 }, input.secret, { expiresIn: 60 }),
          jwtId: (await m.jwt.verify(input.signed, input.secret)).id,
          digest: await m.hash.digest('abc'),
        };
      },
      {
        input: () =>
          withNode(async (node) => ({
            secret: SECRET,
            signed: await node.jwt.sign({ id: 8 }, SECRET, { expiresIn: 60 }),
          })),
        verify: (result) =>
          withNode(async (node) => {
            if (result.jwtId !== 8) return `web read the Node JWT as id ${result.jwtId}`;
            const token = await node.token.decrypt(result.encrypted, SECRET);
            if (token.id !== 7) return `Node read the web token as id ${token.id}`;
            const digest = await node.hash.digest('abc');
            return result.digest === digest || `web digest ${result.digest}, Node ${digest}`;
          }),
      },
    ],
  ];
}

module.exports = { smoke, browser };
