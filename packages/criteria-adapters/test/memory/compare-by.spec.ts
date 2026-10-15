import { describe, expect, it } from '@jest/globals';
import { compareBy } from '../../src/memory/compare-by';

describe('compareBy', () => {
  it('sorts by each field in turn and puts nulls first ascending, last descending', () => {
    const rows = [
      { id: 1, group: 'b', score: 2 },
      { id: 2, group: 'a', score: null },
      { id: 3, group: 'a', score: 5 },
      { id: 4, group: 'b', score: 9 },
    ];
    const ids = (order: Parameters<typeof compareBy>[0]) =>
      [...rows].sort(compareBy(order)).map((row) => row.id);
    expect(
      ids([
        { field: 'group', direction: 'asc' },
        { field: 'score', direction: 'desc' },
      ]),
    ).toEqual([3, 2, 4, 1]);
    expect(ids([{ field: 'score', direction: 'asc' }])).toEqual([2, 1, 3, 4]);
    expect(ids([])).toEqual([1, 2, 3, 4]);
  });
});
