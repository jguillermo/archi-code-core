# @archi-code/crypto-tools

Password hashing, hashing, JWT signing and reversible text encoding for Node.js. The heavy
libraries are optional peer dependencies, loaded only when the class that needs them is used, so
you install just the ones you use. The package ships dual CJS and ESM builds.

```bash
npm install @archi-code/crypto-tools
npm install bcrypt                  # BcryptPasswordEncryptor
npm install libsodium-wrappers-sumo # SodiumPasswordEncryptor, SodiumHasher
npm install jsonwebtoken            # JWTDataSigner
```

## Usage

```ts
import { BcryptPasswordEncryptor, JWTDataSigner } from '@archi-code/crypto-tools';

const encryptor = new BcryptPasswordEncryptor();
const hash = await encryptor.hashPassword('secret');
await encryptor.verifyPassword('secret', hash); // true

const signer = new JWTDataSigner('a-secret-key-with-at-least-16-chars');
signer.verify(signer.sign({ id: 7 })); // { id: 7, iat: … }
```

## Building blocks

| Export                     | Needs                     | Purpose                                        |
| -------------------------- | ------------------------- | ---------------------------------------------- |
| `BcryptPasswordEncryptor`  | `bcrypt`                  | `hashPassword` / `verifyPassword`              |
| `SodiumPasswordEncryptor`  | `libsodium-wrappers-sumo` | `hashPassword` / `verifyPassword`              |
| `PasswordEncryptorFactory` | —                         | Creates an encryptor by class name             |
| `SodiumHasher`             | `libsodium-wrappers-sumo` | `sha256` / `sha512` / `blake2b`                |
| `HasherFactory`            | —                         | Creates a hasher by class name                 |
| `JWTDataSigner`            | `jsonwebtoken`            | `sign` / `verify` / `data` (secret ≥ 16 chars) |
| `CryptoEngine`             | —                         | `encode` / `decode` text with a seed key       |

## License

MIT
