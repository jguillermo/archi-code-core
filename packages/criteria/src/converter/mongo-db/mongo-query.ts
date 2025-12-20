export type MongoFilterOperator = '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte' | '$regex' | '$in' | '$nin';
export type MongoFilter = { [field: string]: { [op in MongoFilterOperator]?: any } } | { $or: MongoFilter[] } | { $and: MongoFilter[] };
export type MongoSort = { [field: string]: 1 | -1 };

export interface MongoQuery {
  filter: MongoFilter;
  sort: MongoSort;
  skip: number;
  limit: number;
}
