# Read models

Part of the `archi-code-ddd` skill: read it only when that skill routes here. Rows, store and query
ports, projections and the reactions that feed them; every query of data.

## Rules

- Folder `application/<read-model>/` (`order-summaries/`) with `<row>.ts` (the row interface of
  primitives and `<Row>Changes = Partial<Pick<<Row>, …>>`), `<row>-store.ts` (write port:
  `find(id)`, `hasApplied(eventId)`, `save(row, eventId)`), `<rows>.ts` (query port: `byIdOfCustomer`,
  `ofCustomer`), `<row>-projection.ts` and one subfolder per reaction.
- **Rows survive late or repeated events**: each reaction writes only its own fields, and the row
  keeps one flag per fact (`paid`, `shipped`, `cancelled`), never one overwritten `status` that a
  late event could turn back (a late `order.paid` reopening a cancelled order). A creation
  reaction never resets what another reaction already wrote.
- The projection (`OrderSummaryProjection`) is not a use case and hears no event: it receives the
  store port and `apply({ eventId, orderId, occurredOn, changes })` returns when the `eventId`
  was applied, merges the changes into the stored row (or a default row), keeps the later of the
  stored `lastEventAt` and the event's time, and saves with the `eventId`.
- Each event that changes the row has its own reaction use case, which builds `eventId: new
  UuidType(event.eventId)`, the id, `occurredOn: new CreatedAt(event.occurredOn as string)` and
  what it needs through value objects, decides the change and calls `await this.projection.apply(...)`.
- **Queries have no use case**, not even reading one aggregate by id (no `FindCourse`): the entry
  point receives the query port and calls it. Query parameters arrive as text: the controller
  checks only that they are present, the query port takes primitives and its implementation
  converts and validates them (invalid → empty result or `ValidationException`); a controller
  never does `Number(...)` nor checks values. A query that shows data that is not public (my
  orders, drafts) requires the actor like any endpoint and filters by it
  (`byIdOfCustomer(orderId, customerId)`).
- One infrastructure class implements both ports and returns copies (`structuredClone`). A read
  model never loads aggregates nor uses a repository. Event Sourcing and CQRS beyond this are
  optional, only for a concrete need.
- A business query (`pendingOlderThan`) is a read model when it only shows or lists data, and a
  `Criteria` for the repository's `search` when a use case needs the aggregates to change them.

## Code

### Read model

`application/order-summaries/`: the row (one flag per fact, never one overwritten `status`), the
store (write port), the query port, the projection and one reaction per event that changes the
row:

```ts
export interface OrderSummary {
  orderId: string;
  customerId: string | null;
  paid: boolean;
  shipped: boolean;
  delivered: boolean;
  cancelled: boolean;
  total: MoneyData | null;
  items: number;
  trackingNumber: string | null;
  lastEventAt: string;
}

export type OrderSummaryChanges = Partial<
  Pick<
    OrderSummary,
    'customerId' | 'total' | 'items' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'trackingNumber'
  >
>;

export interface OrderSummaryStore {
  find(orderId: string): Promise<OrderSummary | null>;
  hasApplied(eventId: string): Promise<boolean>;
  save(summary: OrderSummary, eventId: string): Promise<void>;
}

export interface OrderSummaries {
  byIdOfCustomer(orderId: string, customerId: string): Promise<OrderSummary | null>;
  ofCustomer(customerId: string): Promise<OrderSummary[]>;
}
```

`order-summary-projection.ts`: skips an applied `eventId`, starts from a default row, keeps the
later `lastEventAt`:

```ts
import type { CreatedAt, UuidType } from '@archi-code/ddd/domain';

export interface OrderSummaryChange {
  eventId: UuidType;
  orderId: OrderId;
  occurredOn: CreatedAt;
  changes: OrderSummaryChanges;
}

export class OrderSummaryProjection {
  constructor(private readonly store: OrderSummaryStore) {}

  async apply({ eventId, orderId, occurredOn, changes }: OrderSummaryChange): Promise<void> {
    const appliedEventId = eventId.toString();
    if (await this.store.hasApplied(appliedEventId)) {
      return;
    }
    const occurred = occurredOn.toString();
    const current = (await this.store.find(orderId.value)) ?? {
      orderId: orderId.value,
      customerId: null,
      paid: false,
      shipped: false,
      delivered: false,
      cancelled: false,
      total: null,
      items: 0,
      trackingNumber: null,
      lastEventAt: occurred,
    };
    const lastEventAt = occurred > current.lastEventAt ? occurred : current.lastEventAt;
    await this.store.save({ ...current, ...changes, lastEventAt }, appliedEventId);
  }
}
```

One reaction per event, writing only its own fields:

```ts
import { CreatedAt, UuidType } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';

@ListensTo(OrderPaidDomainEvent, { consumer: 'sales.mark-order-summary-paid-on-order-paid' })
export class MarkOrderSummaryPaidOnOrderPaid extends EventListener<OrderPaidDomainEvent> {
  constructor(private readonly projection: OrderSummaryProjection) {
    super();
  }

  async handle(event: OrderPaidDomainEvent): Promise<void> {
    const { eventId, orderId, occurredOn, quantities } = ValueObjectBuilder.build({
      eventId: () => new UuidType(event.eventId),
      orderId: () => new OrderId(event.orderId),
      occurredOn: () => new CreatedAt(event.occurredOn as string),
      quantities: () =>
        ValueObjectBuilder.buildList(event.items, (item) => new Quantity(item.quantity)),
    });
    await this.projection.apply({
      eventId,
      orderId,
      occurredOn,
      changes: {
        paid: true,
        items: quantities.reduce((items, quantity) => items + quantity.value, 0),
      },
    });
  }
}
```

One infrastructure class implements both ports, `infrastructure/read-model/in-memory-order-summary-store.ts`:

```ts
export class InMemoryOrderSummaryStore implements OrderSummaryStore, OrderSummaries {
  private readonly summaries = new Map<string, OrderSummary>();
  private readonly appliedEvents = new Set<string>();

  async find(orderId: string): Promise<OrderSummary | null> {
    return this.copy(this.summaries.get(orderId));
  }

  async hasApplied(eventId: string): Promise<boolean> {
    return this.appliedEvents.has(eventId);
  }

  async save(summary: OrderSummary, eventId: string): Promise<void> {
    this.summaries.set(summary.orderId, structuredClone(summary));
    this.appliedEvents.add(eventId);
  }

  async byIdOfCustomer(orderId: string, customerId: string): Promise<OrderSummary | null> {
    const summary = this.summaries.get(orderId);
    return summary?.customerId === customerId ? this.copy(summary) : null;
  }

  async ofCustomer(customerId: string): Promise<OrderSummary[]> {
    return Array.from(this.summaries.values())
      .filter((summary) => summary.customerId === customerId)
      .map((summary) => structuredClone(summary));
  }

  private copy(summary: OrderSummary | undefined): OrderSummary | null {
    return summary === undefined ? null : structuredClone(summary);
  }
}
```

## What not to do

- A projection that does not skip an `eventId` it already applied, or a read model that loads
  aggregates through a repository.
- A read-model row with one overwritten `status` that a late or repeated event can turn back (a
  late `order.paid` reopening a cancelled order); a creation reaction resetting what another
  reaction wrote; a projection that overwrites `lastEventAt` with an older time.
- A read-model reaction storing raw event fields without building value objects.
