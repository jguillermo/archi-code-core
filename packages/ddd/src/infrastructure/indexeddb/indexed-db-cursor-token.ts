import { IndexedDbException } from '../exceptions/indexed-db.exception';

export interface IndexedDbPosition {
  readonly key: IDBValidKey;
  readonly primaryKey: IDBValidKey;
}

interface TokenScope {
  readonly index: string | null;
  readonly direction: IDBCursorDirection;
}

type EncodedKey =
  | { readonly s: string }
  | { readonly n: number | string }
  | { readonly d: number }
  | { readonly b: string }
  | { readonly a: readonly EncodedKey[] };

interface EncodedToken {
  readonly v: 1;
  readonly i: string | null;
  readonly r: IDBCursorDirection;
  readonly k: EncodedKey;
  readonly p: EncodedKey;
}

export class IndexedDbCursorToken {
  static encode(position: IndexedDbPosition, scope: TokenScope): string {
    const token: EncodedToken = {
      v: 1,
      i: scope.index,
      r: scope.direction,
      k: IndexedDbCursorToken.encodeKey(position.key),
      p: IndexedDbCursorToken.encodeKey(position.primaryKey),
    };
    return IndexedDbCursorToken.toBase64Url(JSON.stringify(token));
  }

  static decode(token: string, scope: TokenScope): IndexedDbPosition {
    let decoded: EncodedToken;
    try {
      decoded = JSON.parse(IndexedDbCursorToken.fromBase64Url(token)) as EncodedToken;
      if (decoded.v !== 1) {
        throw new Error('unknown token version');
      }
      const position = {
        key: IndexedDbCursorToken.decodeKey(decoded.k),
        primaryKey: IndexedDbCursorToken.decodeKey(decoded.p),
      };
      if (decoded.i !== scope.index || decoded.r !== scope.direction) {
        throw new IndexedDbException(
          'invalid_query',
          'the after token belongs to another index or direction',
        );
      }
      return position;
    } catch (error) {
      if (error instanceof IndexedDbException) {
        throw error;
      }
      throw new IndexedDbException('invalid_query', 'after is not a token returned by find', {
        cause: error,
      });
    }
  }

  private static encodeKey(key: IDBValidKey): EncodedKey {
    if (typeof key === 'string') {
      return { s: key };
    }
    if (typeof key === 'number') {
      return { n: Number.isFinite(key) ? key : String(key) };
    }
    if (key instanceof Date) {
      return { d: key.getTime() };
    }
    if (Array.isArray(key)) {
      return { a: key.map((part) => IndexedDbCursorToken.encodeKey(part)) };
    }
    const bytes = ArrayBuffer.isView(key)
      ? new Uint8Array(key.buffer, key.byteOffset, key.byteLength)
      : new Uint8Array(key as ArrayBuffer);
    return { b: IndexedDbCursorToken.toBase64(bytes) };
  }

  private static decodeKey(encoded: EncodedKey): IDBValidKey {
    if ('s' in encoded && typeof encoded.s === 'string') {
      return encoded.s;
    }
    if ('n' in encoded) {
      return Number(encoded.n);
    }
    if ('d' in encoded && typeof encoded.d === 'number') {
      return new Date(encoded.d);
    }
    if ('a' in encoded && Array.isArray(encoded.a)) {
      return encoded.a.map((part) => IndexedDbCursorToken.decodeKey(part));
    }
    if ('b' in encoded && typeof encoded.b === 'string') {
      return IndexedDbCursorToken.fromBase64(encoded.b).buffer as ArrayBuffer;
    }
    throw new Error('unknown key');
  }

  private static toBase64Url(text: string): string {
    return IndexedDbCursorToken.toBase64(new TextEncoder().encode(text))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private static fromBase64Url(token: string): string {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    return new TextDecoder('utf-8', { fatal: true }).decode(
      IndexedDbCursorToken.fromBase64(base64),
    );
  }

  private static toBase64(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  private static fromBase64(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let at = 0; at < binary.length; at += 1) {
      bytes[at] = binary.charCodeAt(at);
    }
    return bytes;
  }
}
