import { CriteriaScalar, RangeValue } from './criteria-value';

export type ComparisonOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
export type TextOperator = 'contains' | 'startsWith' | 'endsWith';
export type ArrayMatch = 'some' | 'every';

export interface CompareNode {
  readonly kind: 'compare';
  readonly field: string;
  readonly operator: ComparisonOperator;
  readonly value: CriteriaScalar;
}

export interface BetweenNode {
  readonly kind: 'between';
  readonly field: string;
  readonly min: RangeValue;
  readonly max: RangeValue;
}

export interface InNode {
  readonly kind: 'in';
  readonly field: string;
  readonly values: readonly CriteriaScalar[];
}

export interface NotInNode {
  readonly kind: 'notIn';
  readonly field: string;
  readonly values: readonly CriteriaScalar[];
}

export interface TextNode {
  readonly kind: 'text';
  readonly field: string;
  readonly operator: TextOperator;
  readonly value: string;
  readonly caseSensitive: boolean;
}

export interface IsNullNode {
  readonly kind: 'isNull';
  readonly field: string;
  readonly value: boolean;
}

export interface ArrayContainsNode {
  readonly kind: 'arrayContains';
  readonly field: string;
  readonly match: ArrayMatch;
  readonly values: readonly CriteriaScalar[];
}

export interface ArrayEmptyNode {
  readonly kind: 'arrayEmpty';
  readonly field: string;
  readonly value: boolean;
}

export interface AndNode {
  readonly kind: 'and';
  readonly filters: readonly FilterNode[];
}

export interface OrNode {
  readonly kind: 'or';
  readonly filters: readonly FilterNode[];
}

export interface NotNode {
  readonly kind: 'not';
  readonly filter: FilterNode;
}

export type FieldNode =
  | CompareNode
  | BetweenNode
  | InNode
  | NotInNode
  | TextNode
  | IsNullNode
  | ArrayContainsNode
  | ArrayEmptyNode;

export type FilterNode = FieldNode | AndNode | OrNode | NotNode;

export const COMPARISON_OPERATORS: readonly ComparisonOperator[] = [
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
];

export const TEXT_OPERATORS: readonly TextOperator[] = ['contains', 'startsWith', 'endsWith'];
