# @archi-code/crypto-tools

Kit criptográfico para **navegadores y Node.js**: hash de contraseñas, cifrado simétrico, RSA, firmas
de ficheros, hashes y HMAC, tokens JSON cifrados y JWT. Toda la lógica está escrita en Rust (crates
conocidos como RustCrypto, `bcrypt`, `argon2`, `rsa`, `pasetors` y `jsonwebtoken`) y compilada en **un
único módulo wasm** que viaja dentro del paquete. Cada llamada se ejecuta en un **worker**, así que no
bloquea el hilo principal. Sin dependencias npm; build dual ESM + CJS con tipos TypeScript.

## Instalación

```bash
npm install @archi-code/crypto-tools
```

Requiere Node.js 24 o superior (campo `engines`) o un navegador actual con `WebAssembly`,
`DecompressionStream` y Web Workers.

## Importación

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

El mismo paquete sirve al navegador (condición `browser` → build ESM) y a Node (`import` → ESM,
`require` → CJS), sin configurar el bundler ni cargar ficheros `.wasm` aparte.

## Conceptos comunes

- **Todo es asíncrono.** Cada función devuelve una `Promise`; usa `await`. Los errores llegan como
  rechazo con un `CryptoError` (ver [Errores](#errores)).
- **Opciones al final.** Casi todas las funciones aceptan `{ level, algorithm }`:
  - `level`: `'basic' | 'standard' | 'strong' | 'cnsa' | 'military'` (`military` es un alias de
    `cnsa`). Por defecto, `standard`. Elige los algoritmos por ti (ver
    [Niveles de seguridad](#niveles-de-seguridad)).
  - `algorithm`: elige un algoritmo concreto. Si pasas `level` y `algorithm` a la vez y no coinciden,
    la llamada se rechaza con `UNSUPPORTED` (`Algorithm argon2id does not match level basic, which uses bcrypt.`).
- **Las salidas registran su algoritmo**, así que descifrar o verificar nunca necesita el nivel.
- **Datos**: donde se esperan datos se acepta texto (`string`, codificado en UTF-8) o `Uint8Array`.
  En el navegador lee un fichero con `new Uint8Array(await file.arrayBuffer())`; en Node, con
  `fs.readFile` (un `Buffer` es un `Uint8Array`). Las claves, contraseñas y tokens son siempre
  `string`.

## `password`: hash de contraseñas

```ts
const stored = await password.hash('correct horse battery staple');
// '$argon2id$v=19$m=65536,t=3,p=4$…' (sal aleatoria: cambia en cada llamada)

await password.verify('correct horse battery staple', stored); // true
await password.verify('otra', stored); // false

await password.isHash(stored); // true
await password.isHash('hola'); // false

await password.hash('secreto', { level: 'basic' }); // '$2b$10$…' (bcrypt)
await password.hash('secreto', { algorithm: 'bcrypt', cost: 12 }); // '$2b$12$…'
await password.hash('secreto', { level: 'cnsa' }); // '$argon2id$v=19$m=262144,t=4,p=4$…'

await password.params(); // { algorithm: 'argon2id', memoryKiB: 65536, iterations: 3, parallelism: 4 }
await password.params({ level: 'basic' }); // { algorithm: 'bcrypt', cost: 10 }
```

| Función                 | Devuelve                  | Descripción                                                                                    |
| ----------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| `hash(plain, options?)` | `Promise<string>`         | Hash PHC Argon2id (`$argon2id$v=19$…`) o bcrypt (`$2b$…`).                                     |
| `verify(plain, hash)`   | `Promise<boolean>`        | `true` si la contraseña corresponde al hash. Un hash no reconocido o demasiado caro → `false`. |
| `isHash(value)`         | `Promise<boolean>`        | Solo comprueba el formato (`$2b$` o `$argon2id$v=19$`).                                        |
| `params(options?)`      | `Promise<PasswordParams>` | Parámetros que usaría `hash` con esas opciones, sin calcular nada.                             |

Opciones (`PasswordOptions`): `level`, `algorithm` (`'bcrypt' | 'argon2id'`) y `cost` (solo bcrypt,
de 4 a 14; con Argon2id se rechaza con `UNSUPPORTED`).

### Longitud de la contraseña

- `password.hash` acepta como máximo **64 caracteres**, contados como los ve una persona (grapheme
  clusters): `ñ`, `密` y `🔒` cuentan 1 cada uno, también cuando `ñ` llega descompuesta como `n` + `◌̃`
  (el `.length` de JavaScript contaría `🔒` como 2). Una contraseña más larga se rechaza con
  `INVALID_INPUT`.
- bcrypt solo lee los primeros 72 **bytes** de UTF-8: 72 caracteres ASCII, pero 36 con tildes, 24 en
  chino o 18 emojis. En lugar de truncar en silencio, `hash` con bcrypt (`level: 'basic'` o
  `algorithm: 'bcrypt'`) rechaza una contraseña de más de 72 bytes con `INVALID_INPUT`. Argon2id, el
  algoritmo por defecto, no tiene ese límite.

### Qué acepta `verify`

`password.verify` solo acepta los formatos que produce `password.hash`: bcrypt `$2b$` y Argon2id
versión 19 (`$argon2id$v=19$`). Los hashes de otras librerías u otros formatos (`$2a$`, `$2y$`,
Argon2i…) devuelven `false`. Tampoco trunca: una contraseña de más de 72 bytes no verifica contra un
hash bcrypt.

También rechaza (devuelve `false`) cualquier hash que pida más trabajo que el nivel `cnsa`: coste
bcrypt mayor de 14, o Argon2 con más de 256 MiB, t=4 o p=4. Así, un hash leído de un sitio donde un
atacante puede escribir no puede pedir gigas de memoria ni días de CPU. `password.isHash` solo mira el
formato, así que sigue devolviendo `true` para esos hashes.

## `cipher`: cifrado simétrico

```ts
const key = await cipher.generateKey(); // 32 bytes aleatorios en base64url (43 caracteres)

const encrypted = await cipher.encrypt('hola mundo', key);
// 'v1.aes-256-gcm.hkdf-sha256.<sal>.<nonce>.<cifrado>'
await cipher.decrypt(encrypted, key); // 'hola mundo'

const fileBytes = new Uint8Array([1, 2, 3]);
const sealed = await cipher.encrypt(fileBytes, key, { level: 'strong' });
// 'v1.xchacha20-poly1305.hkdf-sha256.…'
await cipher.decryptBytes(sealed, key); // Uint8Array [1, 2, 3]

const cnsaKey = await cipher.generateKey({ level: 'cnsa' });
await cipher.encrypt('hola', cnsaKey, { level: 'cnsa' }); // 'v1.aes-256-gcm.hkdf-sha384.…'
```

| Función                                  | Devuelve              | Descripción                                                                         |
| ---------------------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| `generateKey(options?)`                  | `Promise<string>`     | Clave aleatoria de 32 bytes en base64url.                                           |
| `encrypt(data, key, options?)`           | `Promise<string>`     | `v1.<alg>.<kdf>.<sal>.<nonce>.<cifrado>` (base64url). AEAD: detecta manipulaciones. |
| `decrypt(encrypted, key, options?)`      | `Promise<string>`     | Descifra a texto UTF-8 (`MALFORMED` si no es UTF-8: usa `decryptBytes`).            |
| `decryptBytes(encrypted, key, options?)` | `Promise<Uint8Array>` | Descifra a bytes.                                                                   |

- Algoritmos (`CipherAlgorithm`): `'aes-128-gcm' | 'aes-256-gcm' | 'chacha20-poly1305' | 'xchacha20-poly1305'`.
- `encrypt` acepta `{ level, algorithm, password }`; `decrypt` y `decryptBytes` aceptan
  `{ algorithm }` para exigir un algoritmo concreto (si el dato se cifró con otro → `UNSUPPORTED`).
- Una clave equivocada o un dato manipulado se rechazan con `TAMPERED`; un texto que no tiene el
  formato, con `MALFORMED`.

### Claves aleatorias frente a contraseñas

Por defecto la clave se deriva con HKDF, que es rápido y presupone que la clave ya es aleatoria: usa
`cipher.generateKey()` u otro secreto de al menos **16 caracteres** (**32** con `level: 'cnsa'`, que
deriva con HKDF-SHA384) que nadie haya elegido a mano. Una clave más corta se rechaza con `INVALID_KEY`.
HKDF no frena los intentos de adivinarla, así que con una contraseña que teclea una persona cualquiera
que tenga una salida podría encontrarla offline.

Para una contraseña que teclea una persona, pasa `{ password: true }`: la clave se deriva con Argon2id
y una sal aleatoria (64 MiB, t=3, p=4; 256 MiB, t=4 con `cnsa`), lento a propósito. La contraseña debe
tener **de 8 a 64 caracteres** (contados como en `password.hash`; si no, `INVALID_KEY`).

```ts
const locked = await cipher.encrypt('nota privada', 'mi contraseña larga', { password: true });
// 'v1.aes-256-gcm.argon2id-m65536-t3-p4.…'
await cipher.decrypt(locked, 'mi contraseña larga'); // 'nota privada' (no necesita opciones)
```

La salida registra la derivación, así que `decrypt` no necesita opciones; solo acepta los parámetros
Argon2 que produce este paquete, de modo que un dato manipulado no puede pedir memoria enorme.

## `rsa`: cifrado asimétrico

```ts
const { publicKey, privateKey } = await rsa.generateKeyPair({ level: 'standard' });
// publicKey: '-----BEGIN PUBLIC KEY-----…' (SPKI)   privateKey: '-----BEGIN PRIVATE KEY-----…' (PKCS#8)

const sealed = await rsa.encrypt('mensaje secreto', publicKey);
// JWE compacto con cabecera {"alg":"RSA-OAEP-256","enc":"A256GCM"}
await rsa.decrypt(sealed, privateKey); // 'mensaje secreto'

const fileBytes = new Uint8Array([9, 8, 7]);
const sealedFile = await rsa.encrypt(fileBytes, publicKey);
await rsa.decryptBytes(sealedFile, privateKey); // Uint8Array [9, 8, 7]
```

| Función                               | Devuelve              | Descripción                                                   |
| ------------------------------------- | --------------------- | ------------------------------------------------------------- |
| `generateKeyPair(options?)`           | `Promise<RsaKeyPair>` | `{ publicKey, privateKey }` en PEM (SPKI / PKCS#8).           |
| `encrypt(data, publicKey, options?)`  | `Promise<string>`     | JWE `RSA-OAEP-*` + `A256GCM`: RSA envuelve una clave AES-256. |
| `decrypt(encrypted, privateKey)`      | `Promise<string>`     | Descifra a texto UTF-8.                                       |
| `decryptBytes(encrypted, privateKey)` | `Promise<Uint8Array>` | Descifra a bytes.                                             |

- `generateKeyPair` acepta `{ level, bits }` con `bits` en `2048 | 3072 | 4096`. Otro tamaño, o uno
  menor que el del nivel (`{ level: 'strong', bits: 2048 }`), se rechaza con `UNSUPPORTED`.
- `encrypt` acepta `{ level, algorithm }` con `algorithm` en `'RSA-OAEP-256' | 'RSA-OAEP-384' | 'RSA-OAEP-512'`.
  Una clave más pequeña que la del nivel pedido se rechaza con `INVALID_KEY` (`RSA key of 2048 bits is below the 3072 bits required by level standard.`).
- Solo se admiten claves PEM SPKI (pública) y PKCS#8 (privada) de al menos 2048 bits. Otro formato →
  `INVALID_KEY`.
- Generar una clave de 4096 bits puede tardar varios segundos, más en móviles lentos.

## `signature`: firmas de ficheros

```ts
const { publicKey, privateKey } = await rsa.generateKeyPair();
const fileBytes = new TextEncoder().encode('contenido del fichero');

const signed = await signature.sign(fileBytes, privateKey);
// '<cabecera>..<firma>': cabecera {"alg":"PS256","b64":false,"crit":["b64"]} y payload vacío
await signature.verify(fileBytes, signed, publicKey); // true
await signature.verify('otro contenido', signed, publicKey); // false
```

| Función                            | Devuelve           | Descripción                                                 |
| ---------------------------------- | ------------------ | ----------------------------------------------------------- |
| `sign(data, privateKey, options?)` | `Promise<string>`  | JWS separado con payload sin codificar (RFC 7797), RSA-PSS. |
| `verify(data, signed, publicKey)`  | `Promise<boolean>` | `true` si la firma corresponde a los datos y a la clave.    |

- Algoritmos (`SignatureAlgorithm`): `'PS256' | 'PS384' | 'PS512'`. La firma no incluye los datos:
  guárdala junto al fichero y pásale los mismos bytes a `verify`.
- `sign` comprueba el tamaño de clave del nivel que recibe (`INVALID_KEY` si es menor); `verify` exige
  al menos 2048 bits.

## `hash`: resúmenes y HMAC

```ts
await hash.digest('hola');
// 'b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79' (SHA-256, hex)
await hash.digest(new Uint8Array([104, 111, 108, 97]), { level: 'cnsa' }); // SHA-512, 128 caracteres hex
await hash.digest('hola', { algorithm: 'blake2b' });
// '4ee0cdb64e70bb9da93113f8ddcb3e2fd23bef1cda2c6d45afec7ef959ac6298' (BLAKE2b de 32 bytes)

await hash.hmac('hola', 'clave');
// '67c0066d5104af2bd88decc45269ddb529a0097b8da4cfbbe58ec2a5f63ca50d' (HMAC-SHA256)
await hash.hmac('hola', 'clave', { level: 'strong' }); // HMAC-SHA384, 96 caracteres hex
```

| Función                     | Devuelve          | Descripción  |
| --------------------------- | ----------------- | ------------ |
| `digest(data, options?)`    | `Promise<string>` | Hash en hex. |
| `hmac(data, key, options?)` | `Promise<string>` | HMAC en hex. |

- `digest`: `algorithm` en `'sha256' | 'sha384' | 'sha512' | 'blake2b'`.
- `hmac`: `algorithm` en `'sha256' | 'sha384' | 'sha512'` (`blake2b` → `UNSUPPORTED`). La clave no puede
  estar vacía (`INVALID_KEY`).

## `token`: tokens JSON cifrados

Tokens opacos: el contenido va cifrado y autenticado, nadie sin la clave puede leerlo ni modificarlo.

```ts
const tokenKey = await token.generateKey(); // 32 bytes aleatorios en base64url

const opaque = await token.encrypt({ userId: 7 }, tokenKey, { expiresIn: 3600 });
// 'v4.local.…' (PASETO v4.local)
await token.decrypt(opaque, tokenKey);
// { exp: '2026-10-13T12:52:01Z', iat: '2026-10-13T11:52:01Z', userId: 7 } (fechas de una ejecución real)
```

| Función                                | Devuelve          | Descripción                                                    |
| -------------------------------------- | ----------------- | -------------------------------------------------------------- |
| `generateKey()`                        | `Promise<string>` | Clave aleatoria de 32 bytes en base64url.                      |
| `encrypt(payload, key, options?)`      | `Promise<string>` | PASETO `v4.local` (JWE `dir` + `A256GCM` con `level: 'cnsa'`). |
| `decrypt<P>(encrypted, key, options?)` | `Promise<P>`      | Descifra y comprueba `exp` y `nbf`. Detecta el formato solo.   |

- `encrypt` acepta `{ level, algorithm, expiresIn, requireExpiration }`; `algorithm` en
  `'paseto-v4-local' | 'jwe-dir-a256gcm'`; `expiresIn` en segundos.
- `iat` y `exp` se guardan como fechas RFC 3339 (texto), no como números. Si el payload ya trae `iat`
  se respeta.
- La clave se deriva con HKDF: usa `token.generateKey()` u otro secreto aleatorio de al menos 16
  caracteres (32 con `cnsa`). `token` no tiene modo contraseña.
- El payload debe ser un objeto plano serializable con `JSON.stringify` (un `BigInt` o un ciclo →
  `INVALID_INPUT`).

### Caducidad obligatoria

`token.encrypt` rechaza (`INVALID_INPUT`) un payload sin `expiresIn` ni claim `exp`, salvo que reciba
`requireExpiration: false`. `token.decrypt(data, key)` rechaza un token sin `exp` (`MALFORMED`) salvo
que reciba `{ requireExpiration: false }`, y uno caducado o aún no activo (`EXPIRED`).

```ts
const tokenKey = await token.generateKey();
const forever = await token.encrypt({ userId: 7 }, tokenKey, { requireExpiration: false });
await token.decrypt(forever, tokenKey); // rechaza con CryptoError MALFORMED (no tiene exp)
await token.decrypt(forever, tokenKey, { requireExpiration: false });
// { iat: '2026-10-13T11:52:01Z', userId: 7 }
```

## `jwt`: JSON Web Tokens

```ts
const secret = 'un-secreto-de-al-menos-16';

const signed = await jwt.sign({ userId: 7, role: 'admin' }, secret, {
  expiresIn: 3600,
  issuer: 'mi-app',
  audience: 'api',
});
await jwt.verify(signed, secret, { issuer: 'mi-app', audience: 'api' });
// { aud: 'api', exp: 1791895921, iat: 1791892321, iss: 'mi-app', role: 'admin', userId: 7 }
// (marcas de tiempo de una ejecución real)

await jwt.decode(signed); // el mismo payload, leído SIN verificar la firma

const { publicKey, privateKey } = await rsa.generateKeyPair();
const rs = await jwt.sign({ sub: 'u1' }, privateKey, { expiresIn: 600 }); // cabecera {"typ":"JWT","alg":"RS256"}
await jwt.verify(rs, publicKey); // { exp: …, iat: …, sub: 'u1' }
```

| Función                            | Devuelve          | Descripción                                                                   |
| ---------------------------------- | ----------------- | ----------------------------------------------------------------------------- |
| `sign(payload, key, options?)`     | `Promise<string>` | Firma con un secreto (HS256/384/512) o una clave privada PEM (RS256/384/512). |
| `verify<P>(signed, key, options?)` | `Promise<P>`      | Verifica firma, `exp`, `nbf`, `iss` y `aud`; devuelve el payload.             |
| `decode<P>(signed)`                | `Promise<P>`      | Decodifica el payload **sin verificar**. No lo uses para autorizar.           |

- El tipo de clave decide la familia: un texto que empieza por `-----BEGIN` es PEM (RS\*); cualquier
  otro es un secreto (HS\*). Pedir `algorithm: 'HS256'` con un PEM (o RS\* con un secreto) →
  `INVALID_KEY`.
- Opciones de `sign` (`JwtSignOptions`): `level`, `algorithm` (`'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512'`),
  `expiresIn` (segundos), `issuer`, `subject`, `audience` (`string | string[]`) y `requireExpiration`.
  Una opción desconocida se rechaza con `INVALID_INPUT`.
- Opciones de `verify` (`JwtVerifyOptions`): `algorithms` (lista permitida; por defecto, la familia de la
  clave), `issuer`, `audience`, `clockTolerance` (segundos, 0 o positivo) y `requireExpiration`.
- `iat` y `exp` son segundos Unix (números). Si el payload ya trae `iat` se respeta.
- Los secretos necesitan **al menos 16 caracteres**, para firmar y para verificar (`INVALID_KEY`). Las
  claves RSA necesitan al menos 2048 bits, también para verificar; `sign` comprueba además el tamaño del
  nivel que recibe.
- Firma inválida o clave equivocada → `TAMPERED`; `iss` o `aud` distintos → `TAMPERED`; caducado o aún
  no activo → `EXPIRED`; algoritmo no permitido → `UNSUPPORTED`; texto que no es un JWT → `MALFORMED`.

### Caducidad obligatoria

`jwt.sign` necesita una caducidad: `expiresIn`, un claim `exp` en el payload, o `requireExpiration: false`
explícito para un token que no caduca (si no, `INVALID_INPUT`). `jwt.verify` rechaza un token sin `exp`
(`MALFORMED`) salvo que reciba `requireExpiration: false`, y uno caducado (`EXPIRED`).

```ts
const secret = 'un-secreto-de-al-menos-16';
await jwt.sign({ a: 1 }, secret); // rechaza con CryptoError INVALID_INPUT (sin caducidad)
const forever = await jwt.sign({ a: 1 }, secret, { requireExpiration: false });
await jwt.verify(forever, secret); // rechaza con CryptoError MALFORMED (no tiene exp)
await jwt.verify(forever, secret, { requireExpiration: false }); // { a: 1, iat: … }
```

## Niveles de seguridad

`securityLevels()` devuelve lo que usa cada nivel (`SecurityLevels`, sin el alias `military`):

```ts
import { securityLevels, SECURITY_LEVEL_NAMES } from '@archi-code/crypto-tools';

SECURITY_LEVEL_NAMES; // ['basic', 'standard', 'strong', 'cnsa', 'military']
(await securityLevels()).basic;
// { cipher: 'aes-128-gcm', hash: 'sha256', jwt: { pem: 'RS256', secret: 'HS256' },
//   password: { algorithm: 'bcrypt', cost: 10 },
//   rsa: { bits: 2048, encryption: 'RSA-OAEP-256', signature: 'PS256' },
//   token: 'paseto-v4-local' }
```

| Herramienta | `basic`         | `standard` (por defecto)  | `strong`                  | `cnsa` / `military`                  |
| ----------- | --------------- | ------------------------- | ------------------------- | ------------------------------------ |
| `cipher`    | AES-128-GCM     | AES-256-GCM               | XChaCha20-Poly1305        | AES-256-GCM, HKDF-SHA384, clave ≥ 32 |
| `token`     | PASETO v4.local | PASETO v4.local           | PASETO v4.local           | JWE `dir` + `A256GCM`                |
| `hash`      | SHA-256         | SHA-256                   | SHA-384                   | SHA-512                              |
| `password`  | bcrypt coste 10 | Argon2id t=3, 64 MiB, p=4 | Argon2id t=3, 64 MiB, p=4 | Argon2id t=4, 256 MiB, p=4           |
| `rsa`       | 2048, OAEP-256  | 3072, OAEP-256            | 4096, OAEP-384            | 4096, OAEP-512                       |
| `signature` | PS256 (2048)    | PS256 (3072)              | PS384 (4096)              | PS512 (4096)                         |
| `jwt`       | HS256 / RS256   | HS256 / RS256             | HS384 / RS384             | HS512 / RS512                        |

Algoritmos fuera de los niveles disponibles con `algorithm`: `chacha20-poly1305` en `cipher` y
`blake2b` en `hash.digest`.

Estos valores son una elección de este paquete y **deben revisarse contra las fuentes antes de usarlos**
para afirmar el cumplimiento de una norma:

- `cnsa` sigue las familias de algoritmos de la NSA Commercial National Security Algorithm Suite (CNSA
  1.0: AES-256, SHA-384 o superior, RSA ≥ 3072). CNSA no cubre el hash de contraseñas, PASETO ni
  XChaCha20; `military` es un nombre, no una certificación.
- Argon2id en `standard` y `strong` usa la segunda opción recomendada de la RFC 9106 (t=3, 64 MiB, 4
  carriles); para contraseñas ambos niveles son iguales.
- Los costes de bcrypt siguen la práctica habitual; consulta el OWASP Password Storage Cheat Sheet.

## Errores

Toda función rechaza con un `CryptoError` (subclase de `Error`, `name === 'CryptoError'`) que lleva un
`code` estable. `CRYPTO_ERROR_CODES` contiene la lista completa. Los mensajes están en inglés y pueden
cambiar: decide por el `code`, no por el texto.

| `code`          | Cuándo                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_KEY`   | Clave o secreto inválido: demasiado corto, PEM que no es SPKI/PKCS#8, RSA menor que el nivel, HMAC vacío.                                         |
| `INVALID_INPUT` | Entrada inválida: tipo erróneo, contraseña > 64 caracteres o > 72 bytes con bcrypt, payload no serializable, falta caducidad, opciones inválidas. |
| `TAMPERED`      | Dato o firma manipulados, clave equivocada, `iss`/`aud` de un JWT distintos.                                                                      |
| `EXPIRED`       | Token o JWT caducado o aún no activo (`nbf`).                                                                                                     |
| `MALFORMED`     | El texto no tiene el formato esperado, falta `exp` al verificar, o el descifrado no es UTF-8.                                                     |
| `UNSUPPORTED`   | Nivel o algoritmo desconocido, `level` y `algorithm` que no coinciden, tamaño RSA no admitido, algoritmo JWT no permitido.                        |
| `WORKER`        | El worker falló (trap del wasm, memoria agotada), no pudo arrancar, o el pool se cerró con la llamada en curso.                                   |
| `TIMEOUT`       | El worker no respondió dentro de `timeout` ms.                                                                                                    |

```ts
import { CryptoError, jwt } from '@archi-code/crypto-tools';

const secret = 'un-secreto-de-al-menos-16';
const signedJwt = await jwt.sign({ exp: 1 }, secret); // exp en 1970: ya caducado

try {
  const claims = await jwt.verify(signedJwt, secret);
} catch (error) {
  if (error instanceof CryptoError) {
    switch (error.code) {
      case 'EXPIRED':
        console.log('caducado'); // se imprime esto
        break;
      case 'TAMPERED':
      case 'MALFORMED':
        console.log('token no válido');
        break;
      default:
        throw error;
    }
  }
}
```

`password.verify` y `signature.verify` devuelven `false` cuando la contraseña o la firma no
corresponden; solo rechazan por entradas inválidas (por ejemplo, un argumento que no es `string`).

## Workers y entornos

Las llamadas van a un pool perezoso de hasta `min(4, núcleos − 1)` workers (al menos 1): Web Workers
creados desde una Blob URL en navegadores y `worker_threads` en Node. Los workers no mantienen vivo un
proceso Node cuando están inactivos, así que un script termina solo sin cerrar el pool.

```ts
import { workers } from '@archi-code/crypto-tools';

workers.runtime(); // 'worker-threads' en Node; 'web-worker' en el navegador
workers.configure({ size: 2, timeout: 120_000, idleTimeout: 10_000 });
workers.terminate(); // cierra los workers (p. ej. al final de los tests)
```

| Función              | Descripción                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `configure(options)` | Cambia la configuración y cierra los workers actuales. Es síncrona y lanza `CryptoError` (`INVALID_INPUT`) si una opción no es válida. |
| `terminate()`        | Cierra los workers; las llamadas en curso rechazan con `WORKER`. La siguiente llamada crea workers nuevos.                             |
| `runtime()`          | Dónde se ejecutarán las llamadas: `'web-worker'`, `'worker-threads'` o `'inline'`.                                                     |

Opciones (`WorkersOptions`):

| Opción        | Valor por defecto     | Descripción                                                                                                                                  |
| ------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `size`        | `min(4, núcleos − 1)` | Número máximo de workers (entero ≥ 1).                                                                                                       |
| `mode`        | `'auto'`              | `'auto'`: workers si existen, si no el hilo actual. `'worker'`: falla con `WORKER` si no hay workers. `'inline'`: siempre en el hilo actual. |
| `timeout`     | `60000` ms            | Un worker que no responde en ese tiempo se reemplaza y la llamada rechaza con `TIMEOUT`. `Infinity` lo desactiva.                            |
| `idleTimeout` | `30000` ms            | Un worker inactivo ese tiempo se cierra para devolver su memoria. `Infinity` los mantiene.                                                   |

`configure()` y `terminate()` cierran los workers actuales y las llamadas en curso rechazan con
`WORKER`: configura el pool antes de usarlo.

- **Timeout.** Las llamadas que esperaban detrás de la que agotó el tiempo pasan a otro worker. El hilo
  actual no se puede interrumpir, así que el modo inline no tiene timeout. Generar una clave RSA de
  4096 bits puede tardar varios segundos, más en móviles lentos: sube `timeout` si la app genera claves
  allí.
- **Fallos.** Una llamada que provoca un trap del wasm (un panic de Rust, memoria agotada) rechaza con
  `WORKER` y su worker se reemplaza, así que las siguientes llamadas nunca corren sobre una instancia
  rota. Un worker cuyo wasm no puede arrancar rechaza sus llamadas con `WORKER` y se descarta; la
  siguiente llamada crea uno nuevo.
- **Respaldo en el hilo actual.** Donde no existen workers, o la página bloquea los Web Workers `blob:`
  antes de que arranquen, las llamadas se ejecutan en el hilo actual (con un único aviso en consola).
  Un worker que arrancó y luego falla (por ejemplo, sin memoria en un hash Argon2) rechaza sus llamadas
  con `WORKER` y el pool sigue usando workers.
- **Bytes.** Un `Uint8Array` se copia al worker. Una vista sobre un buffer mayor (un `subarray`, o un
  `Buffer` pequeño de Node del pool compartido) y los bytes de un `SharedArrayBuffer` se copian antes,
  así que el worker solo recibe los bytes de la vista.
- **Memoria.** La memoria wasm solo crece: un hash Argon2id deja 64 MiB (256 MiB con `cnsa`) en su
  worker, hasta eso multiplicado por el tamaño del pool. `idleTimeout` cierra los workers inactivos
  para devolverla; la siguiente llamada arranca uno nuevo, que solo instancia el módulo ya compilado.
- **Secretos en memoria.** Las claves derivadas, las claves de contenido AES y RSA y los key schedules
  de AES se borran (`zeroize`) al terminar la llamada. Las claves y contraseñas llegan como strings de
  JavaScript, que nadie puede borrar, y la copia que hace el glue de wasm se libera pero no se borra;
  cerrar un worker inactivo devuelve toda su memoria.

### Content Security Policy (navegador)

La página necesita `script-src 'wasm-unsafe-eval'` (el wasm se compila desde el paquete) y
`worker-src blob:` para los workers, por ejemplo:

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src blob:
```

Sin `blob:` las llamadas pasan al hilo actual, que además necesita `'unsafe-eval'` porque evalúa el
glue de wasm-bindgen embebido; sin ninguno de los dos, toda llamada rechaza con `WORKER`.

### Tamaño de datos y del paquete

- `cipher.encrypt`, `rsa.encrypt` y `signature` procesan toda la entrada en memoria: se copia al
  worker y luego a la memoria wasm (como máximo 4 GiB, compartidos con la salida), y las salidas
  cifradas son strings base64url de unos 4/3 de la entrada. Los motores JavaScript limitan la longitud
  de un string (V8: unos 512 Mi caracteres), así que mantén cada entrada muy por debajo de 380 MiB y
  divide los ficheros mayores en partes.
- El wasm (unos 1,3 MiB) viaja comprimido con gzip y en base64 dentro del JavaScript: unos 690 KiB por
  build (ESM o CJS; una app carga una, unos 495 KiB si el servidor la sirve con gzip). Se descomprime
  una vez con el `DecompressionStream` estándar (comprueba su soporte si apuntas a Safari o Firefox
  antiguos).

## Seguridad y riesgo conocido

El crate `rsa` tiene el aviso RUSTSEC-2023-0071 (ataque Marvin): su aritmética no es de tiempo
constante, así que el tiempo de **cada operación con la clave privada** puede filtrar información
sobre ella. Aquí eso es `rsa.decrypt` / `rsa.decryptBytes`, `signature.sign` y `jwt.sign` con una
clave PEM RSA; verificar y cifrar solo usan la clave pública y no están afectados. Ninguna versión de
`rsa` lo corrige todavía (incluidas las release candidates 0.10).

Mitigación en este paquete: toda operación con la clave privada usa RSA blinding con un valor aleatorio
nuevo (`decrypt_blinded`, `BlindedSigningKey`; `jsonwebtoken` aplica blinding a sus firmas RS\*), que
oculta la relación entre la entrada y el tiempo pero no hace el código de tiempo constante. La
recomendación del propio aviso sigue vigente: evita estas operaciones donde un atacante pueda medir su
tiempo, por ejemplo un servidor que descifra o firma datos de la red bajo demanda. El uso local, o
firmar tus propios datos, no tiene problema. Detalles: https://rustsec.org/advisories/RUSTSEC-2023-0071.

Otras pautas:

- Usa claves aleatorias (`generateKey()`) para `cipher` y `token`; para contraseñas que teclea una
  persona usa `cipher` con `{ password: true }` y nunca `token`.
- `jwt.decode` no verifica nada: usa `jwt.verify` para cualquier decisión de autorización.
- Los niveles son una elección de este paquete (ver [Niveles de seguridad](#niveles-de-seguridad)); no
  equivalen a una certificación.

## Resumen de exports

| Export                 | Tipo      | Contenido                                               |
| ---------------------- | --------- | ------------------------------------------------------- |
| `password`             | objeto    | `hash`, `verify`, `isHash`, `params`                    |
| `cipher`               | objeto    | `generateKey`, `encrypt`, `decrypt`, `decryptBytes`     |
| `rsa`                  | objeto    | `generateKeyPair`, `encrypt`, `decrypt`, `decryptBytes` |
| `signature`            | objeto    | `sign`, `verify`                                        |
| `hash`                 | objeto    | `digest`, `hmac`                                        |
| `token`                | objeto    | `generateKey`, `encrypt`, `decrypt`                     |
| `jwt`                  | objeto    | `sign`, `verify`, `decode`                              |
| `workers`              | objeto    | `configure`, `terminate`, `runtime`                     |
| `securityLevels`       | función   | `() => Promise<SecurityLevels>`                         |
| `CryptoError`          | clase     | Error con `code: CryptoErrorCode`                       |
| `CRYPTO_ERROR_CODES`   | constante | Lista de los 8 códigos de error                         |
| `SECURITY_LEVEL_NAMES` | constante | `['basic', 'standard', 'strong', 'cnsa', 'military']`   |

Tipos exportados: `SecurityLevel`, `LevelOptions`, `PasswordParams`, `SecurityLevelDescription`,
`SecurityLevels`, `CryptoErrorCode`, `PasswordAlgorithm`, `PasswordOptions`, `CipherAlgorithm`,
`CipherKeyOptions`, `CipherOptions`, `CipherDecryptOptions`, `RsaAlgorithm`, `RsaBits`, `RsaKeyPair`,
`RsaKeyPairOptions`, `RsaOptions`, `SignatureAlgorithm`, `SignatureOptions`, `HashAlgorithm`,
`HmacAlgorithm`, `HashOptions`, `HmacOptions`, `TokenAlgorithm`, `TokenOptions`, `TokenDecryptOptions`,
`TokenPayload`, `JwtAlgorithm`, `JwtSignOptions`, `JwtVerifyOptions`, `JwtPayload`, `WorkerMode`,
`WorkersOptions` y `WorkerRuntime`.

## Skill para asistentes de IA

El paquete incluye `SKILL.md`, una skill de Claude Code con las reglas, los patrones y los errores
comunes para escribir código correcto y seguro con esta librería. Para la API completa remite a este
README dentro de `node_modules/@archi-code/crypto-tools`, así que sigue valiendo al actualizar el
paquete. Para instalarla en tu proyecto:

```bash
mkdir -p .claude/skills/archi-code-crypto-tools && cp node_modules/@archi-code/crypto-tools/SKILL.md .claude/skills/archi-code-crypto-tools/SKILL.md
```

### Cómo se usa

Invócala con una petición:

```text
/archi-code-crypto-tools añade registro e inicio de sesión con contraseñas hasheadas y JWT de 15 minutos
```

O pide la tarea sin nombrarla y Claude la carga sola porque encaja con su descripción:

```text
Cifra el campo iban antes de guardarlo y descífralo al leerlo
```

También sirve para revisar código que ya usa el paquete:

```text
/archi-code-crypto-tools revisa el código de autenticación: await, caducidad de tokens y manejo de CryptoError
```

Con la skill cargada, Claude sigue sus reglas, evita los errores de su lista "Qué no hacer" y, antes de
usar algo que la skill no muestra, lee este README en `node_modules`.

### Mantenerla al día

- La copia no se actualiza sola: después de actualizar `@archi-code/crypto-tools`, vuelve a ejecutar el comando
  de arriba.
- Sube `.claude/skills/archi-code-crypto-tools/` al repositorio para que todo el equipo la use.

## Licencia

MIT
