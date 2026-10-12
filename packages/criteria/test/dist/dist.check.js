'use strict';

function smoke(m) {
  return [
    [
      'MongoCriteriaConverter converts filters and pagination',
      () => {
        const criteria = new m.SearchCriteriaDto(
          new m.SimpleFilterDto('age', m.FilterOperator.GT, 18),
          undefined,
          new m.SearchPaginatorDto(2, 10),
        );
        return (
          JSON.stringify(new m.MongoCriteriaConverter().convert(criteria)) ===
          JSON.stringify({ filter: { age: { $gt: 18 } }, sort: {}, skip: 10, limit: 10 })
        );
      },
    ],
  ];
}

module.exports = { smoke };
