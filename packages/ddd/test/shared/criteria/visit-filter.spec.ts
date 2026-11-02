import { describe, expect, it } from 'vitest';
import { Criteria } from '../../../src/shared/criteria/criteria';
import { CriteriaError } from '../../../src/shared/criteria/criteria-error';
import { FilterNode } from '../../../src/shared/criteria/filter-node';
import { FilterVisitor, visitFilter } from '../../../src/shared/criteria/visit-filter';
import { User, UserAge, UserName, UserTag } from './support/user';

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
    const age = (value: number): UserAge => new UserAge(value);
    const criteria = Criteria.create<User>({
      where: {
        age: { gt: age(1), between: [age(1), age(2)], in: [age(1)], nin: [age(2)], isNull: false },
        name: { contains: 'a' },
        tags: { has: new UserTag('x'), isEmpty: false },
        OR: [{ 'address.city': null }, { name: new UserName('2') }],
        NOT: { name: new UserName('3') },
      },
    });
    expect(visitFilter(criteria.filter as FilterNode, describeNode)).toBe(
      '((age gt 1 and age between and age in and age notIn and age isNull) and name contains and (tags some and tags empty) and (address.city isNull or name eq 2) and not name eq 3)',
    );
  });

  it('throws on an unknown kind', () => {
    expect(() => visitFilter({ kind: 'xor' } as never, describeNode)).toThrow(CriteriaError);
  });
});
