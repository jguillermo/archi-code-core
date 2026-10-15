import { describe, expect, it } from '@jest/globals';
import { Criteria } from '../src/criteria';
import { CriteriaError } from '../src/criteria-error';
import { FilterNode } from '../src/filter-node';
import { FilterVisitor, visitFilter } from '../src/visit-filter';
import { UserPrimitives } from './support/user';

const describeNode: FilterVisitor<string> = {
  compare: (node) => `${node.field} ${node.operator} ${String(node.value)}`,
  between: (node) => `${node.field} between`,
  in: (node) => `${node.field} in`,
  notIn: (node) => `${node.field} notIn`,
  text: (node) => `${node.field} ${node.operator}`,
  isNull: (node) => `${node.field} isNull`,
  arrayContains: (node) => `${node.field} ${node.match}`,
  arrayEmpty: (node) => `${node.field} empty`,
  and: (node) => `(${node.filters.map((child) => visitFilter(child, describeNode)).join(' and ')})`,
  or: (node) => `(${node.filters.map((child) => visitFilter(child, describeNode)).join(' or ')})`,
  not: (node) => `not ${visitFilter(node.filter, describeNode)}`,
};

describe('visitFilter', () => {
  it('calls the method of each kind', () => {
    const criteria = Criteria.create<UserPrimitives>({
      where: {
        age: { gt: 1, between: [1, 2], in: [1], nin: [2], isNull: false },
        name: { contains: 'a' },
        tags: { has: 'x', isEmpty: false },
        OR: [{ id: '1' }, { id: '2' }],
        NOT: { id: '3' },
      },
    });
    expect(visitFilter(criteria.filter as FilterNode, describeNode)).toBe(
      '((age gt 1 and age between and age in and age notIn and age isNull) and name contains and (tags some and tags empty) and (id eq 1 or id eq 2) and not id eq 3)',
    );
  });

  it('throws on an unknown kind', () => {
    expect(() => visitFilter({ kind: 'xor' } as never, describeNode)).toThrow(CriteriaError);
  });
});
