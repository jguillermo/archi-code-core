'use strict';

const nodeBuild = () => require('../../dist/cjs/index.js');

const URL_CRITERIA = {
  where: { name: { startsWith: 'Ana' }, createdAt: { gte: new Date(0) } },
  orderBy: { name: 'asc' },
  limit: 5,
};

function smoke(m) {
  return [
    [
      'Criteria builds typed filters and survives the URL round trip',
      () => {
        const criteria = m.Criteria.create({
          where: { status: 'active', createdAt: { gt: new Date(0) } },
          orderBy: { name: 'asc' },
          limit: 10,
        });
        const restored = m.Criteria.fromUrl(criteria.toUrl());
        return (
          (/^[A-Za-z0-9_-]+$/.test(criteria.toUrl()) &&
            restored.equals(criteria) &&
            m.isDate(restored.filter.filters[1].value)) ||
          `unexpected criteria ${JSON.stringify(restored)}`
        );
      },
    ],
    [
      'defineCriteriaSchema converts input and rejects unknown fields',
      () => {
        const schema = m.defineCriteriaSchema({ fields: { age: 'number' }, maxLimit: 50 });
        const criteria = schema.parse({ where: { age: { gte: '18' } } });
        let code = null;
        try {
          schema.parse({ where: { password: 'x' } });
        } catch (error) {
          code = error instanceof m.CriteriaError ? error.code : 'OTHER';
        }
        return (
          (criteria.filter.value === 18 &&
            criteria.pagination.limit === 50 &&
            code === 'UNKNOWN_FIELD') ||
          `unexpected schema result ${JSON.stringify(criteria)} ${code}`
        );
      },
    ],
    [
      'fromUrl rejects deep nesting with a CriteriaError',
      () => {
        const levels = 5000;
        const json = `{"v":1,"f":${'["not",'.repeat(levels)}["eq","id","x"]${']'.repeat(levels)}}`;
        const text = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        try {
          m.Criteria.fromJSON(JSON.parse(json));
          return 'deep JSON was accepted';
        } catch (error) {
          if (!(error instanceof m.CriteriaError) || error.code !== 'LIMIT_EXCEEDED') {
            return `unexpected error ${error}`;
          }
        }
        try {
          m.Criteria.fromUrl(text);
          return 'long URL text was accepted';
        } catch (error) {
          return (
            (error instanceof m.CriteriaError && error.code === 'LIMIT_EXCEEDED') || `${error}`
          );
        }
      },
    ],
  ];
}

function crossBuild(cjs, esm) {
  return [
    [
      'CriteriaError from one build is an instance of the other',
      () =>
        (new esm.CriteriaError('INVALID_FIELD', 'x') instanceof cjs.CriteriaError &&
          new cjs.CriteriaError('INVALID_FIELD', 'x') instanceof esm.CriteriaError &&
          !(new Error('x') instanceof cjs.CriteriaError)) ||
        'CriteriaError is not recognized across builds',
    ],
  ];
}

const STRICT_CSP = "default-src 'self'; script-src 'self'";

async function everyFeatureInThePage(entry) {
  const m = await import(entry);
  const schema = m.defineCriteriaSchema({
    fields: { id: 'string', name: 'string', createdAt: 'date' },
    maxLimit: 20,
    tiebreaker: 'id',
  });
  const criteria = schema.parse({
    where: { name: { contains: '\u03A9', mode: 'insensitive' }, createdAt: { gte: '2024-01-01' } },
    orderBy: { name: 'desc' },
  });
  const restored = schema.fromUrl(criteria.toUrl());
  if (!restored.equals(criteria)) return `round trip ${JSON.stringify(restored.toJSON())}`;
  if (restored.order[1].field !== 'id') return `order ${JSON.stringify(restored.order)}`;
  const date = restored.filter.filters[1].value;
  if (!(date instanceof Date) || date.toISOString() !== '2024-01-01T00:00:00.000Z') {
    return `date ${String(date)}`;
  }
  try {
    date.setTime(0);
    return 'a criteria date changed';
  } catch (error) {
    if (!(error instanceof TypeError)) return `setTime threw ${error}`;
  }
  if (m.compareText('\uFF71', '\u{1F600}') !== -1) return 'text is not in code point order';
  const levels = 3000;
  const json = `{"v":1,"f":${'["not",'.repeat(levels)}["eq","id","x"]${']'.repeat(levels)}}`;
  try {
    m.Criteria.fromJSON(JSON.parse(json));
    return 'deep nesting was accepted';
  } catch (error) {
    return (error instanceof m.CriteriaError && error.code === 'LIMIT_EXCEEDED') || `${error}`;
  }
}

function browser() {
  return [
    ['builds, sends, reads and checks criteria in a page', everyFeatureInThePage],
    ['works under a strict CSP without eval', everyFeatureInThePage, { csp: STRICT_CSP }],
    [
      'builds the same URL text as Node and reads the text Node builds',
      async ({ entry, input }) => {
        const m = await import(entry);
        const criteria = m.Criteria.create(input.criteria);
        return {
          text: criteria.toUrl(),
          readsNodeText: m.Criteria.fromUrl(input.nodeText).equals(criteria),
        };
      },
      {
        input: () => ({
          criteria: URL_CRITERIA,
          nodeText: nodeBuild().Criteria.create(URL_CRITERIA).toUrl(),
        }),
        verify: (result, input) =>
          (result.text === input.nodeText && result.readsNodeText) ||
          `web ${result.text} differs from Node ${input.nodeText}`,
      },
    ],
  ];
}

module.exports = { smoke, crossBuild, browser };
