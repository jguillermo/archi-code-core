import { describe, expect, it } from '@jest/globals';
import { JsonCompare } from './json-commpare';
import { universalToString } from '@code-core/common';

function s(data: any, reference: any, errors: string[] = []) {
  const diff = JsonCompare.strict(data, reference);
  it(`compare strict: ${universalToString(data)} eq ${universalToString(reference)}`, () => {
    expect(errors).toEqual(diff);
  });
}

function _(include: any, reference: any, errors: string[] = []) {
  const diff = JsonCompare.include(include, reference);
  it(`compare include: ${universalToString(include)} in ${universalToString(reference)}`, () => {
    expect(errors).toEqual(diff);
  });
}

describe('JsonCompare', () => {
  describe('primitives', () => {
    describe('strict', () => {
      describe('correct', () => {
        s(1, 1);
        s(false, false);
        s('1', '1');
        s('text', 'text');
      });
      describe('error', () => {
        s(1, 2, ['1 -> 2']);
        s(false, true, ['false -> true']);
        s('1a', '2a', ['1a -> 2a']);
        s('text', 'text2', ['text -> text2']);
      });
    });
    describe('include', () => {
      describe('correct', () => {
        _(1, 1);
        _(false, false);
        _('1', '1');
        _('text', 'text');
      });
      describe('error', () => {
        _(1, 2, ['1 -> 2']);
        _(false, true, ['false -> true']);
        _('1', '2', ['1 -> 2']);
        _('text', 'text2', ['text -> text2']);
      });
    });
  });

  describe('Objects', () => {
    describe('strict ', () => {
      describe('correct', () => {
        s({ a: '1', b: 1 }, { a: '1', b: 1 });
        s({ a: 1, b: 1 }, { a: 1, b: 1 });
        s({ a: 1, b: 1 }, { a: 1, b: 1 });
        s({ a: 1, b: 1, c: { ca: 1, cb: 1 } }, { a: 1, b: 1, c: { ca: 1, cb: 1 } });
      });
      describe('error', () => {
        s({ a: 1, b: 1 }, { a: 1, b: 2 }, ['b: 1 -> 2']);
        s({ a: 1, b: { ba: 2 } }, { a: 1, b: 1 }, ['b: must not be an object; it must be 1']);
        s({ a: 1, b: 1 }, { a: 1, b: { ba: 2 } }, ['b: 1 -> {"ba":2}']);
        s({ a: 1, b: 1, c: { ca: 1, cb: 1 } }, { a: 1, b: 1, c: { ca: 1, cb: 2 } }, [
          'c.cb: 1 -> 2',
        ]);
        s({ a: 1, b: 1, c: { ca: 1, cb: 1 } }, { a: 1, b: 1, c: { ca: 1 } }, [
          'c.cb: extra key found',
        ]);

        s({ a: '1' }, { a: '1', b: 1 }, ['b: key not found']);
        s({ a: 1 }, { a: 1, b: 1 }, ['b: key not found']);

        s({ a: 1 }, { a: 1, b: 1 }, ['b: key not found']); //key not found
        s({ a: 1, c: { cb: 1 } }, { a: 1, b: 1, c: { ca: 1, cb: 1 } }, [
          'b: key not found',
          'c.ca: key not found',
        ]); //'c.ca: key not found', 'b: key not found'
      });
    });
    describe('include', () => {
      describe('correct', () => {
        _({ a: 1 }, { a: 1, b: 1 });
        _({ a: 1, c: { cb: 1 } }, { a: 1, b: 1, c: { ca: 1, cb: 1 } });
        _({ a: '1' }, { a: '1', b: 1 });
        _({ a: 1 }, { a: 1, b: 1 });
      });
      describe('error', () => {
        _({ a: 1, b: 1 }, { a: 1, b: 2 }, ['b: 1 -> 2']);
        _({ a: 1, b: 1, c: { ca: 1, cb: 1 } }, { a: 1, b: 1, c: { ca: 1, cb: 2 } }, [
          'c.cb: 1 -> 2',
        ]);
        _({ a: 1, b: 1, c: { ca: 1, cb: 1 } }, { a: 1, b: 1, c: 1 }, [
          'c: must not be an object; it must be 1',
        ]);
        _({ a: 1, b: 1, c: { ca: 1, cb: 1 } }, { a: 1, b: 1, c: { ca: 1 } }, [
          'c.cb: extra key found',
        ]);
      });
    });
  });

  describe('array', () => {
    describe('strict ', () => {
      describe('correct', () => {
        s([1], [1]);
        s([1, 2], [1, 2]);
        s([1, 2, [3]], [1, 2, [3]]);
        s([1, 2, [{ a: 1 }]], [1, 2, [{ a: 1 }]]);
        s([1, '2'], [1, '2']);
        s([1, '2', true], [1, '2', true]);
      });
      describe('error', () => {
        s([1], [1, 2], [': length of [1] is not equal to length of [1,2]']);
        s([1], [1, '2'], [': length of [1] is not equal to length of [1,"2"]']);
        s([1, '2'], [1, '2', true], [': length of [1,"2"] is not equal to length of [1,"2",true]']);
        s([1, 2, [3]], [1, 2, 3], ['[2]: must not be an array; it must be 3']);
        s([1, 2, 3], [1, 2, [3]], ['[2]: 3 -> [3]']);
        s([1, 2, [{ a: 1, b: 1 }]], [1, 2, [{ a: 1 }]], ['[2][0].b: extra key found']);
      });
    });
    describe('include', () => {
      describe('correct', () => {
        _([1], [1]);
        _([1], [1, 2]);
        _([1], [1, '2']);
        _([1, '2'], [1, '2', true]);

        _([{ a: 1, b: 1 }], [{ a: 1, b: 1 }]);
        _([{ a: 1, b: 1, c: { ca: 1, cb: 1 } }], [{ a: 1, b: 1, c: { ca: 1, cb: 1 } }]);
        _([{ a: 1, b: 1, c: [{ ca: 1, cb: 1 }] }], [{ a: 1, b: 1, c: [{ ca: 1, cb: 1 }] }]);
      });
      describe('error', () => {
        _([{ a: 1, b: 1 }], [{ a: 1, b: 2 }], ['[0].b: 1 -> 2']);
        _(
          [{ a: 1, b: 1, c: { ca: 1, cb: 1 } }],
          [{ a: 1, b: 1, c: { ca: 1, cb: 2 } }],
          ['[0].c.cb: 1 -> 2'],
        );
        _(
          [{ a: 1, b: 1, c: [{ ca: 1, cb: 1 }] }],
          [{ a: 1, b: 1, c: [{ ca: 1, cb: 2 }] }],
          ['[0].c[0].cb: 1 -> 2'],
        );
        _(
          [{ a: 1, b: 1, c: { ca: 1, cb: 1 } }],
          [{ a: 1, b: 1, c: { ca: 1 } }],
          ['[0].c.cb: extra key found'],
        );
        _(
          [{ a: 1, b: 1, c: [{ ca: 1, cb: 1 }] }],
          [{ a: 1, b: 1, c: [{ ca: 1 }] }],
          ['[0].c[0].cb: extra key found'],
        );
      });
    });
  });

  describe('values testing', () => {
    _(
      [
        {
          _id: 'UUID()',
          name: 'Name',
          description: 'Description',
          studentCount: 12,
          attemptType: 'test',
          attemptCount: 0,
          timeLimit: 20,
          teacher: {
            id: 'dc47ff49-90d0-4ae5-8c5d-7ff5ac8c5776',
            role: 'teacher',
            userName: 'teacher-demo',
            email: 'teacher-demo@mail.com',
            firstName: 'Teacher',
            lastName: 'Demo',
          },
          scene: {
            name: 'name',
            description: 'description',
            image: 'photo.png',
            scene: { a: 1, b: 1, c: { ca: 1, cb: 1 } },
          },
          author: 'dc47ff49-90d0-4ae5-8c5d-7ff5ac8c5776',
          tenant: '2504559e-6c28-4d78-8025-94f2714001c0',
        },
      ],
      [
        {
          _id: '42e05ee0-ace6-4565-b86a-ffdb0590341e',
          __v: 0,
          attemptCount: 0,
          attemptType: 'test',
          createAt: { $date: 1723531231695 },
          description: 'Description',
          endAt: { $date: 1672876800000 },
          name: 'Name',
          scene: {
            id: '4c8e015a-ae43-4c69-a349-badc7662fa29',
            name: 'name',
            description: 'description',
            image: 'photo.png',
            scene: { a: 1, b: 1, c: { ca: 1, cb: 1 } },
          },
          sceneId: '4c8e015a-ae43-4c69-a349-badc7662fa29',
          startAt: { $date: 1672531200000 },
          studentCount: 12,
          teacher: {
            id: 'dc47ff49-90d0-4ae5-8c5d-7ff5ac8c5776',
            role: 'teacher',
            userName: 'teacher-demo',
            email: 'teacher-demo@mail.com',
            firstName: 'Teacher',
            lastName: 'Demo',
            organizationId: '2504559e-6c28-4d78-8025-94f2714001c0',
          },
          timeLimit: 20,
          tutorialMode: false,
          author: 'dc47ff49-90d0-4ae5-8c5d-7ff5ac8c5776',
          tenant: '2504559e-6c28-4d78-8025-94f2714001c0',
        },
      ],
    );
  });
});
