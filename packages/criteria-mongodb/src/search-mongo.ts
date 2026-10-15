import type { Criteria, FieldMap, SearchResult } from '@archi-code/criteria';
import { MongoCriteriaTranslator } from './mongo-criteria-translator';
import { MongoFilter, MongoSort } from './mongo-query';

export interface MongoFindOptions {
  sort: MongoSort;
  skip: number;
  limit?: number;
  projection: Record<string, 0 | 1>;
}

export interface MongoCollection<D> {
  find(filter: MongoFilter, options: MongoFindOptions): { toArray(): Promise<D[]> };
  countDocuments(filter: MongoFilter): Promise<number>;
}

export interface SearchMongoOptions<T, D> {
  readonly fields?: FieldMap<T>;
  readonly withTotal?: boolean;
  readonly projection?: Record<string, 0 | 1>;
  readonly map?: (document: D) => T;
}

function defaultProjection(fields: FieldMap<unknown> | undefined): Record<string, 0 | 1> {
  const mapsId = Object.values(fields ?? {}).some((field) => field === '_id');
  return mapsId ? {} : { _id: 0 };
}

export async function searchMongo<T, D = T>(
  collection: MongoCollection<D>,
  criteria: Criteria<T>,
  options: SearchMongoOptions<T, D> = {},
): Promise<SearchResult<T>> {
  const { filter, sort, skip, limit } = new MongoCriteriaTranslator<T>({
    fields: options.fields,
  }).translate(criteria);
  const findOptions: MongoFindOptions = {
    sort,
    skip,
    projection: options.projection ?? defaultProjection(options.fields as FieldMap<unknown>),
    ...(limit === undefined ? {} : { limit }),
  };
  const [documents, total] = await Promise.all([
    collection.find(filter, findOptions).toArray(),
    options.withTotal === true ? collection.countDocuments(filter) : undefined,
  ]);
  const map = options.map ?? ((document: D) => document as unknown as T);
  const items = documents.map((document) => map(document));
  return total === undefined ? { items } : { items, total };
}
