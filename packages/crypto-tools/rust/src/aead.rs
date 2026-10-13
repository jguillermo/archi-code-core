use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes128Gcm, Aes256Gcm};
use chacha20poly1305::{ChaCha20Poly1305, XChaCha20Poly1305};

use crate::error::{CryptoError, CryptoResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AeadAlgorithm {
    Aes128Gcm,
    Aes256Gcm,
    ChaCha20Poly1305,
    XChaCha20Poly1305,
}

impl AeadAlgorithm {
    pub fn key_length(self) -> usize {
        match self {
            AeadAlgorithm::Aes128Gcm => 16,
            _ => 32,
        }
    }

    pub fn nonce_length(self) -> usize {
        match self {
            AeadAlgorithm::XChaCha20Poly1305 => 24,
            _ => 12,
        }
    }
}

fn seal_with<C: Aead + KeyInit>(key: &[u8], nonce: &[u8], data: &[u8], aad: &[u8]) -> Vec<u8> {
    let cipher = C::new_from_slice(key).unwrap_or_else(|_| unreachable!("key length is fixed"));
    cipher
        .encrypt(nonce.into(), Payload { msg: data, aad })
        .unwrap_or_else(|_| unreachable!("AEAD encryption only fails on oversized input"))
}

fn open_with<C: Aead + KeyInit>(
    key: &[u8],
    nonce: &[u8],
    data: &[u8],
    aad: &[u8],
) -> CryptoResult<Vec<u8>> {
    let cipher = C::new_from_slice(key).unwrap_or_else(|_| unreachable!("key length is fixed"));
    cipher
        .decrypt(nonce.into(), Payload { msg: data, aad })
        .map_err(|_| CryptoError::tampered("Data may have been tampered with or the key is wrong."))
}

pub fn seal(
    algorithm: AeadAlgorithm,
    key: &[u8],
    nonce: &[u8],
    data: &[u8],
    aad: &[u8],
) -> Vec<u8> {
    match algorithm {
        AeadAlgorithm::Aes128Gcm => seal_with::<Aes128Gcm>(key, nonce, data, aad),
        AeadAlgorithm::Aes256Gcm => seal_with::<Aes256Gcm>(key, nonce, data, aad),
        AeadAlgorithm::ChaCha20Poly1305 => seal_with::<ChaCha20Poly1305>(key, nonce, data, aad),
        AeadAlgorithm::XChaCha20Poly1305 => seal_with::<XChaCha20Poly1305>(key, nonce, data, aad),
    }
}

pub fn open(
    algorithm: AeadAlgorithm,
    key: &[u8],
    nonce: &[u8],
    data: &[u8],
    aad: &[u8],
) -> CryptoResult<Vec<u8>> {
    if nonce.len() != algorithm.nonce_length() {
        return Err(CryptoError::malformed(
            "Invalid encrypted format: wrong nonce length.",
        ));
    }
    match algorithm {
        AeadAlgorithm::Aes128Gcm => open_with::<Aes128Gcm>(key, nonce, data, aad),
        AeadAlgorithm::Aes256Gcm => open_with::<Aes256Gcm>(key, nonce, data, aad),
        AeadAlgorithm::ChaCha20Poly1305 => open_with::<ChaCha20Poly1305>(key, nonce, data, aad),
        AeadAlgorithm::XChaCha20Poly1305 => open_with::<XChaCha20Poly1305>(key, nonce, data, aad),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ALL: [AeadAlgorithm; 4] = [
        AeadAlgorithm::Aes128Gcm,
        AeadAlgorithm::Aes256Gcm,
        AeadAlgorithm::ChaCha20Poly1305,
        AeadAlgorithm::XChaCha20Poly1305,
    ];

    #[test]
    fn seals_and_opens_with_every_algorithm() {
        for algorithm in ALL {
            let key = vec![7u8; algorithm.key_length()];
            let nonce = vec![1u8; algorithm.nonce_length()];
            let sealed = seal(algorithm, &key, &nonce, b"hello", b"header");
            assert_eq!(
                open(algorithm, &key, &nonce, &sealed, b"header").unwrap(),
                b"hello"
            );
            assert!(open(algorithm, &key, &nonce, &sealed, b"other").is_err());
            assert!(open(algorithm, &key, &nonce[1..], &sealed, b"header").is_err());
        }
    }
}
