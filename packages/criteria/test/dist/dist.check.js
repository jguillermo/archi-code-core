'use strict';

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
            restored.filter.filters[1].value instanceof Date) ||
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
      'runCriteriaContract reports the cases an adapter fails',
      async () => {
        const failures = await m.runCriteriaContract({
          setup: () => undefined,
          search: () => ({ items: [] }),
        });
        return failures.length === m.CRITERIA_CONTRACT_CASES.length || `${failures.length}`;
      },
    ],
  ];
}

module.exports = { smoke };
