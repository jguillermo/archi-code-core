'use strict';

const ORDER_ID = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

function smoke(m) {
  return [
    [
      'exceptions carry their codes, description and cause',
      () => {
        const cause = new Error('connection reset');
        const internal = new m.InternalErrorException('saving order', { cause });
        const notFound = new m.AggregateNotFoundException('Order', ORDER_ID);
        return (
          (internal.cause === cause &&
            internal.code === m.ExceptionCode.InternalError &&
            notFound.code === 'APP002' &&
            notFound.description ===
              'Application Exception (APP000), Aggregate Not Found (APP002)' &&
            notFound instanceof m.ApplicationException &&
            new m.NotAllowedException('cus-luis cannot cancel').code === 'APP003' &&
            notFound instanceof m.AbstractException &&
            JSON.parse(JSON.stringify(notFound)).message ===
              `Order with ID ${ORDER_ID} not found.`) ||
          'unexpected exception shape'
        );
      },
    ],
    [
      'a custom exception keeps its layer and code',
      () => {
        class OrderShippedException extends m.DomainException {
          constructor(id) {
            super(`Order ${id} is already shipped`, ['ORD001']);
          }
        }
        const error = new OrderShippedException(ORDER_ID);
        return (
          (error.code === 'ORD001' &&
            error instanceof m.DomainException &&
            !(error instanceof m.ApplicationException)) ||
          'unexpected custom exception'
        );
      },
    ],
  ];
}

function crossBuild(cjs, esm) {
  return [
    [
      'recognize exceptions thrown by the other build',
      () => {
        const notFound = new esm.AggregateNotFoundException('Order', ORDER_ID);
        const invalid = new cjs.ValidationException([
          { field: 'email', message: 'Email: Value does not satisfy isEmail' },
        ]);
        const conflict = new esm.ConcurrencyException('Order', ORDER_ID, 3);
        return (
          (notFound instanceof cjs.AggregateNotFoundException &&
            notFound instanceof cjs.ApplicationException &&
            !(notFound instanceof cjs.DomainException) &&
            notFound instanceof cjs.AbstractException &&
            !(notFound instanceof cjs.ValidationException) &&
            !(notFound instanceof cjs.InfrastructureException) &&
            invalid instanceof esm.ValidationException &&
            invalid instanceof esm.DomainException &&
            conflict instanceof cjs.ApplicationException) ||
          'an exception of one build is not recognized by the other'
        );
      },
    ],
  ];
}

module.exports = { smoke, crossBuild };
