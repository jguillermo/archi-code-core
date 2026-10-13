# @archi-code/crypto-tools

Crypto toolkit for **browsers and Node.js**: password hashing, two-way encryption, RSA, file
signatures, hashes, encrypted JSON tokens and JWT. All the logic is Rust (well-known crates such as
RustCrypto, `bcrypt`, `argon2`, `rsa`, `pasetors`, `jsonwebtoken`) compiled into **one wasm module**
that ships inside the package. Every call runs in a **worker**, so it never blocks the main thread. No
npm dependencies; dual ESM + CJS build.

```bash
npm install @archi-code/crypto-tools
```

## Usage

Every function is async and takes its options last. `level` picks the algorithms for you;
`algorithm` picks one explicitly.

```ts
import { password, cipher, rsa, signature, hash, token, jwt } from '@archi-code/crypto-tools';

const stored = await password.hash('secret', { level: 'strong' });
await password.verify('secret', stored); // true (bcrypt and Argon2id hashes)

const key = await cipher.generateKey({ level: 'cnsa' });
const encrypted = await cipher.encrypt('hola', key, { level: 'cnsa' });
await cipher.decrypt(encrypted, key); // 'hola'
const locked = await cipher.encrypt('hola', 'a password people type', { password: true });

const { publicKey, privateKey } = await rsa.generateKeyPair({ level: 'standard' });
const sealed = await rsa.encrypt(fileBytes, publicKey); // RSA wraps an AES key (see Data size)
await rsa.decryptBytes(sealed, privateKey);

const signed = await signature.sign(fileBytes, privateKey);
await signature.verify(fileBytes, signed, publicKey); // true

await hash.digest('text', { level: 'basic' }); // hex
await hash.hmac('text', 'key');

const tokenKey = await token.generateKey();
const opaque = await token.encrypt({ userId: 7 }, tokenKey, { expiresIn: 3600 });
await token.decrypt(opaque, tokenKey); // { userId: 7, iat, exp }

const signedJwt = await jwt.sign({ userId: 7 }, 'a-secret-of-16-chars+', { expiresIn: 3600 });
await jwt.verify(signedJwt, 'a-secret-of-16-chars+');
```

In the browser, read files with `new Uint8Array(await file.arrayBuffer())`; in Node, with
`fs.readFile`. Text and `Uint8Array` are accepted wherever data is expected.

## Tools

| Module         | Functions                                                                     | Output                                                    |
| -------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| `password`     | `hash`, `verify`, `isHash`, `params`                                          | bcrypt `$2b$…` or Argon2id PHC string                     |
| `cipher`       | `generateKey`, `encrypt`, `decrypt`, `decryptBytes`                           | `v1.<alg>.<kdf>.<salt>.<nonce>.<ciphertext>` (base64url)  |
| `rsa`          | `generateKeyPair`, `encrypt`, `decrypt`, `decryptBytes`                       | PEM keys (SPKI / PKCS#8); JWE `RSA-OAEP-*` + `A256GCM`    |
| `signature`    | `sign`, `verify`                                                              | detached JWS with unencoded payload (RFC 7797), RSA-PSS   |
| `hash`         | `digest`, `hmac`                                                              | hex                                                       |
| `token`        | `generateKey`, `encrypt`, `decrypt`                                           | PASETO `v4.local` (JWE `dir` + `A256GCM` at `cnsa`)       |
| `jwt`          | `sign`, `verify`, `decode`                                                    | JWT HS256/384/512 with a secret, RS256/384/512 with a PEM |
| `CryptoEngine` | `encode`, `decode`                                                            | legacy reversible obfuscation (see below)                 |
| `workers`      | `configure({ size, mode, timeout, idleTimeout })`, `terminate()`, `runtime()` | worker pool control                                       |

`securityLevels()` returns what every level uses. Errors are `CryptoError` with a `code`:
`INVALID_KEY`, `INVALID_INPUT`, `TAMPERED`, `EXPIRED`, `MALFORMED`, `UNSUPPORTED`, `WORKER` or
`TIMEOUT`. A `jwt` or `token` payload that `JSON.stringify` cannot serialize (a `BigInt`, a cycle)
rejects with `INVALID_INPUT`.

Keys: RSA keys must have at least 2048 bits, also to verify (`signature.verify`, `jwt.verify`), and
`signature.sign` / `jwt.sign` check the size of the level they get. `jwt` secrets need 16 characters
to sign and to verify.

Data size: `cipher.encrypt`, `rsa.encrypt` and `signature` take the whole input in memory: it is
copied to the worker, then into the wasm memory (at most 4 GiB, shared with the output), and
encrypted outputs are base64url strings, about 4/3 of the input. JavaScript engines cap the length of
a string (V8: about 512 Mi characters), so keep each input well below 380 MiB and split larger files
into parts.

## Security levels

`'basic' | 'standard' | 'strong' | 'cnsa'`, with `'military'` as an alias of `'cnsa'`. The default is
`standard`. Outputs record their algorithm, so decrypting or verifying never needs the level.

| Tool               | `basic`         | `standard`                | `strong`                  | `cnsa` / `military`                |
| ------------------ | --------------- | ------------------------- | ------------------------- | ---------------------------------- |
| `cipher`           | AES-128-GCM     | AES-256-GCM               | XChaCha20-Poly1305        | AES-256-GCM, HKDF-SHA384, key ≥ 32 |
| `token`            | PASETO v4.local | PASETO v4.local           | PASETO v4.local           | JWE `dir` + `A256GCM`              |
| `hash`             | SHA-256         | SHA-256                   | SHA-384                   | SHA-512                            |
| `password`         | bcrypt cost 10  | Argon2id t=3, 64 MiB, p=4 | Argon2id t=3, 64 MiB, p=4 | Argon2id t=4, 256 MiB, p=4         |
| `rsa`, `signature` | 2048, SHA-256   | 3072, SHA-256             | 4096, SHA-384             | 4096, SHA-512                      |
| `jwt`              | HS256 / RS256   | HS256 / RS256             | HS384 / RS384             | HS512 / RS512                      |

These values are this package's choice and **must be reviewed against the sources before relying on
them** for a compliance claim:

- `cnsa` follows the algorithm families of the NSA Commercial National Security Algorithm Suite (CNSA
  1.0: AES-256, SHA-384 or stronger, RSA ≥ 3072). CNSA does not cover password hashing, PASETO or
  XChaCha20; `military` is a name, not a certification.
- `standard` and `strong` Argon2id use the second recommended option of RFC 9106 (t=3, 64 MiB, 4
  lanes); for passwords both levels are the same.
- bcrypt costs follow common practice; check the OWASP Password Storage Cheat Sheet.

## Password length

`password.hash` accepts up to **64 characters**, counted as a person sees them (grapheme clusters): `ñ`,
`密` and `🔒` count 1 each, also when `ñ` arrives decomposed as `n` + `◌̃` (JavaScript's `.length` would
count `🔒` as 2). Longer passwords reject with `INVALID_INPUT`.

bcrypt only reads the first 72 **bytes** of UTF-8: 72 ASCII characters, but 36 with accents, 24 in
Chinese or 18 emoji. Instead of truncating in silence, `hash` with bcrypt (`level: 'basic'` or
`algorithm: 'bcrypt'`) rejects a password over 72 bytes with `INVALID_INPUT`; Argon2id, the default, has
no such limit. `cost` only applies to bcrypt, so it needs `algorithm: 'bcrypt'` or `level: 'basic'`,
and goes from 4 to 14.

`password.verify` never truncates either: a password over 72 bytes does not verify against a bcrypt
hash, also one made by 3.x or another library that truncated it (those users need a password reset).
It also refuses (returns `false`) any hash that asks for more work than the `cnsa` level: bcrypt cost
over 14, or Argon2 over 256 MiB, t=4 or p=4. A hash read from somewhere an attacker can write could
otherwise ask for gigabytes of memory or days of CPU. `password.isHash` only checks the format, so it
is still `true` for those hashes.

## Keys and passwords in `cipher` and `token`

`cipher` (by default) and `token` (always) derive their key with HKDF, which is fast and assumes the
key is already random: use `cipher.generateKey()` / `token.generateKey()` (32 random bytes) or another
secret of at least 16 characters (32 at `cnsa`) that nobody chose by hand. HKDF does not slow down
guessing, so with a password people type anyone holding an output could find it offline. `token` has
no password mode: keep its key random.

For a password people type, pass `{ password: true }`: the key is derived with Argon2id and a random
salt (the parameters of the password table: 64 MiB, t=3, p=4; 256 MiB, t=4 at `cnsa`), which is slow on
purpose. The password must have 8 to 64 characters (counted as in `password.hash`). The output records
the derivation (`v1.<alg>.argon2id-m65536-t3-p4.…`), so `decrypt` needs no option; it only accepts the
Argon2 parameters this package produces, so crafted data cannot ask for huge memory.

## Expiration of `jwt` and `token`

`jwt.sign` needs an expiration: `expiresIn`, an `exp` claim in the payload, or an explicit
`requireExpiration: false` for a token that never expires. `jwt.verify` rejects a token without `exp`
(`MALFORMED`, `verify Error: jwt has no exp claim`) unless it gets `requireExpiration: false` or
`ignoreExpiration: true`. `clockTolerance` must be 0 or a positive number of seconds.

`token` follows the same rule: `token.encrypt` rejects (`INVALID_INPUT`) a payload without `expiresIn`
or an `exp` claim unless it gets `requireExpiration: false`, and `token.decrypt(data, key)` rejects a
token without `exp` (`MALFORMED`) unless it gets `{ requireExpiration: false }`.

## Workers and the main thread

Calls go to a lazy pool of up to `min(4, cores − 1)` workers: Web Workers built from a Blob URL in
browsers, `worker_threads` in Node. Workers do not keep a Node process alive when idle. Where no worker
exists, or the page blocks them, the calls run on the calling thread (with one warning);
`workers.configure({ mode: 'worker' })` fails instead, `mode: 'inline'` forces the calling thread.
`workers.configure()` and `workers.terminate()` close the current workers: the calls still running
reject with `WORKER`, so configure the pool before using it.

- **Timeout.** A worker that answers nothing for `timeout` ms (default `60000`; `Infinity` turns it
  off) is replaced: the call it was running rejects with `TIMEOUT` and the calls queued behind it move
  to another worker. The calling thread cannot be interrupted, so the inline mode has no timeout.
  Generating a 4096-bit RSA key can take several seconds, and longer on slow phones: raise `timeout`
  if the app generates keys there.
- **Crashes.** A call that traps the wasm (a Rust panic, memory exhausted) rejects with `WORKER` and its
  worker is replaced, so the next calls never run on a broken instance. A worker whose wasm cannot
  start (for example, the browser cannot reserve its memory) rejects its calls with `WORKER` and is
  dropped; the next call starts a new one.
- **Fallback.** Only a Web Worker that fails before its script runs (the page blocks `blob:` workers)
  moves the pool to the calling thread. A worker that started and then fails (out of memory in an
  Argon2 hash, for example) rejects its calls with `WORKER` and the pool keeps using workers.
- **Bytes.** A `Uint8Array` is copied to the worker. A view over a larger buffer (a `subarray`, or a
  small Node `Buffer` from the shared pool) and bytes in a `SharedArrayBuffer` are copied first, so the
  worker only receives the bytes of the view.
- **Secrets in memory.** Derived keys, AES and RSA content keys and the AES key schedules are wiped
  (`zeroize`) when the call ends. Keys and passwords arrive as JavaScript strings, which nobody can
  wipe, and the copy the wasm glue makes of them is freed but not wiped; closing an idle worker gives
  its whole memory back.
- **Memory.** wasm memory only grows: an Argon2id hash keeps 64 MiB (256 MiB at `cnsa`) in its worker,
  up to that times the pool size. A worker idle for `idleTimeout` ms (default `30000`; `Infinity`
  keeps them) is closed to give that memory back; the next call starts a new one, which only
  instantiates the already compiled module.

Content Security Policy: the page needs `script-src 'wasm-unsafe-eval'` (the wasm is compiled from the
package) and `worker-src blob:` for the workers, for example
`default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src blob:`. Without `blob:` the
calls fall back to the calling thread, which also needs `'unsafe-eval'` because it evaluates the
embedded wasm-bindgen glue; with neither, every call rejects with `WORKER`. `npm run check:dist` runs
these cases in Chromium, Firefox and WebKit.

Size: the wasm (about 1.4 MiB) ships gzipped and as base64 inside the JavaScript, about 720 KiB per
build (ESM or CJS; an app loads one, about 515 KiB once the server gzips it). The package holds both
builds, about 1.8 MB unpacked. It is decompressed once with the standard `DecompressionStream`
(Node 18+ and current browsers; check its support if you target old Safari or Firefox).

## Compatibility with the previous version

The 3.x API (classes such as `BcryptPasswordEncryptor`, `SodiumHasher`, `JWTDataSigner`) is gone.
Data it produced still works:

- `password.verify` accepts bcrypt and libsodium Argon2id hashes up to the `cnsa` cost (see Password
  length); bcrypt passwords over 72 bytes no longer verify.
- `cipher.decrypt(data, key, { algorithm: 'aes-256-cbc-hmac' })` (also 128 and 192) reads the
  `iv|ciphertext|hmac` format of `SymmetricEncryption`. That format can only be decrypted: encrypting
  with it rejects with `UNSUPPORTED`, so migrate the data to an AEAD algorithm.
- `jwt.verify` accepts tokens signed by `jsonwebtoken` with the same secret if it has at least 16
  characters; tokens without `exp` need `{ requireExpiration: false }`.
- `CryptoEngine` produces byte for byte the same outputs. It is a reversible **obfuscation**, not
  encryption: use `cipher` for anything secret.

## Known risk

The `rsa` crate has advisory RUSTSEC-2023-0071 (Marvin attack): its arithmetic is not constant-time,
so the timing of **every operation with the private key** can leak information about it. Here that is
`rsa.decrypt` / `rsa.decryptBytes`, `signature.sign` and `jwt.sign` with an RSA PEM key; verifying and
encrypting only use the public key and are not affected. No `rsa` release fixes it yet (0.10 release
candidates included).

Mitigation in this package: every private-key operation uses RSA blinding with a fresh random value
(`decrypt_blinded`, `BlindedSigningKey`; `jsonwebtoken` blinds its RS\* signatures), which hides the
relation between the input and the timing but does not make the code constant-time. The advisory's
own guidance stands: avoid these operations where an attacker can measure their timing, for example a
server that decrypts or signs data from the network on request. Local use, or signing your own data, is
fine. `npm run check:audit` (also in CI, weekly) lists it as accepted in `rust/.cargo/audit.toml`;
remove it from there when a fixed release exists. Details: https://rustsec.org/advisories/RUSTSEC-2023-0071.

## Building from source

Needs Rust (the version in `rust/rust-toolchain.toml`, installed by rustup) and `wasm-pack`.
`npm run build` compiles the crate, embeds the wasm and builds ESM + CJS; `npm run check:rust` runs
rustfmt, clippy and the Rust tests; `npm run check:audit` runs `cargo audit` (needs `cargo-audit`).
`check:dist` runs the build in real browsers with Playwright (`npx playwright install` once). The PASETO test vectors in `test/fixtures/paseto-v4.json` come from
the `pasetors` crate.

## License

MIT
