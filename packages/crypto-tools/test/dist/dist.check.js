'use strict';

const SECRET = 'a-secret-key-with-more-than-16-chars';

function smoke(m) {
  return [
    [
      'BcryptPasswordEncryptor hashes and verifies',
      async () => {
        const encryptor = new m.BcryptPasswordEncryptor(4);
        const hash = await encryptor.hashPassword('secret');
        return (
          (await encryptor.verifyPassword('secret', hash)) === true &&
          (await encryptor.verifyPassword('other', hash)) === false
        );
      },
    ],
    [
      'SodiumPasswordEncryptor hashes and verifies',
      async () => {
        const encryptor = new m.SodiumPasswordEncryptor();
        const hash = await encryptor.hashPassword('secret');
        return (
          (await encryptor.verifyPassword('secret', hash)) === true &&
          (await encryptor.verifyPassword('other', hash)) === false
        );
      },
    ],
    [
      'SodiumHasher hashes with sha256',
      async () => /^[0-9a-f]{64}$/.test(await new m.SodiumHasher().sha256('text')),
    ],
    [
      'JWTDataSigner signs and verifies',
      () => {
        const signer = new m.JWTDataSigner(SECRET);
        return signer.verify(signer.sign({ id: 7 })).id === 7;
      },
    ],
    [
      'CryptoEngine encodes and decodes',
      () => {
        const engine = new m.CryptoEngine('seed-key');
        return engine.decode(engine.encode('hello world')) === 'hello world';
      },
    ],
  ];
}

module.exports = { smoke };
