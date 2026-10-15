import { Criteria, CriteriaChecker } from './criteria';
import { CriteriaError } from './criteria-error';
import { CriteriaNodes, inputToNodes } from './criteria-input';
import { CriteriaScalar, isRecord } from './criteria-value';
import { assertField } from './field-name';
import { FieldNode, FilterNode } from './filter-node';
import { Pagination } from './pagination';
import { Path, PathValue } from './path';
import { visitFilter } from './visit-filter';

export type ScalarFieldType = 'string' | 'number' | 'boolean' | 'date';
export type FieldType = ScalarFieldType | `${ScalarFieldType}[]`;
export type FilterOperatorName =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'nin'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'isNull'
  | 'has'
  | 'hasSome'
  | 'hasEvery'
  | 'isEmpty';

type ScalarTypeOf<V> = [V] extends [string]
  ? 'string'
  : [V] extends [number]
    ? 'number'
    : [V] extends [boolean]
      ? 'boolean'
      : [V] extends [Date]
        ? 'date'
        : never;

export type FieldTypeOf<V> = [NonNullable<V>] extends [never]
  ? never
  : [NonNullable<V>] extends [readonly (infer E)[]]
    ? `${ScalarTypeOf<NonNullable<E>>}[]`
    : ScalarTypeOf<NonNullable<V>>;

export interface FieldSpec<K extends FieldType = FieldType> {
  readonly type: K;
  readonly operators?: readonly FilterOperatorName[];
  readonly sortable?: boolean;
}

export type SchemaFields<T> = {
  readonly [P in Path<T>]?: FieldTypeOf<PathValue<T, P>> | FieldSpec<FieldTypeOf<PathValue<T, P>>>;
};

export interface CriteriaSchemaDefinition<T> {
  readonly fields: SchemaFields<T>;
  readonly defaultLimit?: number;
  readonly maxLimit?: number;
}

export interface CriteriaSchema<T> extends CriteriaChecker<T> {
  parse(input: unknown): Criteria<T>;
  fromUrl(text: string): Criteria<T>;
}

interface ResolvedField {
  readonly type: FieldType;
  readonly operators: readonly FilterOperatorName[];
  readonly sortable: boolean;
}

const RANGE_OPERATORS: readonly FilterOperatorName[] = [
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'in',
  'nin',
  'isNull',
];

const OPERATORS_BY_TYPE: Record<ScalarFieldType | 'array', readonly FilterOperatorName[]> = {
  string: [...RANGE_OPERATORS, 'contains', 'startsWith', 'endsWith'],
  number: RANGE_OPERATORS,
  date: RANGE_OPERATORS,
  boolean: ['eq', 'ne', 'isNull'],
  array: ['has', 'hasSome', 'hasEvery', 'isEmpty', 'isNull'],
};

const SCALAR_TYPES: readonly string[] = ['string', 'number', 'boolean', 'date'];

function elementType(type: FieldType): ScalarFieldType {
  return (type.endsWith('[]') ? type.slice(0, -2) : type) as ScalarFieldType;
}

function isArrayType(type: FieldType): boolean {
  return type.endsWith('[]');
}

function resolveField(field: string, spec: unknown): ResolvedField {
  const resolved: unknown = typeof spec === 'string' ? { type: spec } : spec;
  if (!isRecord(resolved) || typeof resolved.type !== 'string') {
    throw new CriteriaError('INVALID_SCHEMA', `Field "${field}" needs a type`);
  }
  const type = resolved.type as FieldType;
  if (!SCALAR_TYPES.includes(elementType(type)) || type.endsWith('[][]')) {
    throw new CriteriaError('INVALID_SCHEMA', `Field "${field}" has an unknown type "${type}"`);
  }
  const allowed = OPERATORS_BY_TYPE[isArrayType(type) ? 'array' : elementType(type)];
  const operators = (resolved.operators ?? allowed) as readonly FilterOperatorName[];
  const invalid = operators.find((operator) => !allowed.includes(operator));
  if (invalid !== undefined) {
    throw new CriteriaError(
      'INVALID_SCHEMA',
      `Operator "${invalid}" does not apply to field "${field}" of type ${type}`,
    );
  }
  const sortable = resolved.sortable ?? !isArrayType(type);
  if (sortable === true && isArrayType(type)) {
    throw new CriteriaError('INVALID_SCHEMA', `Field "${field}" is a list and cannot be sorted`);
  }
  return { type, operators, sortable: sortable === true };
}

function assertLimit(value: number | undefined, name: string): void {
  if (value !== undefined && !(Number.isInteger(value) && value >= 1)) {
    throw new CriteriaError('INVALID_SCHEMA', `"${name}" must be an integer from 1`);
  }
}

function coerceScalar(value: unknown, type: ScalarFieldType, field: string): CriteriaScalar {
  if (type === 'string' && typeof value === 'string') {
    return value;
  }
  if (type === 'number') {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  if (type === 'boolean') {
    if (typeof value === 'boolean') {
      return value;
    }
    if (value === 'true' || value === 'false') {
      return value === 'true';
    }
  }
  if (type === 'date') {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }
  throw new CriteriaError('INVALID_VALUE', `Field "${field}" needs a ${type} value`);
}

function operatorName(node: FieldNode): FilterOperatorName {
  switch (node.kind) {
    case 'compare':
    case 'text':
      return node.operator;
    case 'notIn':
      return 'nin';
    case 'arrayContains':
      if (node.match === 'every') {
        return 'hasEvery';
      }
      return node.values.length === 1 ? 'has' : 'hasSome';
    case 'arrayEmpty':
      return 'isEmpty';
    default:
      return node.kind;
  }
}

function toInteger(value: unknown): unknown {
  return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
}

export function defineCriteriaSchema<T>(
  definition: CriteriaSchemaDefinition<T>,
): CriteriaSchema<T> {
  if (!isRecord(definition) || !isRecord(definition.fields)) {
    throw new CriteriaError('INVALID_SCHEMA', 'The schema needs "fields"');
  }
  const fields = new Map<string, ResolvedField>();
  for (const [field, spec] of Object.entries(definition.fields)) {
    if (spec !== undefined) {
      fields.set(assertField(field), resolveField(field, spec));
    }
  }
  const { defaultLimit, maxLimit } = definition;
  assertLimit(defaultLimit, 'defaultLimit');
  assertLimit(maxLimit, 'maxLimit');
  if (defaultLimit !== undefined && maxLimit !== undefined && defaultLimit > maxLimit) {
    throw new CriteriaError('INVALID_SCHEMA', '"defaultLimit" cannot be greater than "maxLimit"');
  }

  const specOf = (field: string): ResolvedField => {
    const spec = fields.get(field);
    if (spec === undefined) {
      throw new CriteriaError('UNKNOWN_FIELD', `Field "${field}" cannot be used in a search`);
    }
    return spec;
  };

  const coerceField = (node: FieldNode): FilterNode => {
    const spec = specOf(node.field);
    const operator = operatorName(node);
    const allowed =
      spec.operators.includes(operator) ||
      (operator === 'has' && spec.operators.includes('hasSome'));
    if (!allowed) {
      throw new CriteriaError(
        'OPERATOR_NOT_ALLOWED',
        `Operator "${operator}" is not allowed on field "${node.field}"`,
      );
    }
    const type = elementType(spec.type);
    const coerce = (value: unknown): CriteriaScalar => coerceScalar(value, type, node.field);
    switch (node.kind) {
      case 'compare':
        return { ...node, value: coerce(node.value) };
      case 'between':
        return {
          ...node,
          min: coerce(node.min) as typeof node.min,
          max: coerce(node.max) as typeof node.max,
        };
      case 'in':
      case 'notIn':
      case 'arrayContains':
        return { ...node, values: node.values.map(coerce) };
      default:
        return node;
    }
  };

  const coerceFilter = (node: FilterNode): FilterNode =>
    visitFilter<FilterNode>(node, {
      compare: coerceField,
      between: coerceField,
      in: coerceField,
      notIn: coerceField,
      text: coerceField,
      isNull: coerceField,
      arrayContains: coerceField,
      arrayEmpty: coerceField,
      and: (and) => ({ kind: 'and', filters: and.filters.map(coerceFilter) }),
      or: (or) => ({ kind: 'or', filters: or.filters.map(coerceFilter) }),
      not: (not) => ({ kind: 'not', filter: coerceFilter(not.filter) }),
    });

  const limitPagination = (pagination: Pagination | null): Pagination => {
    const requested = pagination?.limit ?? null;
    if (requested !== null && maxLimit !== undefined && requested > maxLimit) {
      throw new CriteriaError('LIMIT_EXCEEDED', `"limit" cannot be greater than ${maxLimit}`);
    }
    return {
      kind: 'offset',
      limit: requested ?? defaultLimit ?? maxLimit ?? null,
      offset: pagination?.offset ?? 0,
    };
  };

  const build = (nodes: Required<CriteriaNodes>): Criteria<T> =>
    Criteria.fromNodes<T>({
      filter: nodes.filter === null ? null : coerceFilter(nodes.filter),
      order: nodes.order.map((item) => {
        if (!specOf(item.field).sortable) {
          throw new CriteriaError('NOT_SORTABLE', `Field "${item.field}" cannot be sorted`);
        }
        return item;
      }),
      pagination: limitPagination(nodes.pagination),
    });

  const schema: CriteriaSchema<T> = {
    parse: (input) => {
      if (!isRecord(input)) {
        throw new CriteriaError('INVALID_FORMAT', 'The criteria input must be an object');
      }
      return build(
        inputToNodes({ ...input, limit: toInteger(input.limit), offset: toInteger(input.offset) }),
      );
    },
    check: (criteria) =>
      build({
        filter: criteria.filter,
        order: criteria.order,
        pagination: criteria.pagination,
      }),
    fromUrl: (text) => Criteria.fromUrl<T>(text, schema),
  };
  return Object.freeze(schema);
}
