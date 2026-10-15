export type MongoFilter = Record<string, unknown>;

export type MongoSort = Record<string, 1 | -1>;

export interface MongoQuery {
  readonly filter: MongoFilter;
  readonly sort: MongoSort;
  readonly skip: number;
  readonly limit?: number;
}
