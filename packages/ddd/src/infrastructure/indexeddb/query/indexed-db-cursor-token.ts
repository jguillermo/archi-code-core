import { IndexedDbException } from '../../exceptions/indexed-db.exception';

export interface IndexedDbPosition {
  readonly key: IDBValidKey;
  readonly primaryKey: IDBValidKey;
}

export interface IndexedDbTokenScope {
  readonly index: string | null;
  readonly direction: 'next' | 'prev';
}

type EncodedKey = readonly ['s' | 'n', string] | readonly ['d', number] | readonly ['a', unknown[]];

export class IndexedDbCursorToken {
  private static readonly version = 1;

  static encode(position: IndexedDbPosition, scope: IndexedDbTokenScope): string {
    const text = JSON.stringify([
      IndexedDbCursorToken.version,
      scope.index,
      scope.direction,
      IndexedDbCursorToken.encodeKey(position.key),
      IndexedDbCursorToken.encodeKey(position.primaryKey),
    ]);
    const binary = Array.from(new TextEncoder().encode(text), (byte) =>
      String.fromCharCode(byte),
    ).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  static decode(token: string, scope: IndexedDbTokenScope): IndexedDbPosition {
    let decoded: unknown[];
    let position: IndexedDbPosition;
    try {
      const binary = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown[];
      if (decoded[0] !== IndexedDbCursorToken.version) {
        throw new Error('unknown token version');
      }
      position = {
        key: IndexedDbCursorToken.decodeKey(decoded[3]),
        primaryKey: IndexedDbCursorToken.decodeKey(decoded[4]),
      };
    } catch (error) {
      throw new IndexedDbException('invalid_query', 'after is not a token returned by find', {
        cause: error,
      });
    }
    if (decoded[1] !== scope.index || decoded[2] !== scope.direction) {
      throw new IndexedDbException(
        'invalid_query',
        'the after token belongs to another index or direction',
      );
    }
    return position;
  }

  private static encodeKey(key: IDBValidKey): EncodedKey {
    if (typeof key === 'string') {
      return ['s', key];
    }
    if (typeof key === 'number') {
      return ['n', String(key)];
    }
    if (key instanceof Date) {
      return ['d', key.getTime()];
    }
    if (Array.isArray(key)) {
      return ['a', key.map((part) => IndexedDbCursorToken.encodeKey(part))];
    }
    throw new IndexedDbException('invalid_query', 'a query cannot continue from a binary key');
  }

  private static decodeKey(encoded: unknown): IDBValidKey {
    const [kind, value] = encoded as [unknown, unknown];
    if (kind === 's' && typeof value === 'string') {
      return value;
    }
    if (kind === 'n' && typeof value === 'string') {
      return Number(value);
    }
    if (kind === 'd' && typeof value === 'number') {
      return new Date(value);
    }
    if (kind === 'a' && Array.isArray(value)) {
      return value.map((part) => IndexedDbCursorToken.decodeKey(part));
    }
    throw new Error('unknown key');
  }
}
