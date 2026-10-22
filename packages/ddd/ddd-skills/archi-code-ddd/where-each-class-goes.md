# Where each class goes

Part of the `archi-code-ddd` skill: read it only when that skill routes here.

| Class                                                        | Layer                                   | May depend on                                                                             | Never                                                                      |
| ------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Value object, composite                                      | domain                                  | other value objects, `@archi-code/validation`, exceptions                                 | mutate, know about storage or transport                                    |
| Aggregate root (`extends AggregateRoot`)                     | domain                                  | value objects, child entities, events; a domain service or loaded data as method argument | read a repository, publish, `new Date()`, services received by constructor |
| Child entity (`extends Entity`)                              | domain                                  | its local id, value objects, business methods the root calls                              | setters, being called from outside the root, loaded or saved on its own    |
| Domain event (`OrderPlaced`)                                 | domain                                  | primitives taken from value objects                                                       | behavior, value objects or the whole state in its payload                  |
| Repository contract (`AggregateFinder`…)                     | domain                                  | the aggregate                                                                             | business logic or queries, an all-in-one `Repository`                      |
| Domain service                                               | domain                                  | aggregates, value objects, specifications, repository contracts (to read), domain ports   | I/O code, transactions, publishing                                         |
| Domain port to another context or service (`ProductPricing`) | domain                                  | value objects                                                                             | remote DTOs, I/O code                                                      |
| Use case (`PlaceOrder`)                                      | application                             | domain, ports, exceptions                                                                 | import another use case or a listener, return an aggregate                 |
| Listener (`ReserveStockOnOrderPlaced`)                       | application                             | one use case (by constructor), the event                                                  | business rules, saving aggregates, calling several use cases               |
| Port (`EventBus`, `Clock`, `Logger`, your own) | application                             | domain types                                                                              | code                                                                       |
| Read query (`OrderSummaries`, `StaleOrders`)                 | application (interface), infrastructure | DTOs and ids, `@archi-code/criteria`                                                      | loading aggregates, repositories, business rules                           |
| Adapter (repository, event channel, ACL translator, logger provider) | infrastructure                          | domain, application, exceptions, drivers                                                  | business rules                                                             |
| Event wiring (`DomainEventBus`, `EventRegistry`, `EventChannel` port and its implementations) | infrastructure (composition root) | `@archi-code/ddd/infrastructure`, domain events, listeners                     | being seen by use cases (they only see `EventBus`) or listeners             |
| Entry point (controller, consumer, scheduler, CLI)           | interfaces                              | application, exceptions (`ExceptionClassifier`); domain types only if unavoidable         | business rules, repositories or other adapters                             |
| Composition root (`composition.ts`)                          | per context                             | everything                                                                                | being imported by any layer                                                |

- Dependencies only point inwards: the domain imports only `@archi-code/ddd/domain`,
  `@archi-code/ddd/exceptions` and `@archi-code/validation` (not "nothing external" as the suite
  says: these are the package convention); the application adds `@archi-code/ddd/application`;
  only infrastructure and the composition root import `@archi-code/ddd/infrastructure`; an entry
  point never does (it translates errors with `ExceptionClassifier` of `/exceptions`).
  Entry points (`interfaces/`: controllers, message consumers, schedulers, CLI) call use cases
  only. The composition root of each context is the only place that builds and connects everything
  (repositories, event channel, `DomainEventBus`, `EventRegistry`, listeners) and reads
  `process.env`. `DomainEventBus`, `EventRegistry` and the `EventChannel` port come from
  `@archi-code/ddd/infrastructure`; a use case sees only `EventBus` and a listener only
  `EventListener` + `@ListensTo`, both from `@archi-code/ddd/application`.
- Layout, with modules named after the ubiquitous language inside each zone, never after patterns
  (`entities/`, `events/`, `valueobjects/`, `listeners/`); a listener lives next to the use case it
  runs; a context never imports another one, only an explicit `shared-kernel/`:

  ```
  src/contexts/sales/
  ├── domain/order/            Order, OrderId, OrderLine, OrderPlaced, ProductPricing (port)
  ├── application/
  │   ├── place-order/         PlaceOrder
  │   ├── reserve-stock/       ReserveStock, ReserveStockOnOrderPlaced
  │   └── order-summaries/     OrderSummaries (read query)
  ├── infrastructure/
  │   ├── persistence/         MongoOrderRepository, MongoOrderSummaries
  │   ├── messaging/           RabbitMqEventChannel
  │   └── catalog/             HttpProductPricing, CatalogTranslator (ACL)
  ├── interfaces/http/         OrderController
  └── composition.ts
  ```

- Check the direction with dependency-cruiser (`tsPreCompilationDeps: true`) and the suite's
  `ddd-skills/ddd-arquitectura/assets/dependency-cruiser.cjs`, which already allows the `@archi-code/ddd`
  layers above and forbids importing `composition.ts`.
- Import from the layer, never from the package root (there is none): exceptions always come from
  `@archi-code/ddd/exceptions` (never from `/domain`).
- Logic two use cases share never goes in a use case: a business rule becomes a method of the
  aggregate or a domain service; a technical step becomes a port. When an action must follow
  another, the first records an event and a listener runs the second.
- Names: use cases are business verbs (`PlaceOrder`), events are facts in the past
  (`OrderPlaced`, never `OrderUpdated` nor present tense), listeners are `<Action>On<Event>`
  (`ReserveStockOnOrderPlaced`, where `<Action>` is the use case it runs).
