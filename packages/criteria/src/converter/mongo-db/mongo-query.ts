export type MongoFilterOperator =
  | '$eq'
  | '$ne'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$regex'
  | '$in'
  | '$nin';
export type MongoFilter =
  | Record<string, Partial<Record<MongoFilterOperator, any>>>
  | { $or: MongoFilter[] }
  | { $and: MongoFilter[] };
export type MongoSort = Record<string, 1 | -1>;

export interface MongoQuery {
  filter: MongoFilter;
  sort: MongoSort;
  skip: number;
  limit: number;
}
