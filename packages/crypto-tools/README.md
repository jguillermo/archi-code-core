# @archi-code/crypto-tools

Cryptography toolkit for **browsers and Node.js**: password hashing, symmetric encryption, RSA, file
signatures, hashes and HMAC, encrypted JSON tokens and JWT. All the logic is written in Rust
(well-known crates such as RustCrypto, `bcrypt`, `argon2`, `rsa`, `pasetors` and `jsonwebtoken`) and
compiled into **a single wasm module** shipped inside the package. Every call runs in a **worker**, so
it does not block the main thread. No npm dependencies; dual ESM + CJS build with TypeScript types.

## Installation

```bash
npm install @archi-code/crypto-tools
```

Requires Node.js 24 or later (`engines` field) or a current browser with `WebAssembly`,
`DecompressionStream` and Web Workers.

## Import

ESM:

```ts
import {
  password,
  cipher,
  rsa,
  signature,
  hash,
  token,
  jwt,
  workers,
  CryptoError,
} from '@archi-code/crypto-tools';
```

CommonJS:

```js
const {
  password,
  cipher,
  rsa,
  signature,
  hash,
  token,
  jwt,
  workers,
  CryptoError,
} = require('@archi-code/crypto-tools');
```

The same package serves the browser (`browser` condition → ESM build) and Node (`import` → ESM,
`require` → CJS), without configuring the bundler or loading separate `.wasm` files.

## Common concepts

- **Everything is asynchronous.** Every function returns a `Promise`; use `await`. Errors arrive as
  a rejection with a `CryptoError` (see [Errors](#errors)).
- **Options last.** Almost every function accepts `{ level, algorithm }`:
  - `level`: `'basic' | 'standard' | 'strong' | 'cnsa' | 'military'` (`military` is an alias of
    `cnsa`). Defaults to `standard`. It picks the algorithms for you (see
    [Security levels](#security-levels)).
  - `algorithm`: picks a specific algorithm. If you pass `level` and `algorithm` together and they do
    not match, the call is rejected with `UNSUPPORTED` (`Algorithm argon2id does not match level basic, which uses bcrypt.`).
- **Outputs record their algorithm**, so decrypting or verifying never needs the level.
- **Data**: wherever data is expected, text (`string`, encoded as UTF-8) or `Uint8Array` is accepted.
  In the browser, read a file with `new Uint8Array(await file.arrayBuffer())`; in Node, with
  `fs.readFile` (a `Buffer` is a `Uint8Array`). Keys, passwords and tokens are always `string`.

## `password`: password hashing

```ts
const stored = await password.hash('correct horse battery staple');
// '$argon2id$v=19$m=65536,t=3,p=4$…' (random salt: changes on every call)

await password.verify('correct horse battery staple', stored); // true
await password.verify('other', stored); // false

await password.isHash(stored); // true
await password.isHash('hello'); // false

await password.hash('secret', { level: 'basic' }); // '$2b$10$…' (bcrypt)
await password.hash('secret', { algorithm: 'bcrypt', cost: 12 }); // '$2b$12$…'
await password.hash('secret', { level: 'cnsa' }); // '$argon2id$v=19$m=262144,t=4,p=4$…'

await password.params(); // { algorithm: 'argon2id', memoryKiB: 65536, iterations: 3, parallelism: 4 }
await password.params({ level: 'basic' }); // { algorithm: 'bcrypt', cost: 10 }
```

| Function                | Returns                   | Description                                                                               |
| ----------------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| `hash(plain, options?)` | `Promise<string>`         | Argon2id (`$argon2id$v=19$…`) or bcrypt (`$2b$…`) PHC hash.                               |
| `verify(plain, hash)`   | `Promise<boolean>`        | `true` if the password matches the hash. An unrecognized or too expensive hash → `false`. |
| `isHash(value)`         | `Promise<boolean>`        | Only checks the format (`$2b$` or `$argon2id$v=19$`).                                     |
| `params(options?)`      | `Promise<PasswordParams>` | Parameters `hash` would use with those options, without computing anything.               |

Options (`PasswordOptions`): `level`, `algorithm` (`'bcrypt' | 'argon2id'`) and `cost` (bcrypt only,
from 4 to 14; with Argon2id it is rejected with `UNSUPPORTED`).

### Password length

- `password.hash` accepts at most **64 characters**, counted as a person sees them (grapheme
  clusters): `ñ`, `密` and `🔒` count as 1 each, also when `ñ` arrives decomposed as `n` + `◌̃`
  (JavaScript's `.length` would count `🔒` as 2). A longer password is rejected with `INVALID_INPUT`.
- bcrypt only reads the first 72 **bytes** of UTF-8: 72 ASCII characters, but 36 accented ones, 24
  Chinese ones or 18 emojis. Instead of silently truncating, `hash` with bcrypt (`level: 'basic'` or
  `algorithm: 'bcrypt'`) rejects a password over 72 bytes with `INVALID_INPUT`. Argon2id, the default
  algorithm, has no such limit.

### What `verify` accepts

`password.verify` only accepts the formats `password.hash` produces: bcrypt `$2b$` and Argon2id
version 19 (`$argon2id$v=19$`). Hashes from other libraries or in other formats (`$2a$`, `$2y$`,
Argon2i…) return `false`. It does not truncate either: a password over 72 bytes does not verify
against a bcrypt hash.

It also rejects (returns `false`) any hash that asks for more work than the `cnsa` level: a bcrypt
cost above 14, or Argon2 with more than 256 MiB, t=4 or p=4. That way, a hash read from a place where
an attacker can write cannot ask for gigabytes of memory or days of CPU. `password.isHash` only looks
at the format, so it still returns `true` for those hashes.

## `cipher`: symmetric encryption

```ts
const key = await cipher.generateKey(); // 32 random bytes in base64url (43 characters)

const encrypted = await cipher.encrypt('hello world', key);
// 'v1.aes-256-gcm.hkdf-sha256.<salt>.<nonce>.<ciphertext>'
await cipher.decrypt(encrypted, key); // 'hello world'

const fileBytes = new Uint8Array([1, 2, 3]);
const sealed = await cipher.encrypt(fileBytes, key, { level: 'strong' });
// 'v1.xchacha20-poly1305.hkdf-sha256.…'
await cipher.decryptBytes(sealed, key); // Uint8Array [1, 2, 3]

const cnsaKey = await cipher.generateKey({ level: 'cnsa' });
await cipher.encrypt('hello', cnsaKey, { level: 'cnsa' }); // 'v1.aes-256-gcm.hkdf-sha384.…'
```

| Function                                 | Returns               | Description                                                                        |
| ---------------------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| `generateKey(options?)`                  | `Promise<string>`     | Random 32-byte key in base64url.                                                   |
| `encrypt(data, key, options?)`           | `Promise<string>`     | `v1.<alg>.<kdf>.<salt>.<nonce>.<ciphertext>` (base64url). AEAD: detects tampering. |
| `decrypt(encrypted, key, options?)`      | `Promise<string>`     | Decrypts to UTF-8 text (`MALFORMED` if it is not UTF-8: use `decryptBytes`).       |
| `decryptBytes(encrypted, key, options?)` | `Promise<Uint8Array>` | Decrypts to bytes.                                                                 |

- Algorithms (`CipherAlgorithm`): `'aes-128-gcm' | 'aes-256-gcm' | 'chacha20-poly1305' | 'xchacha20-poly1305'`.
- `encrypt` accepts `{ level, algorithm, password }`; `decrypt` and `decryptBytes` accept
  `{ algorithm }` to require a specific algorithm (if the data was encrypted with another one →
  `UNSUPPORTED`).
- A wrong key or tampered data are rejected with `TAMPERED`; text that does not have the format, with
  `MALFORMED`.

### Random keys versus passwords

By default the key is derived with HKDF, which is fast and assumes the key is already random: use
`cipher.generateKey()` or another secret of at least **16 characters** (**32** with `level: 'cnsa'`,
which derives with HKDF-SHA384) that nobody chose by hand. A shorter key is rejected with
`INVALID_KEY`. HKDF does not slow down guessing attempts, so with a password typed by a person,
anyone who has an output could find it offline.

For a password typed by a person, pass `{ password: true }`: the key is derived with Argon2id and a
random salt (64 MiB, t=3, p=4; 256 MiB, t=4 with `cnsa`), deliberately slow. The password must have
**8 to 64 characters** (counted as in `password.hash`; otherwise `INVALID_KEY`).

```ts
const locked = await cipher.encrypt('private note', 'my long passphrase', { password: true });
// 'v1.aes-256-gcm.argon2id-m65536-t3-p4.…'
await cipher.decrypt(locked, 'my long passphrase'); // 'private note' (no options needed)
```

The output records the derivation, so `decrypt` needs no options; it only accepts the Argon2
parameters this package produces, so tampered data cannot ask for huge amounts of memory.

## `rsa`: asymmetric encryption

```ts
const { publicKey, privateKey } = await rsa.generateKeyPair({ level: 'standard' });
// publicKey: '-----BEGIN PUBLIC KEY-----…' (SPKI)   privateKey: '-----BEGIN PRIVATE KEY-----…' (PKCS#8)

const sealed = await rsa.encrypt('secret message', publicKey);
// compact JWE with header {"alg":"RSA-OAEP-256","enc":"A256GCM"}
await rsa.decrypt(sealed, privateKey); // 'secret message'

const fileBytes = new Uint8Array([9, 8, 7]);
const sealedFile = await rsa.encrypt(fileBytes, publicKey);
await rsa.decryptBytes(sealedFile, privateKey); // Uint8Array [9, 8, 7]
```

| Function                              | Returns               | Description                                             |
| ------------------------------------- | --------------------- | ------------------------------------------------------- |
| `generateKeyPair(options?)`           | `Promise<RsaKeyPair>` | `{ publicKey, privateKey }` in PEM (SPKI / PKCS#8).     |
| `encrypt(data, publicKey, options?)`  | `Promise<string>`     | JWE `RSA-OAEP-*` + `A256GCM`: RSA wraps an AES-256 key. |
| `decrypt(encrypted, privateKey)`      | `Promise<string>`     | Decrypts to UTF-8 text.                                 |
| `decryptBytes(encrypted, privateKey)` | `Promise<Uint8Array>` | Decrypts to bytes.                                      |

- `generateKeyPair` accepts `{ level, bits }` with `bits` in `2048 | 3072 | 4096`. Any other size, or
  one smaller than the level's (`{ level: 'strong', bits: 2048 }`), is rejected with `UNSUPPORTED`.
- `encrypt` accepts `{ level, algorithm }` with `algorithm` in `'RSA-OAEP-256' | 'RSA-OAEP-384' | 'RSA-OAEP-512'`.
  A key smaller than the requested level's is rejected with `INVALID_KEY` (`RSA key of 2048 bits is below the 3072 bits required by level standard.`).
- Only PEM SPKI (public) and PKCS#8 (private) keys of at least 2048 bits are supported. Any other
  format → `INVALID_KEY`.
- Generating a 4096-bit key can take several seconds, longer on slow phones.

## `signature`: file signatures

```ts
const { publicKey, privateKey } = await rsa.generateKeyPair();
const fileBytes = new TextEncoder().encode('file contents');

const signed = await signature.sign(fileBytes, privateKey);
// '<header>..<signature>': header {"alg":"PS256","b64":false,"crit":["b64"]} and empty payload
await signature.verify(fileBytes, signed, publicKey); // true
await signature.verify('other contents', signed, publicKey); // false
```

| Function                           | Returns            | Description                                              |
| ---------------------------------- | ------------------ | -------------------------------------------------------- |
| `sign(data, privateKey, options?)` | `Promise<string>`  | Detached JWS with unencoded payload (RFC 7797), RSA-PSS. |
| `verify(data, signed, publicKey)`  | `Promise<boolean>` | `true` if the signature matches the data and the key.    |

- Algorithms (`SignatureAlgorithm`): `'PS256' | 'PS384' | 'PS512'`. The signature does not include
  the data: store it next to the file and pass the same bytes to `verify`.
- `sign` checks the key size of the level it receives (`INVALID_KEY` if smaller); `verify` requires at
  least 2048 bits.

## `hash`: digests and HMAC

```ts
await hash.digest('hello');
// '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' (SHA-256, hex)
await hash.digest(new Uint8Array([104, 101, 108, 108, 111]), { level: 'cnsa' }); // SHA-512, 128 hex characters
await hash.digest('hello', { algorithm: 'blake2b' });
// '324dcf027dd4a30a932c441f365a25e86b173defa4b8e58948253471b81b72cf' (32-byte BLAKE2b)

await hash.hmac('hello', 'key');
// '9307b3b915efb5171ff14d8cb55fbcc798c6c0ef1456d66ded1a6aa723a58b7b' (HMAC-SHA256)
await hash.hmac('hello', 'key', { level: 'strong' }); // HMAC-SHA384, 96 hex characters
```

| Function                    | Returns           | Description  |
| --------------------------- | ----------------- | ------------ |
| `digest(data, options?)`    | `Promise<string>` | Hash in hex. |
| `hmac(data, key, options?)` | `Promise<string>` | HMAC in hex. |

- `digest`: `algorithm` in `'sha256' | 'sha384' | 'sha512' | 'blake2b'`.
- `hmac`: `algorithm` in `'sha256' | 'sha384' | 'sha512'` (`blake2b` → `UNSUPPORTED`). The key cannot
  be empty (`INVALID_KEY`).

## `token`: encrypted JSON tokens

Opaque tokens: the content is encrypted and authenticated; nobody without the key can read or modify it.

```ts
const tokenKey = await token.generateKey(); // 32 random bytes in base64url

const opaque = await token.encrypt({ userId: 7 }, tokenKey, { expiresIn: 3600 });
// 'v4.local.…' (PASETO v4.local)
await token.decrypt(opaque, tokenKey);
// { exp: '2026-10-13T16:29:51Z', iat: '2026-10-13T15:29:51Z', userId: 7 } (dates from a real run)
```

| Function                               | Returns           | Description                                                         |
| -------------------------------------- | ----------------- | ------------------------------------------------------------------- |
| `generateKey()`                        | `Promise<string>` | Random 32-byte key in base64url.                                    |
| `encrypt(payload, key, options?)`      | `Promise<string>` | PASETO `v4.local` (JWE `dir` + `A256GCM` with `level: 'cnsa'`).     |
| `decrypt<P>(encrypted, key, options?)` | `Promise<P>`      | Decrypts and checks `exp` and `nbf`. Detects the format on its own. |

- `encrypt` accepts `{ level, algorithm, expiresIn, requireExpiration }`; `algorithm` in
  `'paseto-v4-local' | 'jwe-dir-a256gcm'`; `expiresIn` in seconds.
- `iat` and `exp` are stored as RFC 3339 dates (text), not as numbers. If the payload already has
  `iat`, it is kept.
- The key is derived with HKDF: use `token.generateKey()` or another random secret of at least 16
  characters (32 with `cnsa`). `token` has no password mode.
- The payload must be a plain object serializable with `JSON.stringify` (a `BigInt` or a cycle →
  `INVALID_INPUT`).

### Mandatory expiration

`token.encrypt` rejects (`INVALID_INPUT`) a payload with neither `expiresIn` nor an `exp` claim,
unless it receives `requireExpiration: false`. `token.decrypt(data, key)` rejects a token without
`exp` (`MALFORMED`) unless it receives `{ requireExpiration: false }`, and one that is expired or not
yet active (`EXPIRED`).

```ts
const tokenKey = await token.generateKey();
const forever = await token.encrypt({ userId: 7 }, tokenKey, { requireExpiration: false });
await token.decrypt(forever, tokenKey); // rejects with CryptoError MALFORMED (it has no exp)
await token.decrypt(forever, tokenKey, { requireExpiration: false });
// { iat: '2026-10-13T15:29:51Z', userId: 7 }
```

## `jwt`: JSON Web Tokens

```ts
const secret = 'a-secret-of-at-least-16';

const signed = await jwt.sign({ userId: 7, role: 'admin' }, secret, {
  expiresIn: 3600,
  issuer: 'my-app',
  audience: 'api',
});
await jwt.verify(signed, secret, { issuer: 'my-app', audience: 'api' });
// { aud: 'api', exp: 1791908991, iat: 1791905391, iss: 'my-app', role: 'admin', userId: 7 }
// (timestamps from a real run)

await jwt.decode(signed); // the same payload, read WITHOUT verifying the signature

const { publicKey, privateKey } = await rsa.generateKeyPair();
const rs = await jwt.sign({ sub: 'u1' }, privateKey, { expiresIn: 600 }); // header {"typ":"JWT","alg":"RS256"}
await jwt.verify(rs, publicKey); // { exp: …, iat: …, sub: 'u1' }
```

| Function                           | Returns           | Description                                                               |
| ---------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `sign(payload, key, options?)`     | `Promise<string>` | Signs with a secret (HS256/384/512) or a PEM private key (RS256/384/512). |
| `verify<P>(signed, key, options?)` | `Promise<P>`      | Verifies signature, `exp`, `nbf`, `iss` and `aud`; returns the payload.   |
| `decode<P>(signed)`                | `Promise<P>`      | Decodes the payload **without verifying**. Do not use it to authorize.    |

- The key type decides the family: text that starts with `-----BEGIN` is PEM (RS\*); anything else
  is a secret (HS\*). Asking for `algorithm: 'HS256'` with a PEM (or RS\* with a secret) →
  `INVALID_KEY`.
- `sign` options (`JwtSignOptions`): `level`, `algorithm` (`'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512'`),
  `expiresIn` (seconds), `issuer`, `subject`, `audience` (`string | string[]`) and `requireExpiration`.
  An unknown option is rejected with `INVALID_INPUT`.
- `verify` options (`JwtVerifyOptions`): `algorithms` (allow list; defaults to the key's family),
  `issuer`, `audience`, `clockTolerance` (seconds, 0 or positive) and `requireExpiration`.
- `iat` and `exp` are Unix seconds (numbers). If the payload already has `iat`, it is kept.
- Secrets need **at least 16 characters**, both to sign and to verify (`INVALID_KEY`). RSA keys need
  at least 2048 bits, also to verify; `sign` additionally checks the size of the level it receives.
- Invalid signature or wrong key → `TAMPERED`; different `iss` or `aud` → `TAMPERED`; expired or not
  yet active → `EXPIRED`; algorithm not allowed → `UNSUPPORTED`; text that is not a JWT →
  `MALFORMED`.

### Mandatory expiration

`jwt.sign` needs an expiration: `expiresIn`, an `exp` claim in the payload, or an explicit
`requireExpiration: false` for a token that never expires (otherwise `INVALID_INPUT`). `jwt.verify`
rejects a token without `exp` (`MALFORMED`) unless it receives `requireExpiration: false`, and an
expired one (`EXPIRED`).

```ts
const secret = 'a-secret-of-at-least-16';
await jwt.sign({ a: 1 }, secret); // rejects with CryptoError INVALID_INPUT (no expiration)
const forever = await jwt.sign({ a: 1 }, secret, { requireExpiration: false });
await jwt.verify(forever, secret); // rejects with CryptoError MALFORMED (it has no exp)
await jwt.verify(forever, secret, { requireExpiration: false }); // { a: 1, iat: … }
```

## Security levels

`securityLevels()` returns what each level uses (`SecurityLevels`, without the `military` alias):

```ts
import { securityLevels, SECURITY_LEVEL_NAMES } from '@archi-code/crypto-tools';

SECURITY_LEVEL_NAMES; // ['basic', 'standard', 'strong', 'cnsa', 'military']
(await securityLevels()).basic;
// { cipher: 'aes-128-gcm', hash: 'sha256', jwt: { pem: 'RS256', secret: 'HS256' },
//   password: { algorithm: 'bcrypt', cost: 10 },
//   rsa: { bits: 2048, encryption: 'RSA-OAEP-256', signature: 'PS256' },
//   token: 'paseto-v4-local' }
```

| Tool        | `basic`         | `standard` (default)      | `strong`                  | `cnsa` / `military`                |
| ----------- | --------------- | ------------------------- | ------------------------- | ---------------------------------- |
| `cipher`    | AES-128-GCM     | AES-256-GCM               | XChaCha20-Poly1305        | AES-256-GCM, HKDF-SHA384, key ≥ 32 |
| `token`     | PASETO v4.local | PASETO v4.local           | PASETO v4.local           | JWE `dir` + `A256GCM`              |
| `hash`      | SHA-256         | SHA-256                   | SHA-384                   | SHA-512                            |
| `password`  | bcrypt cost 10  | Argon2id t=3, 64 MiB, p=4 | Argon2id t=3, 64 MiB, p=4 | Argon2id t=4, 256 MiB, p=4         |
| `rsa`       | 2048, OAEP-256  | 3072, OAEP-256            | 4096, OAEP-384            | 4096, OAEP-512                     |
| `signature` | PS256 (2048)    | PS256 (3072)              | PS384 (4096)              | PS512 (4096)                       |
| `jwt`       | HS256 / RS256   | HS256 / RS256             | HS384 / RS384             | HS512 / RS512                      |

Algorithms outside the levels, available with `algorithm`: `chacha20-poly1305` in `cipher` and
`blake2b` in `hash.digest`.

These values are a choice of this package and **must be checked against the sources before using
them** to claim compliance with a standard:

- `cnsa` follows the algorithm families of the NSA Commercial National Security Algorithm Suite (CNSA
  1.0: AES-256, SHA-384 or higher, RSA ≥ 3072). CNSA does not cover password hashing, PASETO or
  XChaCha20; `military` is a name, not a certification.
- Argon2id in `standard` and `strong` uses the second recommended option of RFC 9106 (t=3, 64 MiB, 4
  lanes); for passwords both levels are the same.
- The bcrypt costs follow common practice; see the OWASP Password Storage Cheat Sheet.

## Errors

Every function rejects with a `CryptoError` (a subclass of `Error`, `name === 'CryptoError'`) that
carries a stable `code`. `CRYPTO_ERROR_CODES` holds the full list. Messages are in English and may
change: decide on the `code`, not on the text.

| `code`          | When                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_KEY`   | Invalid key or secret: too short, PEM that is not SPKI/PKCS#8, RSA below the level, empty HMAC key.                                           |
| `INVALID_INPUT` | Invalid input: wrong type, password > 64 characters or > 72 bytes with bcrypt, non-serializable payload, missing expiration, invalid options. |
| `TAMPERED`      | Tampered data or signature, wrong key, mismatched JWT `iss`/`aud`.                                                                            |
| `EXPIRED`       | Token or JWT expired or not yet active (`nbf`).                                                                                               |
| `MALFORMED`     | The text does not have the expected format, `exp` is missing when verifying, or the decrypted data is not UTF-8.                              |
| `UNSUPPORTED`   | Unknown level or algorithm, `level` and `algorithm` that do not match, unsupported RSA size, JWT algorithm not allowed.                       |
| `WORKER`        | The worker failed (wasm trap, out of memory), could not start, or the pool was closed with the call in progress.                              |
| `TIMEOUT`       | The worker did not answer within `timeout` ms.                                                                                                |

```ts
import { CryptoError, jwt } from '@archi-code/crypto-tools';

const secret = 'a-secret-of-at-least-16';
const signedJwt = await jwt.sign({ exp: 1 }, secret); // exp in 1970: already expired

try {
  const claims = await jwt.verify(signedJwt, secret);
} catch (error) {
  if (error instanceof CryptoError) {
    switch (error.code) {
      case 'EXPIRED':
        console.log('expired'); // this is printed
        break;
      case 'TAMPERED':
      case 'MALFORMED':
        console.log('invalid token');
        break;
      default:
        throw error;
    }
  }
}
```

`password.verify` and `signature.verify` return `false` when the password or the signature does not
match; they only reject on invalid input (for example, an argument that is not a `string`).

## Workers and environments

Calls go to a lazy pool of up to `min(4, cores − 1)` workers (at least 1): Web Workers created from
a Blob URL in browsers and `worker_threads` in Node. Idle workers do not keep a Node process alive,
so a script exits on its own without closing the pool.

```ts
import { workers } from '@archi-code/crypto-tools';

workers.runtime(); // 'worker-threads' in Node; 'web-worker' in the browser
workers.configure({ size: 2, timeout: 120_000, idleTimeout: 10_000 });
workers.terminate(); // closes the workers (e.g. at the end of the tests)
```

| Function             | Description                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configure(options)` | Changes the configuration and closes the current workers. It is synchronous and throws `CryptoError` (`INVALID_INPUT`) if an option is not valid. |
| `terminate()`        | Closes the workers; calls in progress reject with `WORKER`. The next call creates new workers.                                                    |
| `runtime()`          | Where calls will run: `'web-worker'`, `'worker-threads'` or `'inline'`.                                                                           |

Options (`WorkersOptions`):

| Option        | Default             | Description                                                                                                                                                       |
| ------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `size`        | `min(4, cores − 1)` | Maximum number of workers (integer ≥ 1).                                                                                                                          |
| `mode`        | `'auto'`            | `'auto'`: workers if they exist, otherwise the current thread. `'worker'`: fails with `WORKER` if there are no workers. `'inline'`: always on the current thread. |
| `timeout`     | `60000` ms          | A worker that does not answer within that time is replaced and the call rejects with `TIMEOUT`. `Infinity` disables it.                                           |
| `idleTimeout` | `30000` ms          | A worker idle for that time is closed to give back its memory. `Infinity` keeps them.                                                                             |

`configure()` and `terminate()` close the current workers and calls in progress reject with
`WORKER`: configure the pool before using it.

- **Timeout.** Calls that were waiting behind the one that timed out move to another worker. The
  current thread cannot be interrupted, so inline mode has no timeout. Generating a 4096-bit RSA key
  can take several seconds, longer on slow phones: raise `timeout` if the app generates keys there.
- **Failures.** A call that causes a wasm trap (a Rust panic, out of memory) rejects with `WORKER` and
  its worker is replaced, so later calls never run on a broken instance. A worker whose wasm cannot
  start rejects its calls with `WORKER` and is discarded; the next call creates a new one.
- **Fallback to the current thread.** Where no workers exist, or the page blocks `blob:` Web Workers
  before they start, calls run on the current thread (with a single console warning). A worker that
  started and later fails (for example, out of memory in an Argon2 hash) rejects its calls with
  `WORKER` and the pool keeps using workers.
- **Bytes.** A `Uint8Array` is copied to the worker. A view over a larger buffer (a `subarray`, or a
  small Node `Buffer` from the shared pool) and the bytes of a `SharedArrayBuffer` are copied first,
  so the worker only receives the bytes of the view.
- **Memory.** wasm memory only grows: an Argon2id hash leaves 64 MiB (256 MiB with `cnsa`) in its
  worker, up to that times the pool size. `idleTimeout` closes idle workers to give it back; the next
  call starts a new one, which only instantiates the already compiled module.
- **Secrets in memory.** Derived keys, AES and RSA content keys and AES key schedules are wiped
  (`zeroize`) when the call ends. Keys and passwords arrive as JavaScript strings, which nobody can
  wipe, and the copy made by the wasm glue is freed but not wiped; closing an idle worker gives back
  all of its memory.

### Content Security Policy (browser)

The page needs `script-src 'wasm-unsafe-eval'` (the wasm is compiled from the package) and
`worker-src blob:` for the workers, for example:

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src blob:
```

Without `blob:` calls move to the current thread, which also needs `'unsafe-eval'` because it
evaluates the embedded wasm-bindgen glue; with neither of the two, every call rejects with `WORKER`.

### Data and package size

- `cipher.encrypt`, `rsa.encrypt` and `signature` process the whole input in memory: it is copied to
  the worker and then to wasm memory (at most 4 GiB, shared with the output), and encrypted outputs
  are base64url strings of about 4/3 of the input. JavaScript engines limit the length of a string
  (V8: about 512 Mi characters), so keep each input well below 380 MiB and split larger files into
  parts.
- The wasm (about 1.3 MiB) ships gzip-compressed and base64-encoded inside the JavaScript: about 690
  KiB per build (ESM or CJS; an app loads one, about 495 KiB if the server serves it with gzip). It is
  decompressed once with the standard `DecompressionStream` (check its support if you target older
  Safari or Firefox).

## Security and known risk

The `rsa` crate has advisory RUSTSEC-2023-0071 (Marvin attack): its arithmetic is not constant-time,
so the timing of **every private-key operation** can leak information about the key. Here that means
`rsa.decrypt` / `rsa.decryptBytes`, `signature.sign` and `jwt.sign` with an RSA PEM key; verifying and
encrypting only use the public key and are not affected. No version of `rsa` fixes it yet (including
the 0.10 release candidates).

Mitigation in this package: every private-key operation uses RSA blinding with a fresh random value
(`decrypt_blinded`, `BlindedSigningKey`; `jsonwebtoken` applies blinding to its RS\* signatures),
which hides the relationship between the input and the timing but does not make the code
constant-time. The advisory's own recommendation still applies: avoid these operations where an
attacker can measure their timing, for example a server that decrypts or signs data from the network
on demand. Local use, or signing your own data, is fine. Details:
https://rustsec.org/advisories/RUSTSEC-2023-0071.

Other guidelines:

- Use random keys (`generateKey()`) for `cipher` and `token`; for passwords typed by a person use
  `cipher` with `{ password: true }` and never `token`.
- `jwt.decode` verifies nothing: use `jwt.verify` for any authorization decision.
- The levels are a choice of this package (see [Security levels](#security-levels)); they are not
  equivalent to a certification.

## Exports summary

| Export                 | Kind     | Contents                                                |
| ---------------------- | -------- | ------------------------------------------------------- |
| `password`             | object   | `hash`, `verify`, `isHash`, `params`                    |
| `cipher`               | object   | `generateKey`, `encrypt`, `decrypt`, `decryptBytes`     |
| `rsa`                  | object   | `generateKeyPair`, `encrypt`, `decrypt`, `decryptBytes` |
| `signature`            | object   | `sign`, `verify`                                        |
| `hash`                 | object   | `digest`, `hmac`                                        |
| `token`                | object   | `generateKey`, `encrypt`, `decrypt`                     |
| `jwt`                  | object   | `sign`, `verify`, `decode`                              |
| `workers`              | object   | `configure`, `terminate`, `runtime`                     |
| `securityLevels`       | function | `() => Promise<SecurityLevels>`                         |
| `CryptoError`          | class    | Error with `code: CryptoErrorCode`                      |
| `CRYPTO_ERROR_CODES`   | constant | List of the 8 error codes                               |
| `SECURITY_LEVEL_NAMES` | constant | `['basic', 'standard', 'strong', 'cnsa', 'military']`   |

Exported types: `SecurityLevel`, `LevelOptions`, `PasswordParams`, `SecurityLevelDescription`,
`SecurityLevels`, `CryptoErrorCode`, `PasswordAlgorithm`, `PasswordOptions`, `CipherAlgorithm`,
`CipherKeyOptions`, `CipherOptions`, `CipherDecryptOptions`, `RsaAlgorithm`, `RsaBits`, `RsaKeyPair`,
`RsaKeyPairOptions`, `RsaOptions`, `SignatureAlgorithm`, `SignatureOptions`, `HashAlgorithm`,
`HmacAlgorithm`, `HashOptions`, `HmacOptions`, `TokenAlgorithm`, `TokenOptions`, `TokenDecryptOptions`,
`TokenPayload`, `JwtAlgorithm`, `JwtSignOptions`, `JwtVerifyOptions`, `JwtPayload`, `WorkerMode`,
`WorkersOptions` and `WorkerRuntime`.

## AI assistant skill

The package includes `SKILL.md`, a Claude Code skill with the rules, patterns and common mistakes for
writing correct and secure code with this library. For the full API it points to this README inside
`node_modules/@archi-code/crypto-tools`, so it stays valid when you update the package.

To install it in your project, run this from the project root; it links the skill into the Claude
Code skills folder:

```bash
mkdir -p .claude/skills/archi-code-crypto-tools && ln -sf "./node_modules/@archi-code/crypto-tools/SKILL.md" .claude/skills/archi-code-crypto-tools/SKILL.md
```

### How to use

Invoke it with a request:

```text
/archi-code-crypto-tools add sign-up and login with hashed passwords and 15-minute JWTs
```

Or ask for the task without naming it, and Claude loads it on its own because it matches its
description:

```text
Encrypt the iban field before saving it and decrypt it when reading it
```

It also works for reviewing code that already uses the package:

```text
/archi-code-crypto-tools review the authentication code: await, token expiration and CryptoError handling
```

With the skill loaded, Claude follows its rules, avoids the mistakes in its "What not to do" list
and, before using anything the skill does not show, reads this README in `node_modules`.

### Keeping it up to date

- The link points to the `SKILL.md` installed in `node_modules`, so it follows the version of
  `@archi-code/crypto-tools` you have installed.
- Each person runs the command in their own copy of the project. Do not commit it; add `.claude/skills/archi-code-crypto-tools/` to `.gitignore`.

## License

MIT
