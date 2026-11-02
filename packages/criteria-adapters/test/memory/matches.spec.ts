import { describe, expect, it } from 'vitest';
import { Criteria } from '@archi-code/ddd/domain';
import type { FilterNode, TextOperator } from '@archi-code/ddd/domain';
import { matches, matchesFilter } from '../../src/memory/matches';
import {
  ContractName,
  ContractRecord,
  createContractRecords,
} from '../contract/contract-documents';

interface Item {
  name?: string | number | null;
  age?: number | string | null;
  when?: Date | string;
  tags?: string[] | string;
}

function check(item: Item, filter: FilterNode): boolean {
  return matchesFilter(item, Criteria.fromNodes({ filter }).filter);
}

describe('matchesFilter', () => {
  it('matches everything without a filter', () => {
    expect(matchesFilter({}, null)).toBe(true);
  });

  it('matches an aggregate through the primitives of its value objects', () => {
    const [ana, maria] = createContractRecords();
    const criteria = Criteria.create<ContractRecord>({ where: { name: new ContractName('Ana') } });
    expect(matches(ana, criteria)).toBe(true);
    expect(matches(maria, criteria)).toBe(false);
    expect(matches(maria, Criteria.create<ContractRecord>())).toBe(true);
  });

  it('compares only values of the same type', () => {
    const gt: FilterNode = { kind: 'compare', field: 'age', operator: 'gt', value: 10 };
    expect(check({ age: 11 }, gt)).toBe(true);
    expect(check({ age: '11' }, gt)).toBe(false);
    expect(check({ age: null }, gt)).toBe(false);
    expect(check({}, gt)).toBe(false);
    const after: FilterNode = {
      kind: 'compare',
      field: 'when',
      operator: 'gt',
      value: new Date(5),
    };
    expect(check({ when: new Date(6) }, after)).toBe(true);
    expect(check({ when: '1970-01-02' }, after)).toBe(false);
  });

  it('covers every comparison operator', () => {
    const at = (operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte', age: number) =>
      check({ age }, { kind: 'compare', field: 'age', operator, value: 10 });
    expect([
      at('eq', 10),
      at('ne', 10),
      at('gt', 10),
      at('gte', 10),
      at('lt', 10),
      at('lte', 10),
    ]).toEqual([true, false, false, true, false, true]);
    expect([at('lt', 9), at('lte', 11)]).toEqual([true, false]);
  });

  it('checks text only on strings', () => {
    const contains: FilterNode = {
      kind: 'text',
      field: 'name',
      operator: 'contains',
      value: 'B',
      caseSensitive: false,
    };
    expect(check({ name: 'abc' }, contains)).toBe(true);
    expect(check({ name: 12 }, contains)).toBe(false);
  });

  it.each<[TextOperator, boolean, string, string, boolean]>([
    ['contains', true, 'a.b(c)', '.b(', true],
    ['contains', true, 'ABC', 'b', false],
    ['startsWith', true, 'Abc', 'Ab', true],
    ['startsWith', true, 'Abc', 'ab', false],
    ['endsWith', true, 'Abc', 'bc', true],
    ['endsWith', true, 'Abc', 'BC', false],
    ['contains', false, 'x[a-z]*y', '[A-Z]*', true],
    ['startsWith', false, 'ωmega', '\u03A9', true],
    ['startsWith', false, 'xωmega', '\u03A9', false],
    ['endsWith', false, 'value$', 'E$', true],
    ['endsWith', false, 'value$x', 'E$', false],
    ['startsWith', false, '\u212A', 'k', true],
    ['startsWith', false, '\u0130stanbul', 'i\u0307', false],
    ['contains', false, 'stra\u00DFe', 'SS', false],
  ])(
    '%s (case sensitive: %s) on %j for %j is %s',
    (operator, caseSensitive, name, value, expected) => {
      const node: FilterNode = { kind: 'text', field: 'name', operator, value, caseSensitive };
      expect(check({ name }, node)).toBe(expected);
      expect(check({ name }, node)).toBe(expected);
    },
  );

  it('checks list operators only on lists', () => {
    const has: FilterNode = { kind: 'arrayContains', field: 'tags', match: 'some', values: ['a'] };
    const empty: FilterNode = { kind: 'arrayEmpty', field: 'tags', value: false };
    expect(check({ tags: ['a'] }, has)).toBe(true);
    expect(check({ tags: 'a' }, has)).toBe(false);
    expect(check({ tags: 'a' }, empty)).toBe(false);
  });

  it('reads nested fields through missing and scalar parents', () => {
    const city: FilterNode = { kind: 'isNull', field: 'address.city', value: true };
    expect(matchesFilter({ address: 'none' }, city)).toBe(true);
    expect(matchesFilter({ address: { city: 'x' } }, city)).toBe(false);
  });
});
