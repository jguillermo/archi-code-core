import { Criteria, CriteriaChecker } from './criteria';
import { CriteriaError, quote } from './criteria-error';
import { CriteriaNodes, inputToNodes } from './criteria-input';
import { assertWithinLimits, CriteriaLimits, resolveLimits } from './criteria-limits';
import { CriteriaScalar, isRecord } from './criteria-value';
import { parseDate, parseNumber } from './parse-scalar';
import { assertField } from './field-name';
import { FieldNode, FilterNode } from './filter-node';
import { OrderNode } from './order';
import { Pagination } from './pagination';
import { CriteriaAggregate, CriteriaValueObject, Path, PathValue, SortablePath } from './path';
import { ValueKind, ValueObjectBrand } from '../value-object/value-object-brand';
import { visitFilter } from './visit-filter';

export type CriteriaFieldKind = ValueKind;
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

export type ValueObjectClass<V> = abstract new (value: any) => NonNullable<V>;

export interface CriteriaFieldSpec<C = ValueObjectClass<CriteriaValueObject>> {
  readonly type: C;
  readonly operators?: readonly FilterOperatorName[];
  readonly sortable?: boolean;
}

export type CriteriaSchemaFields<T> = {
  readonly [P in Path<T>]?:
    | ValueObjectClass<PathValue<T, P>>
    | CriteriaFieldSpec<ValueObjectClass<PathValue<T, P>>>;
};

export interface CriteriaSchemaDefinition<T extends CriteriaAggregate> {
  readonly fields: CriteriaSchemaFields<T>;
  readonly maxLimit: number;
  readonly defaultLimit?: number;
  readonly maxOffset?: number;
  readonly limits?: Partial<CriteriaLimits>;
  readonly tiebreaker?: SortablePath<T>;
}

export interface CriteriaSchema<T extends CriteriaAggregate> extends CriteriaChecker<T> {
  parse(input: unknown): Criteria<T>;
  fromUrl(text: string): Criteria<T>;
}

type ValueObjectConstructor = new (value: unknown) => CriteriaValueObject;

interface ResolvedField {
  readonly type: ValueObjectConstructor;
  readonly kind: CriteriaFieldKind;
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

const OPERATORS_BY_KIND: Record<CriteriaFieldKind, readonly FilterOperatorName[]> = {
  string: [...RANGE_OPERATORS, 'contains', 'startsWith', 'endsWith'],
  number: RANGE_OPERATORS,
  date: RANGE_OPERATORS,
  boolean: ['eq', 'ne', 'isNull'],
  enum: ['eq', 'ne', 'in', 'nin', 'isNull'],
  array: ['has', 'hasSome', 'hasEvery', 'isEmpty', 'isNull'],
};

function resolveField(field: string, spec: unknown): ResolvedField {
  const resolved: unknown = typeof spec === 'function' ? { type: spec } : spec;
  if (!isRecord(resolved) || typeof resolved.type !== 'function') {
    throw new CriteriaError('INVALID_SCHEMA', `Field "${quote(field)}" needs a value object class`);
  }
  const kind = ValueObjectBrand.kindOf(resolved.type);
  if (kind === null) {
    throw new CriteriaError(
      'INVALID_SCHEMA',
      `Field "${quote(field)}" needs a string, number, boolean, date, enum or array value object`,
    );
  }
  const allowed = OPERATORS_BY_KIND[kind];
  const operators = (resolved.operators ?? allowed) as readonly FilterOperatorName[];
  const invalid = operators.find((operator) => !allowed.includes(operator));
  if (invalid !== undefined) {
    throw new CriteriaError(
      'INVALID_SCHEMA',
      `Operator "${quote(invalid)}" does not apply to field "${quote(field)}" of kind ${kind}`,
    );
  }
  const sortable = resolved.sortable ?? kind !== 'array';
  if (sortable === true && kind === 'array') {
    throw new CriteriaError(
      'INVALID_SCHEMA',
      `Field "${quote(field)}" is a list and cannot be sorted`,
    );
  }
  return {
    type: resolved.type as ValueObjectConstructor,
    kind,
    operators,
    sortable: sortable === true,
  };
}

const DEFAULT_MAX_OFFSET = 10_000;

function assertLimit(value: unknown, name: string): void {
  if (value !== undefined && !(Number.isSafeInteger(value) && (value as number) >= 1)) {
    throw new CriteriaError('INVALID_SCHEMA', `"${quote(name)}" must be an integer from 1`);
  }
}

const NOT_PARSED = Symbol('not parsed');

function parseInput(value: unknown, kind: CriteriaFieldKind): unknown {
  switch (kind) {
    case 'string':
      return typeof value === 'string' ? value : NOT_PARSED;
    case 'number':
      return parseNumber(value) ?? NOT_PARSED;
    case 'boolean':
      if (typeof value === 'boolean') {
        return value;
      }
      return value === 'true' || value === 'false' ? value === 'true' : NOT_PARSED;
    case 'date':
      return parseDate(value) ?? NOT_PARSED;
    default:
      return value;
  }
}

function buildValue(field: ResolvedField, input: unknown, name: string): unknown {
  try {
    return new field.type(input).value;
  } catch (cause) {
    throw new CriteriaError(
      'INVALID_VALUE',
      `Field "${quote(name)}" needs a valid ${field.type.name} value`,
      { cause },
    );
  }
}

function coerceScalar(value: unknown, field: ResolvedField, name: string): CriteriaScalar {
  if (field.kind === 'array') {
    return (buildValue(field, [value], name) as CriteriaScalar[])[0];
  }
  const parsed = parseInput(value, field.kind);
  if (parsed === NOT_PARSED) {
    throw new CriteriaError('INVALID_VALUE', `Field "${quote(name)}" needs a ${field.kind} value`);
  }
  return buildValue(field, parsed, name) as CriteriaScalar;
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

export function defineCriteriaSchema<T extends CriteriaAggregate>(
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
  const maxOffset = definition.maxOffset ?? DEFAULT_MAX_OFFSET;
  if (maxLimit === undefined) {
    throw new CriteriaError('INVALID_SCHEMA', 'The schema needs "maxLimit"');
  }
  assertLimit(maxLimit, 'maxLimit');
  assertLimit(defaultLimit, 'defaultLimit');
  assertLimit(maxOffset, 'maxOffset');
  const limits = resolveLimits(definition.limits);
  const tiebreaker: unknown = definition.tiebreaker;
  if (
    tiebreaker !== undefined &&
    !(typeof tiebreaker === 'string' && fields.get(tiebreaker)?.sortable)
  ) {
    throw new CriteriaError(
      'INVALID_SCHEMA',
      '"tiebreaker" must be a sortable field of the schema',
    );
  }
  if (defaultLimit !== undefined && defaultLimit > maxLimit) {
    throw new CriteriaError('INVALID_SCHEMA', '"defaultLimit" cannot be greater than "maxLimit"');
  }

  const specOf = (field: string): ResolvedField => {
    const spec = fields.get(field);
    if (spec === undefined) {
      throw new CriteriaError(
        'UNKNOWN_FIELD',
        `Field "${quote(field)}" cannot be used in a search`,
      );
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
        `Operator "${quote(operator)}" is not allowed on field "${quote(node.field)}"`,
      );
    }
    const coerce = (value: unknown): CriteriaScalar => coerceScalar(value, spec, node.field);
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
    if (requested !== null && requested > maxLimit) {
      throw new CriteriaError('LIMIT_EXCEEDED', `"limit" cannot be greater than ${maxLimit}`);
    }
    const offset = pagination?.offset ?? 0;
    if (offset > maxOffset) {
      throw new CriteriaError('LIMIT_EXCEEDED', `"offset" cannot be greater than ${maxOffset}`);
    }
    return { kind: 'offset', limit: requested ?? defaultLimit ?? maxLimit, offset };
  };

  const withTiebreaker = (order: readonly OrderNode[]): readonly OrderNode[] =>
    typeof tiebreaker === 'string' && !order.some((item) => item.field === tiebreaker)
      ? [...order, { field: tiebreaker, direction: 'asc' }]
      : order;

  const build = (nodes: Required<CriteriaNodes>): Criteria<T> => {
    assertWithinLimits(nodes.filter, nodes.order, limits);
    return Criteria.fromNodes<T>({
      filter: nodes.filter === null ? null : coerceFilter(nodes.filter),
      order: withTiebreaker(
        nodes.order.map((item) => {
          if (!specOf(item.field).sortable) {
            throw new CriteriaError(
              'NOT_SORTABLE',
              `Field "${quote(item.field)}" cannot be sorted`,
            );
          }
          return item;
        }),
      ),
      pagination: limitPagination(nodes.pagination),
    });
  };

  const schema: CriteriaSchema<T> = {
    limits,
    parse: (input) => {
      if (!isRecord(input)) {
        throw new CriteriaError('INVALID_FORMAT', 'The criteria input must be an object');
      }
      return build(
        inputToNodes(
          { ...input, limit: toInteger(input.limit), offset: toInteger(input.offset) },
          'primitives',
        ),
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
