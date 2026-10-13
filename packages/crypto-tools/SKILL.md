---
name: archi-code-crypto-tools
description: Reglas, patrones y errores comunes para escribir código correcto y seguro con @archi-code/crypto-tools, el kit criptográfico Rust→wasm para navegador y Node.js que ejecuta cada llamada en workers. Úsala cuando haya que hashear o verificar contraseñas, cifrar o descifrar, usar RSA o firmas, calcular hashes o HMAC, emitir o verificar tokens y JWT, elegir un nivel de seguridad, tratar un CryptoError o configurar el pool de workers; y siempre que el código importe @archi-code/crypto-tools.
---

# archi-code-crypto-tools

`@archi-code/crypto-tools` es un kit criptográfico escrito en Rust, compilado a un único wasm embebido y
ejecutado en un pool de workers (Web Workers en el navegador, `worker_threads` en Node). Mismo paquete
y misma API en navegador y Node, sin dependencias npm ni configuración del bundler.

## API completa

Antes de usar una función, opción, algoritmo o tipo que no aparezca en esta skill, lee
`node_modules/@archi-code/crypto-tools/README.md`: corresponde a la versión instalada. No supongas
firmas, opciones ni valores por defecto. Si el paquete no está instalado:
`npm install @archi-code/crypto-tools`.

Si esa ruta no existe (monorepo con workspaces, pnpm…), localiza el paquete con
`node -p "require.resolve('@archi-code/crypto-tools/package.json')"` y lee el `README.md` de esa
carpeta.

## Skills relacionadas

Si están instaladas en el proyecto, úsalas junto a esta:

- `archi-code-validation`: validar entradas (email, longitud de contraseña…) antes de hashear o firmar.

## Importación

```ts
import { password, cipher, jwt, token, CryptoError } from '@archi-code/crypto-tools';
```

```js
const { password, cipher, jwt, token, CryptoError } = require('@archi-code/crypto-tools');
```

No hay export por defecto ni subrutas (`@archi-code/crypto-tools/jwt` no existe).

## Reglas

1. **Todo es async**: cada función (salvo `workers.*`, que es síncrono) devuelve una `Promise`. Usa
   siempre `await`; un error llega como rechazo con `CryptoError`, nunca como valor de retorno.
2. **Opciones al final**, como objeto `{ level, algorithm, … }`. Niveles: `basic`, `standard` (por
   defecto), `strong` y `cnsa` (`military` es su alias). Si `level` y `algorithm` no coinciden →
   `UNSUPPORTED`: pasa uno u otro.
3. **Las salidas registran su algoritmo**: `decrypt`/`verify` no necesitan `level`.
4. **Contraseñas**: `standard` es Argon2id; solo `basic` usa bcrypt. Máximo **64 caracteres**
   (grapheme clusters, no `.length`); bcrypt rechaza contraseñas de más de **72 bytes UTF-8** en lugar
   de truncarlas. Ambos casos → `INVALID_INPUT`. `password.verify` devuelve `false` si no coincide.
5. **Caducidad obligatoria**: `jwt.sign` y `token.encrypt` exigen `expiresIn` o un claim `exp`, salvo
   `requireExpiration: false`, que entonces también hay que pasar a `verify`/`decrypt`.
6. **Errores por `code`**: `CryptoError` tiene `code` (`INVALID_KEY`, `INVALID_INPUT`, `TAMPERED`,
   `EXPIRED`, `MALFORMED`, `UNSUPPORTED`, `WORKER`, `TIMEOUT`). Los mensajes no son contrato.
7. **Sin compatibilidad con otras librerías**: solo lee lo que ella misma produce. No verifica hashes de
   `bcryptjs` (`$2a$`, `$2y$`) ni Argon2i/d, no descifra datos de `crypto.createCipheriv` ni carga
   claves PKCS#1 (`BEGIN RSA PRIVATE KEY`).
8. **Pool de workers**:
   - Llama a `workers.configure(...)` una vez al arrancar, antes de la primera llamada; hacerlo con
     llamadas en curso las rechaza con `WORKER`.
   - Una llamada que supera `timeout` rechaza con `TIMEOUT` y el worker se reemplaza; un trap del wasm
     rechaza con `WORKER`. Los workers inactivos se cierran solos tras `idleTimeout`.
   - Un script Node termina solo; en tests (Jest) o al apagar un servidor llama a
     `workers.terminate()` (por ejemplo en `afterAll`).
   - Si la app genera claves RSA 4096 o usa `cnsa` en dispositivos lentos, sube `timeout`.
   - En navegador con CSP: `script-src 'wasm-unsafe-eval'` y `worker-src blob:`. Sin `blob:` todo
     corre en el hilo principal y además necesita `'unsafe-eval'`; sin ambos, toda llamada rechaza con
     `WORKER`.

## Patrones recomendados

Registro e inicio de sesión:

```ts
const stored = await password.hash(plainPassword); // Argon2id; guarda el string completo
const ok = await password.verify(plainPassword, stored); // boolean, no lanza por no coincidir
```

Cifrar con una clave de aplicación (genérala una vez y guárdala como secreto):

```ts
const key = await cipher.generateKey();
const encrypted = await cipher.encrypt(data, key);
const plain = await cipher.decrypt(encrypted, key); // o decryptBytes para binarios
```

Sesión con JWT (caducidad siempre):

```ts
const accessToken = await jwt.sign({ sub: userId, role }, jwtSecret, {
  expiresIn: 900,
  issuer: 'mi-app',
});
const claims = await jwt.verify(accessToken, jwtSecret, { issuer: 'mi-app' });
```

Manejo de errores por código:

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

## Qué no hacer

- No olvides `await` ni compares la `Promise` (`if (password.verify(...))` es siempre verdadero).
- No envuelvas `password.verify` en `try/catch` esperando una excepción por contraseña errónea: devuelve
  `false`. Lo mismo `signature.verify`.
- No pases contraseñas de más de 64 caracteres, ni de más de 72 bytes con bcrypt; valida la longitud
  en el formulario o captura `INVALID_INPUT`.
- No uses `level: 'basic'` (bcrypt) para contraseñas nuevas sin motivo: `standard` (Argon2id) es el
  defecto recomendado.
- No esperes compatibilidad con hashes, cifrados o claves de otras librerías (ver Reglas, 7).
- No uses una contraseña humana como clave de `cipher` sin `{ password: true }`, ni como clave de
  `token` (no tiene modo contraseña): usa `generateKey()`.
- No firmes JWT sin caducidad: `jwt.sign` y `token.encrypt` exigen `expiresIn` o un claim `exp`;
  `requireExpiration: false` solo para tokens que de verdad no caducan, y entonces `verify`/`decrypt`
  también necesitan `{ requireExpiration: false }`.
- No uses `jwt.decode` para autorizar: no verifica la firma.
- No inventes opciones de `jwt` (`expiresInMinutes`, `notBefore`, `jwtid`, `ignoreExpiration`…): las
  desconocidas → `INVALID_INPUT`. Consulta el README instalado.
- No compares hashes de `hash.digest` para contraseñas ni muestres hashes de `password.hash` como
  deterministas: llevan sal aleatoria.
- No mezcles `level` y `algorithm` contradictorios (`{ level: 'basic', algorithm: 'argon2id' }` →
  `UNSUPPORTED`).
- No pases objetos con `BigInt` o ciclos como payload de `jwt`/`token`.
- No uses claves RSA de menos de 2048 bits ni PEM PKCS#1; usa `rsa.generateKeyPair`.
- No cargues ficheros enormes de una vez: `cipher.encrypt`, `rsa.encrypt` y `signature` trabajan en
  memoria; mantén cada entrada muy por debajo de 380 MiB y trocea los ficheros mayores.
- No ignores el riesgo conocido del crate `rsa` (aviso RUSTSEC-2023-0071): está descrito en la sección
  "Seguridad y riesgo conocido" del README; revísalo antes de usar operaciones con clave privada RSA.
- `cnsa`/`military` es una elección de algoritmos de este paquete, no una certificación: no lo
  presentes como cumplimiento normativo sin revisarlo.
