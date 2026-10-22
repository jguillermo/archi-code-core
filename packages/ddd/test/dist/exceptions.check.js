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
    [
      'the classifier tells entry points the kind of every failure',
      () => {
        const kinds = [
          new m.AggregateNotFoundException('Order', ORDER_ID),
          new m.NotAllowedException('cus-luis cannot cancel'),
          new m.ConcurrencyException('Order', ORDER_ID, 3),
          new m.RequiredValueException('Email', ''),
          new m.DomainException('Order already shipped', ['ORD001']),
          new m.ApplicationException('Email already used', ['USR001']),
          new m.InternalErrorException('password=secret'),
          new Error('disk full'),
        ].map((error) => m.ExceptionClassifier.classify(error));
        return (
          kinds.join() ===
            [
              m.ExceptionKind.NotFound,
              m.ExceptionKind.NotAllowed,
              m.ExceptionKind.Conflict,
              m.ExceptionKind.Malformed,
              m.ExceptionKind.Invalid,
              m.ExceptionKind.Rejected,
              m.ExceptionKind.Internal,
              m.ExceptionKind.Internal,
            ].join() || `unexpected kinds ${kinds.join()}`
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
        const delivery = new esm.EventDeliveryException('OrderPlaced', [], 0);
        return (
          (notFound instanceof cjs.AggregateNotFoundException &&
            notFound instanceof cjs.ApplicationException &&
            !(notFound instanceof cjs.DomainException) &&
            notFound instanceof cjs.AbstractException &&
            !(notFound instanceof cjs.ValidationException) &&
            !(notFound instanceof cjs.InfrastructureException) &&
            invalid instanceof esm.ValidationException &&
            invalid instanceof esm.DomainException &&
            conflict instanceof cjs.ApplicationException &&
            delivery instanceof cjs.EventDeliveryException &&
            delivery instanceof cjs.InfrastructureException) ||
          'an exception of one build is not recognized by the other'
        );
      },
    ],
    [
      'the classifier of one build classifies exceptions thrown by the other',
      () => {
        const invalid = new esm.ValidationException([
          { field: 'email', message: 'Email: Value does not satisfy isEmail' },
        ]);
        const notFound = new cjs.AggregateNotFoundException('Order', ORDER_ID);
        return (
          (cjs.ExceptionClassifier.classify(invalid) === 'invalid' &&
            esm.ExceptionClassifier.classify(notFound) === 'not_found') ||
          'a classifier does not recognize the exceptions of the other build'
        );
      },
    ],
  ];
}

module.exports = { smoke, crossBuild };
