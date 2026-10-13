'use strict';

const SECRET = 'a-secret-key-with-more-than-32-characters';

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
      'CryptoEngine keeps the previous outputs',
      async () =>
        (await new m.CryptoEngine('testhash123').encode('HELLO WORLD')) === 'Pt3/97FmPVoz+4JG',
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

function web(webModule, nodeModule) {
  webModule.workers.configure({ mode: 'inline' });
  return [
    ['runs inline in a realm without workers', () => webModule.workers.runtime() === 'inline'],
    [
      'web encrypts what Node decrypts and the other way round',
      async () => {
        const fromWeb = await webModule.cipher.encrypt('hola', SECRET, { level: 'strong' });
        const fromNode = await nodeModule.cipher.encrypt('adiós', SECRET, { level: 'cnsa' });
        return (
          (await nodeModule.cipher.decrypt(fromWeb, SECRET)) === 'hola' &&
          (await webModule.cipher.decrypt(fromNode, SECRET)) === 'adiós'
        );
      },
    ],
    [
      'web signs a file that Node verifies',
      async () => {
        const pair = await nodeModule.rsa.generateKeyPair({ level: 'basic' });
        const file = new Uint8Array([9, 8, 7]);
        const signed = await webModule.signature.sign(file, pair.privateKey);
        return nodeModule.signature.verify(file, signed, pair.publicKey);
      },
    ],
    [
      'web hashes a password that Node verifies',
      async () => {
        const hash = await webModule.password.hash('secret', { algorithm: 'bcrypt', cost: 4 });
        return nodeModule.password.verify('secret', hash);
      },
    ],
    [
      'web and Node agree on tokens, JWT and CryptoEngine',
      async () => {
        const encrypted = await webModule.token.encrypt({ id: 7 }, SECRET);
        const signed = await nodeModule.jwt.sign({ id: 8 }, SECRET, { expiresIn: 60 });
        const engine = await webModule.CryptoEngine.prototype.encode.call(
          new webModule.CryptoEngine('testhash123'),
          'HELLO WORLD',
        );
        const ok =
          (await nodeModule.token.decrypt(encrypted, SECRET)).id === 7 &&
          (await webModule.jwt.verify(signed, SECRET)).id === 8 &&
          engine === 'Pt3/97FmPVoz+4JG';
        nodeModule.workers.terminate();
        return ok;
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
        const encoded = await new m.CryptoEngine('testhash123').encode('HELLO WORLD');
        const runtime = m.workers.runtime();
        if (encoded !== 'Pt3/97FmPVoz+4JG') return `encoded ${encoded}`;
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
  ];
}

module.exports = { smoke, web, browser };
