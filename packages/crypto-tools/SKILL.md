---
name: archi-code-crypto-tools
description: Rules, patterns and common mistakes for writing correct and secure code with @archi-code/crypto-tools, the Rust→wasm cryptography toolkit for the browser and Node.js that runs every call in workers. Use it when hashing or verifying passwords, encrypting or decrypting, using RSA or signatures, computing hashes or HMAC, issuing or verifying tokens and JWTs, choosing a security level, handling a CryptoError or configuring the worker pool; and whenever the code imports @archi-code/crypto-tools.
---

# archi-code-crypto-tools

`@archi-code/crypto-tools` is a cryptography toolkit written in Rust, compiled into a single embedded
wasm and run in a pool of workers (Web Workers in the browser, `worker_threads` in Node). Same
package and same API in the browser and Node, with no npm dependencies and no bundler configuration.

## Full API

Before using a function, option, algorithm or type that does not appear in this skill, read
`node_modules/@archi-code/crypto-tools/README.md`: it matches the installed version. Do not assume
signatures, options or defaults. If the package is not installed:
`npm install @archi-code/crypto-tools`.

If that path does not exist (monorepo with workspaces, pnpm…), locate the package with
`node -p "require.resolve('@archi-code/crypto-tools/package.json')"` and read the `README.md` in that
folder.

## Related skills

If they are installed in the project, use them together with this one:

- `archi-code-validation`: validate input (email, password length…) before hashing or signing.

## Import

```ts
import { password, cipher, jwt, token, CryptoError } from '@archi-code/crypto-tools';
```

```js
const { password, cipher, jwt, token, CryptoError } = require('@archi-code/crypto-tools');
```

There is no default export and no subpaths (`@archi-code/crypto-tools/jwt` does not exist).

## Rules

1. **Everything is async**: every function (except `workers.*`, which is synchronous) returns a
   `Promise`. Always use `await`; an error arrives as a rejection with `CryptoError`, never as a
   return value.
2. **Options last**, as an object `{ level, algorithm, … }`. Levels: `basic`, `standard` (default),
   `strong` and `cnsa` (`military` is its alias). If `level` and `algorithm` do not match →
   `UNSUPPORTED`: pass one or the other.
3. **Outputs record their algorithm**: `decrypt`/`verify` do not need `level`.
4. **Passwords**: `standard` is Argon2id; only `basic` uses bcrypt. At most **64 characters**
   (grapheme clusters, not `.length`); bcrypt rejects passwords over **72 UTF-8 bytes** instead of
   truncating them. Both cases → `INVALID_INPUT`. `password.verify` returns `false` if it does not
   match.
5. **Mandatory expiration**: `jwt.sign` and `token.encrypt` require `expiresIn` or an `exp` claim,
   unless `requireExpiration: false`, which must then also be passed to `verify`/`decrypt`.
6. **Errors by `code`**: `CryptoError` has a `code` (`INVALID_KEY`, `INVALID_INPUT`, `TAMPERED`,
   `EXPIRED`, `MALFORMED`, `UNSUPPORTED`, `WORKER`, `TIMEOUT`). Messages are not a contract.
7. **No compatibility with other libraries**: it only reads what it produces itself. It does not
   verify `bcryptjs` hashes (`$2a$`, `$2y$`) or Argon2i/d, does not decrypt data from
   `crypto.createCipheriv` and does not load PKCS#1 keys (`BEGIN RSA PRIVATE KEY`).
8. **Worker pool**:
   - Call `workers.configure(...)` once at startup, before the first call; doing it with calls in
     progress rejects them with `WORKER`.
   - A call that exceeds `timeout` rejects with `TIMEOUT` and the worker is replaced; a wasm trap
     rejects with `WORKER`. Idle workers close on their own after `idleTimeout`.
   - A Node script exits on its own; in tests (Jest) or when shutting down a server call
     `workers.terminate()` (for example in `afterAll`).
   - If the app generates 4096-bit RSA keys or uses `cnsa` on slow devices, raise `timeout`.
   - In a browser with CSP: `script-src 'wasm-unsafe-eval'` and `worker-src blob:`. Without `blob:`
     everything runs on the main thread and also needs `'unsafe-eval'`; without both, every call
     rejects with `WORKER`.

## Recommended patterns

Sign-up and login:

```ts
const stored = await password.hash(plainPassword); // Argon2id; store the whole string
const ok = await password.verify(plainPassword, stored); // boolean, does not throw on mismatch
```

Encrypt with an application key (generate it once and store it as a secret):

```ts
const key = await cipher.generateKey();
const encrypted = await cipher.encrypt(data, key);
const plain = await cipher.decrypt(encrypted, key); // or decryptBytes for binary data
```

Session with JWT (always with expiration):

```ts
const accessToken = await jwt.sign({ sub: userId, role }, jwtSecret, {
  expiresIn: 900,
  issuer: 'my-app',
});
const claims = await jwt.verify(accessToken, jwtSecret, { issuer: 'my-app' });
```

Error handling by code:

```ts
try {
  return await jwt.verify(accessToken, jwtSecret);
} catch (error) {
  if (
    error instanceof CryptoError &&
    (error.code === 'EXPIRED' || error.code === 'TAMPERED' || error.code === 'MALFORMED')
  ) {
    return null;
  }
  throw error;
}
```

## What not to do

- Do not forget `await` or compare the `Promise` (`if (password.verify(...))` is always true).
- Do not wrap `password.verify` in `try/catch` expecting an exception for a wrong password: it
  returns `false`. The same goes for `signature.verify`.
- Do not pass passwords over 64 characters, or over 72 bytes with bcrypt; validate the length in the
  form or catch `INVALID_INPUT`.
- Do not use `level: 'basic'` (bcrypt) for new passwords without a reason: `standard` (Argon2id) is
  the recommended default.
- Do not expect compatibility with hashes, ciphertexts or keys from other libraries (see Rules, 7).
- Do not use a human password as a `cipher` key without `{ password: true }`, nor as a `token` key
  (it has no password mode): use `generateKey()`.
- Do not sign JWTs without expiration: `jwt.sign` and `token.encrypt` require `expiresIn` or an `exp`
  claim; `requireExpiration: false` only for tokens that truly never expire, and then
  `verify`/`decrypt` also need `{ requireExpiration: false }`.
- Do not use `jwt.decode` to authorize: it does not verify the signature.
- Do not invent `jwt` options (`expiresInMinutes`, `notBefore`, `jwtid`, `ignoreExpiration`…):
  unknown ones → `INVALID_INPUT`. Check the installed README.
- Do not compare `hash.digest` hashes for passwords, and do not present `password.hash` hashes as
  deterministic: they carry a random salt.
- Do not mix contradictory `level` and `algorithm` (`{ level: 'basic', algorithm: 'argon2id' }` →
  `UNSUPPORTED`).
- Do not pass objects with `BigInt` or cycles as a `jwt`/`token` payload.
- Do not use RSA keys under 2048 bits or PKCS#1 PEM; use `rsa.generateKeyPair`.
- Do not load huge files at once: `cipher.encrypt`, `rsa.encrypt` and `signature` work in memory;
  keep each input well below 380 MiB and split larger files into chunks.
- Do not ignore the known risk of the `rsa` crate (advisory RUSTSEC-2023-0071): it is described in
  the "Security and known risk" section of the README; review it before using RSA private-key
  operations.
- `cnsa`/`military` is an algorithm choice of this package, not a certification: do not present it
  as regulatory compliance without reviewing it.
