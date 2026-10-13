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

const { publicKey, privateKey } = await rsa.generateKeyPair({ level: 'standard' });
const sealed = await rsa.encrypt(fileBytes, publicKey); // any size: RSA wraps an AES key
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

| Module         | Functions                                               | Output                                                    |
| -------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| `password`     | `hash`, `verify`, `isHash`, `params`                    | bcrypt `$2b$…` or Argon2id PHC string                     |
| `cipher`       | `generateKey`, `encrypt`, `decrypt`, `decryptBytes`     | `v1.<alg>.<kdf>.<salt>.<nonce>.<ciphertext>` (base64url)  |
| `rsa`          | `generateKeyPair`, `encrypt`, `decrypt`, `decryptBytes` | PEM keys (SPKI / PKCS#8); JWE `RSA-OAEP-*` + `A256GCM`    |
| `signature`    | `sign`, `verify`                                        | detached JWS with unencoded payload (RFC 7797), RSA-PSS   |
| `hash`         | `digest`, `hmac`                                        | hex                                                       |
| `token`        | `generateKey`, `encrypt`, `decrypt`                     | PASETO `v4.local` (JWE `dir` + `A256GCM` at `cnsa`)       |
| `jwt`          | `sign`, `verify`, `decode`                              | JWT HS256/384/512 with a secret, RS256/384/512 with a PEM |
| `CryptoEngine` | `encode`, `decode`                                      | legacy reversible obfuscation (see below)                 |
| `workers`      | `configure({ size, mode })`, `terminate()`, `runtime()` | worker pool control                                       |

`securityLevels()` returns what every level uses. Errors are `CryptoError` with a `code`:
`INVALID_KEY`, `INVALID_INPUT`, `TAMPERED`, `EXPIRED`, `MALFORMED`, `UNSUPPORTED` or `WORKER`.

## Security levels

`'basic' | 'standard' | 'strong' | 'cnsa'`, with `'military'` as an alias of `'cnsa'`. The default is
`standard`. Outputs record their algorithm, so decrypting or verifying never needs the level.

| Tool               | `basic`         | `standard`      | `strong`                  | `cnsa` / `military`                |
| ------------------ | --------------- | --------------- | ------------------------- | ---------------------------------- |
| `cipher`           | AES-128-GCM     | AES-256-GCM     | XChaCha20-Poly1305        | AES-256-GCM, HKDF-SHA384, key ≥ 32 |
| `token`            | PASETO v4.local | PASETO v4.local | PASETO v4.local           | JWE `dir` + `A256GCM`              |
| `hash`             | SHA-256         | SHA-256         | SHA-384                   | SHA-512                            |
| `password`         | bcrypt cost 10  | bcrypt cost 12  | Argon2id t=3, 64 MiB, p=4 | Argon2id t=4, 256 MiB, p=4         |
| `rsa`, `signature` | 2048, SHA-256   | 3072, SHA-256   | 4096, SHA-384             | 4096, SHA-512                      |
| `jwt`              | HS256 / RS256   | HS256 / RS256   | HS384 / RS384             | HS512 / RS512                      |

These values are this package's choice and **must be reviewed against the sources before relying on
them** for a compliance claim:

- `cnsa` follows the algorithm families of the NSA Commercial National Security Algorithm Suite (CNSA
  1.0: AES-256, SHA-384 or stronger, RSA ≥ 3072). CNSA does not cover password hashing, PASETO or
  XChaCha20; `military` is a name, not a certification.
- `strong` Argon2id uses the second recommended option of RFC 9106 (t=3, 64 MiB, 4 lanes).
- bcrypt costs follow common practice; check the OWASP Password Storage Cheat Sheet.

## Workers and the main thread

Calls go to a lazy pool of up to `min(4, cores − 1)` workers: Web Workers built from a Blob URL in
browsers, `worker_threads` in Node. Workers do not keep a Node process alive when idle. Where no worker
exists the calls run on the calling thread (with one warning); `workers.configure({ mode: 'worker' })`
fails instead, `mode: 'inline'` forces the calling thread.

Browser pages with a Content Security Policy must allow `worker-src blob:`; the inline mode also needs
`'unsafe-eval'` because it evaluates the embedded wasm-bindgen glue.

## Compatibility with the previous version

The 3.x API (classes such as `BcryptPasswordEncryptor`, `SodiumHasher`, `JWTDataSigner`) is gone.
Data it produced still works:

- `password.verify` accepts bcrypt and libsodium Argon2id hashes.
- `cipher.decrypt(data, key, { algorithm: 'aes-256-cbc-hmac' })` (also 128 and 192) reads the
  `iv|ciphertext|hmac` format of `SymmetricEncryption`.
- `jwt.verify` accepts tokens signed by `jsonwebtoken` with the same secret.
- `CryptoEngine` produces byte for byte the same outputs. It is a reversible **obfuscation**, not
  encryption: use `cipher` for anything secret.

## Known risk

The `rsa` crate has advisory RUSTSEC-2023-0071 (Marvin attack, a timing side channel) with no fixed
release yet. It affects RSA decryption (`rsa.decrypt`, which unwraps the AES key); signing, verifying
and encrypting are not affected. Check https://rustsec.org/advisories/RUSTSEC-2023-0071 before
exposing `rsa.decrypt` to attacker-controlled input at scale.

## Building from source

Needs Rust (the version in `rust/rust-toolchain.toml`, installed by rustup) and `wasm-pack`.
`npm run build` compiles the crate, embeds the wasm and builds ESM + CJS; `npm run check:rust` runs
rustfmt, clippy and the Rust tests. The PASETO test vectors in `test/fixtures/paseto-v4.json` come from
the `pasetors` crate.

## License

MIT
