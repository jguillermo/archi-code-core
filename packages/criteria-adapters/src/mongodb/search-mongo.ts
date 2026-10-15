import type { Criteria, FieldMap, SearchResult } from '@archi-code/criteria';
import { MongoCriteriaTranslator, MongoValueConverters } from './mongo-criteria-translator';
import { MongoFilter, MongoSort } from './mongo-query';

export interface MongoDriverOptions {
  session?: any;
  maxTimeMS?: number;
  hint?: any;
  comment?: any;
}

export interface MongoFindOptions extends MongoDriverOptions {
  sort: MongoSort;
  skip: number;
  limit?: number;
  projection: Record<string, 0 | 1>;
}

export interface MongoCollection<D> {
  find(filter: MongoFilter, options: MongoFindOptions): { toArray(): Promise<D[]> };
  countDocuments(filter: MongoFilter, options: MongoDriverOptions): Promise<number>;
}

export interface SearchMongoOptions<T, D> extends Readonly<MongoDriverOptions> {
  readonly fields?: FieldMap<T>;
  readonly convert?: MongoValueConverters<T>;
  readonly withTotal?: boolean;
  readonly projection?: Record<string, 0 | 1>;
  readonly map?: (document: D) => T;
}

const DRIVER_OPTIONS = ['session', 'maxTimeMS', 'hint', 'comment'] as const;

function driverOptions(options: MongoDriverOptions): MongoDriverOptions {
  const picked: Record<string, unknown> = {};
  for (const name of DRIVER_OPTIONS) {
    if (options[name] !== undefined) {
      picked[name] = options[name];
    }
  }
  return picked;
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
    convert: options.convert,
  }).translate(criteria);
  const driver = driverOptions(options);
  const findOptions: MongoFindOptions = {
    ...driver,
    sort,
    skip,
    projection: options.projection ?? defaultProjection(options.fields as FieldMap<unknown>),
    ...(limit === undefined ? {} : { limit }),
  };
  const [documents, total] = await Promise.all([
    collection.find(filter, findOptions).toArray(),
    options.withTotal === true ? collection.countDocuments(filter, driver) : undefined,
  ]);
  const map = options.map ?? ((document: D) => document as unknown as T);
  const items = documents.map((document) => map(document));
  return total === undefined ? { items } : { items, total };
}
