export interface SearchOptions {
  readonly withTotal?: boolean;
}

export interface SearchResult<T> {
  readonly items: T[];
  readonly total?: number;
}
