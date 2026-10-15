import { mapField, visitFilter } from '@archi-code/criteria';
import type { Criteria, FieldMap, FilterNode, TextNode } from '@archi-code/criteria';
import { escapeRegex } from './escape-regex';
import { MongoFilter, MongoQuery, MongoSort } from './mongo-query';

export interface MongoTranslatorOptions<T> {
  readonly fields?: FieldMap<T>;
}

const COMPARISON_OPERATORS = {
  eq: '$eq',
  ne: '$ne',
  gt: '$gt',
  gte: '$gte',
  lt: '$lt',
  lte: '$lte',
} as const;

function textPattern(node: TextNode): string {
  const literal = escapeRegex(node.value);
  switch (node.operator) {
    case 'contains':
      return literal;
    case 'startsWith':
      return `^${literal}`;
    default:
      return `${literal}\\z`;
  }
}

export class MongoCriteriaTranslator<T> {
  constructor(private readonly options: MongoTranslatorOptions<T> = {}) {}

  translate(criteria: Criteria<T>): MongoQuery {
    const pagination = criteria.pagination;
    return {
      filter: this.translateFilter(criteria.filter),
      sort: this.translateOrder(criteria),
      skip: pagination?.offset ?? 0,
      ...(pagination?.limit == null ? {} : { limit: pagination.limit }),
    };
  }

  translateFilter(filter: FilterNode | null): MongoFilter {
    if (filter === null) {
      return {};
    }
    return visitFilter<MongoFilter>(filter, {
      compare: (node) => this.on(node.field, { [COMPARISON_OPERATORS[node.operator]]: node.value }),
      between: (node) => this.on(node.field, { $gte: node.min, $lte: node.max }),
      in: (node) => this.on(node.field, { $in: [...node.values] }),
      notIn: (node) => this.on(node.field, { $nin: [...node.values] }),
      text: (node) =>
        this.on(node.field, {
          $regex: textPattern(node),
          ...(node.caseSensitive ? {} : { $options: 'i' }),
        }),
      isNull: (node) => this.on(node.field, node.value ? { $eq: null } : { $ne: null }),
      arrayContains: (node) =>
        this.on(node.field, {
          $type: 'array',
          [node.match === 'some' ? '$in' : '$all']: [...node.values],
        }),
      arrayEmpty: (node) =>
        this.on(node.field, node.value ? { $size: 0 } : { $type: 'array', $not: { $size: 0 } }),
      and: (node) => ({ $and: node.filters.map((child) => this.translateFilter(child)) }),
      or: (node) => ({ $or: node.filters.map((child) => this.translateFilter(child)) }),
      not: (node) => ({ $nor: [this.translateFilter(node.filter)] }),
    });
  }

  private translateOrder(criteria: Criteria<T>): MongoSort {
    const sort: MongoSort = {};
    for (const { field, direction } of criteria.order) {
      sort[this.field(field)] = direction === 'asc' ? 1 : -1;
    }
    return sort;
  }

  private on(field: string, condition: Record<string, unknown>): MongoFilter {
    return { [this.field(field)]: condition };
  }

  private field(field: string): string {
    return mapField(this.options.fields, field);
  }
}
