# Import

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

```ts
import {
  AbstractType, AggregateRepository, AggregateRoot, ArrayType, BooleanType, Composite, CreatedAt,
  Criteria, CriteriaError, DateType, defineCriteriaSchema, DomainException, DomainExceptionCode,
  Entity, EnumType, EventBase, IdType, InvalidEventDefinitionException, JsonType, NumberType,
  Required, RequiredValueException, Specification, StringSanitizer, StringType,
  TypePrimitiveException, UpdatedAt, UuidType, ValidationException,
} from '@archi-code/ddd/domain';
import {
  compareText, compareValues, DEFAULT_CRITERIA_LIMITS, isDate, mapField, valuesEqual, visitFilter,
} from '@archi-code/ddd/domain';
import type {
  AggregateFinder, AggregateRemover, AggregateSaver, AggregateSearcher, CriteriaAggregate,
  CriteriaDocument, EntityId, EventClass, EventMetadata, JsonTypeValue, PrimitiveTypes,
  SatisfiedBy, SearchOptions, SearchResult, SerializedEvent, ValidationIssue,
} from '@archi-code/ddd/domain';
import {
  AggregateNotFoundException, ApplicationException, ApplicationExceptionCode,
  ConcurrencyException, EventListener, ListensTo, NotAllowedException, UnexpectedErrorException,
  UseCase, ValueObjectBuilder,
} from '@archi-code/ddd/application';
import type {
  EventBus, ListenerSubscription, LogContext, Logger, LogLevel,
} from '@archi-code/ddd/application';
import {
  ConsoleLogger, DomainEventBus, EventDeliveryException, EventRegistry, ExceptionClassifier, ExceptionKind,
  IndexedDbInspector, IndexedDbTable, InfrastructureException, InfrastructureExceptionCode,
  InMemoryEventChannel, InMemoryLogger, InternalErrorException, SilentLogger,
  UnknownEventException,
} from '@archi-code/ddd/infrastructure';
import type {
  ChannelHandler, ChannelSubscription, EventChannel, Subscription,
} from '@archi-code/ddd/infrastructure';
import { Validations } from '@archi-code/validation';
```

- Each layer exports its own exceptions and code enum; no `/exceptions` subpath; the exception
  base class is internal.
- `IndexedDbTable`: only IndexedDB repository adapters and read-model stores.
  `IndexedDbInspector`: only diagnostics, never a repository.
- The second `/domain` statement holds the criteria helpers that criteria adapters use
  (`@archi-code/criteria-adapters` already wraps them); application code never needs them.
- CommonJS works too: `const { Required, StringType } = require('@archi-code/ddd/domain');`
