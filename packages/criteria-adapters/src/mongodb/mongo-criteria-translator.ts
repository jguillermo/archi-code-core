import { CriteriaError, mapField, visitFilter } from '@archi-code/criteria';
import type {
  Criteria,
  CriteriaScalar,
  FieldMap,
  FilterNode,
  Path,
  TextNode,
} from '@archi-code/criteria';
import { escapeRegex } from './escape-regex';
import { MongoFilter, MongoQuery, MongoSort } from './mongo-query';

export type MongoValueConverters<T> = Readonly<
  Partial<Record<Path<T>, (value: CriteriaScalar) => unknown>>
>;

export interface MongoTranslatorOptions<T> {
  readonly fields?: FieldMap<T>;
  readonly convert?: MongoValueConverters<T>;
}

const COMPARISON_OPERATORS = {
  eq: '$eq',
  gt: '$gt',
  gte: '$gte',
  lt: '$lt',
  lte: '$lte',
} as const;

const NOT_A_LIST = { $not: { $type: 'array' } };

const ARRAY_INDEX = /^(0|[1-9]\d*)$/;

function listPrefixes(path: string): string[] {
  const segments = path.split('.');
  return segments
    .slice(1)
    .flatMap((segment, index) =>
      ARRAY_INDEX.test(segment) ? [] : [segments.slice(0, index + 1).join('.')],
    );
}

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
      compare: (node) => {
        const value = this.value(node.field, node.value);
        return node.operator === 'ne'
          ? this.orUnreachable(this.field(node.field), { $ne: value, ...NOT_A_LIST })
          : this.scalar(node.field, { [COMPARISON_OPERATORS[node.operator]]: value });
      },
      between: (node) =>
        this.scalar(node.field, {
          $gte: this.value(node.field, node.min),
          $lte: this.value(node.field, node.max),
        }),
      in: (node) => this.scalar(node.field, { $in: this.values(node.field, node.values) }),
      notIn: (node) =>
        this.orUnreachable(this.field(node.field), {
          $nin: this.values(node.field, node.values),
          ...NOT_A_LIST,
        }),
      text: (node) =>
        this.scalar(node.field, {
          $regex: textPattern(node),
          ...(node.caseSensitive ? {} : { $options: 'i' }),
        }),
      isNull: (node) =>
        node.value
          ? this.orUnreachable(this.field(node.field), { $eq: null, ...NOT_A_LIST })
          : this.reachable(this.field(node.field), { $ne: null }),
      arrayContains: (node) =>
        this.reachable(this.field(node.field), {
          $type: 'array',
          [node.match === 'some' ? '$in' : '$all']: this.values(node.field, node.values),
        }),
      arrayEmpty: (node) =>
        this.reachable(
          this.field(node.field),
          node.value ? { $size: 0 } : { $type: 'array', $not: { $size: 0 } },
        ),
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

  private scalar(field: string, condition: Record<string, unknown>): MongoFilter {
    return this.reachable(this.field(field), { ...condition, ...NOT_A_LIST });
  }

  private reachable(path: string, condition: Record<string, unknown>): MongoFilter {
    const guards = listPrefixes(path).map((prefix) => ({ [prefix]: NOT_A_LIST }));
    const own = { [path]: condition };
    return guards.length === 0 ? own : { $and: [...guards, own] };
  }

  private orUnreachable(path: string, condition: Record<string, unknown>): MongoFilter {
    const crossed = listPrefixes(path).map((prefix) => ({ [prefix]: { $type: 'array' } }));
    const reached = this.reachable(path, condition);
    return crossed.length === 0 ? reached : { $or: [...crossed, reached] };
  }

  private value(field: string, value: CriteriaScalar): unknown {
    const converters = this.options.convert as Record<string, unknown> | undefined;
    const convert =
      converters !== undefined && Object.prototype.hasOwnProperty.call(converters, field)
        ? converters[field]
        : undefined;
    if (typeof convert !== 'function') {
      return value;
    }
    try {
      return convert(value);
    } catch (cause) {
      const name = field.length > 64 ? `${field.slice(0, 64)}…` : field;
      throw new CriteriaError('INVALID_VALUE', `Field "${name}" has a value it cannot store`, {
        cause,
      });
    }
  }

  private values(field: string, values: readonly CriteriaScalar[]): unknown[] {
    return values.map((value) => this.value(field, value));
  }

  private field(field: string): string {
    return mapField(this.options.fields, field);
  }
}
