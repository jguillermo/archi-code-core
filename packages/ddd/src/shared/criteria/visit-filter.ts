import { CriteriaError } from './criteria-error';
import {
  AndNode,
  ArrayContainsNode,
  ArrayEmptyNode,
  BetweenNode,
  CompareNode,
  FilterNode,
  InNode,
  IsNullNode,
  NotInNode,
  NotNode,
  OrNode,
  TextNode,
} from './filter-node';

export interface FilterVisitor<R> {
  compare(node: CompareNode): R;
  between(node: BetweenNode): R;
  in(node: InNode): R;
  notIn(node: NotInNode): R;
  text(node: TextNode): R;
  isNull(node: IsNullNode): R;
  arrayContains(node: ArrayContainsNode): R;
  arrayEmpty(node: ArrayEmptyNode): R;
  and(node: AndNode): R;
  or(node: OrNode): R;
  not(node: NotNode): R;
}

function unknownKind(node: never): never {
  throw new CriteriaError(
    'INVALID_OPERATOR',
    `Unknown filter kind "${String((node as { kind: unknown }).kind)}"`,
  );
}

export function visitFilter<R>(node: FilterNode, visitor: FilterVisitor<R>): R {
  switch (node.kind) {
    case 'compare':
      return visitor.compare(node);
    case 'between':
      return visitor.between(node);
    case 'in':
      return visitor.in(node);
    case 'notIn':
      return visitor.notIn(node);
    case 'text':
      return visitor.text(node);
    case 'isNull':
      return visitor.isNull(node);
    case 'arrayContains':
      return visitor.arrayContains(node);
    case 'arrayEmpty':
      return visitor.arrayEmpty(node);
    case 'and':
      return visitor.and(node);
    case 'or':
      return visitor.or(node);
    case 'not':
      return visitor.not(node);
    default:
      return unknownKind(node);
  }
}
