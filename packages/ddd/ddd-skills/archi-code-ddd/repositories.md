# Repositories and adapters

Part of the `archi-code-ddd` skill: read it only when that skill routes here. The abstract
repository of each aggregate, its adapters (in memory, IndexedDB, other databases) and port
adapters. To declare the abstract repository (before the use cases) read the `Rules` and
`Abstract repository`; read `Adapters` when you write an adapter.

## Rules

- **The domain declares the repository of each aggregate and nothing else about persistence**:
  `repository/<Aggregate>Repository.ts`; no mapper, repository adapter, command, logger nor
  `Date.now()`.
- **One abstract repository per aggregate** (`repository/OrderRepository.ts`, user rule):
  `export abstract class OrderRepository extends AggregateRepository<Order> implements
  AggregateFinder<Order>, AggregateSaver<Order> { … }`. `AggregateRepository` (from
  `@archi-code/ddd/domain`) declares no verb: the class declares as `abstract` only the verbs the
  business of that aggregate needs, each one the method of its role and implementing that role,
  so every repository speaks the same verbs with the same signatures: `findById(id: OrderId):
  Promise<Order | null>` (`AggregateFinder`), `save(order: Order): Promise<void>`
  (`AggregateSaver`), `remove(order: Order): Promise<void>` (`AggregateRemover`, only when the
  business deletes the aggregate), `search(criteria: Criteria<Order>, options?: SearchOptions):
  Promise<SearchResult<Order>>` (`AggregateSearcher`, only when a use case needs to change the
  aggregates a criteria selects; see `criteria.md`). Nothing else: no interface, business names,
  query methods, `nextId()`, events nor code; the roles never type a dependency on their own.

- **Repositories only get, search and persist** (`findById`, `search` with a `Criteria`, `save`,
  `remove`): no business logic, no business query methods, no `nextId()`, no events. **One adapter
  per aggregate and technology** (`infrastructure/persistence/<technology>-<aggregate>-repository.ts`):
  `InMemoryOrderRepository extends OrderRepository`, implementing exactly the verbs the abstract
  repository of the domain declares; a test double may add technical read helpers for its tests
  (`versionOf(id)`), which no use case sees. Its constructor (`super()` first) receives only its
  technology (a collection, a pool; nothing in memory), never an aggregate class nor a mapper. It
  calls `X.fromPrimitives(row)` on load and `x.toPrimitives()` on save; it never reads aggregate
  fields nor builds rows by hand. No generic repository shared by several aggregates.
- **Persistence is the repository implementation and nothing else**: the persistence of an
  aggregate is its one repository adapter, and the database technology (driver, collection, pool,
  IndexedDB table, SQL) is used only inside it. Use cases, reactions, domain services, entry
  points and `composition.ts` (which only builds it) never touch the database; there is no second
  class (a DAO, a "storage service", a helper) that reads or writes the aggregate's data.
- **Every repository checks the version** [IDDD ch. 10] (the IndexedDB adapter does it through
  the `rowVersion` of its table, see IndexedDB below): it remembers the version of each
  aggregate object it loaded in a private `WeakMap<X, number>` (`versions`); on load,
  `versions.set(x, row.version)`; on save, `version = versions.get(x) ?? 0`, a stored version
  (`?? 0`) different from it throws `ConcurrencyException('<Aggregate>', id, version)` (so an
  existing id for a new aggregate is a conflict too), it stores `version + 1` next to (never
  inside) the primitives and, once the write succeeds, forgets the aggregate
  (`versions.delete(x)`): a saved aggregate is never used again, so a use case that needs to
  change it again reloads it (saving the same object twice is refused as a conflict, expected
  version 0). A failed write keeps the version, so retrying the same object conflicts again.
  `remove(aggregate)` receives the loaded aggregate, does the same check before deleting and
  forgets it too. The version is never visible to the domain
  or the application. In memory it stores `structuredClone` copies both ways in a
  `Map<string, { version, primitives }>`. A real one wraps driver errors in
  `InternalErrorException` with `{ cause }`.
- **The repository owns the transaction and everything about persistence** (`[Fuera de los
  libros: convención de @archi-code/ddd]`; IDDD ch. 14 gives it to the application service):
  there is no transaction port; each `save`/`remove` is atomic (one document, or a database
  transaction opened and committed inside `save`); when events must not be lost between `save`
  and `publish` [Destilado ch. 6; IDDD ch. 8], it stores them in the same write (an outbox) and a
  relay delivers them through an `EventChannel`.
- **IndexedDB**: when the database is IndexedDB, everything of it lives in
  `infrastructure/persistence/indexeddb/` and goes through `IndexedDbDatabase` and
  `IndexedDbSchema` of `@archi-code/ddd/infrastructure`, never through raw
  `indexedDB`/`IDBDatabase`/`IDBObjectStore` nor another IndexedDB library:
  - one class per database, `<Name>Db extends IndexedDbDatabase`, in `indexeddb/<name>.db.ts`: its
    constructor takes no argument and passes `super({ name, version, migrations })`. It owns the
    version of the data, the migrations, the upgrade and the connection, never the adapter;
  - one folder per table, `indexeddb/<table>/`, with its schema
    `<Aggregate>Schema extends IndexedDbSchema<Row, Stored>` in `<aggregate>.schema.ts` (name,
    indexes, `defaults` and `audit`, all declared by hand, and the row types), its migration
    functions in `<aggregate>.migrations.ts` and its adapter. The row of an aggregate is
    `PrimitiveTypes<X>` (`export type OrderRow = PrimitiveTypes<Order>`): `audit` and `defaults`
    are only for fields the aggregate does not have, never for its own dates;
  - migrations (`[Fuera de los libros: convención de @archi-code/ddd]`): when a release changes
    the shape of the stored rows (a renamed field or status, a new required field, a value the
    business no longer has), it raises the database `version` by one and adds one migration for
    it, `{ <version>: { <table>: fn } }`, the only way to change rows already in the browsers of
    the users. Each table declares in `<aggregate>.migrations.ts` the row type of every older
    release (`OrderRowV1`, `OrderRowV2`, the current one is `PrimitiveTypes<X>`) and one pure,
    synchronous function per release named after what it does
    (`renameNewStatusAndDropCancelled(row: OrderRowV1): OrderRowV2 | null`). A migration
    receives a row without its `rowVersion` (the table keeps it) and returns the row of the next
    release, or `null` to delete it; it never reads other tables, the clock nor the network, and
    never changes the `id`. The database exports the version and the migrations
    (`SHOP_DATA_VERSION`, `SHOP_MIGRATIONS`) and numbers them. The table runs, in order and
    inside the upgrade, only the migrations newer than the version recorded in the browser; a new
    browser runs none; any error rolls the whole upgrade back and comes out as `IndexedDbException`
    `request_failed` with the error as `cause`; a page still running an older release closes its
    connection and is refused afterwards (`schema_mismatch`). A migration is never edited nor
    removed once released: a fix is a new version;
  - the adapter is `IndexedDb<Aggregate>Repository extends <Aggregate>Repository`, in
    `indexeddb/<table>/indexeddb-<aggregate>-repository.ts`. Its constructor receives the database
    (`constructor(database: ShopDb)`) and gets its table from it:
    `this.table = database.table(new OrderSchema())`. `composition.ts` builds the database once
    and every repository of it before the first read;
  - rows are plain, already validated data: `x.toPrimitives()` goes in as it is and
    `X.fromPrimitives(row)` comes out, never an aggregate. IndexedDB stores `Date`s and every
    structured-clone value, so the adapter converts nothing and casts nothing. The key is the
    aggregate's `id`, already a UUID;
  - the table owns `rowVersion` (`[Fuera de los libros: convención de @archi-code/ddd]`): 1 when a
    row is created, one more on every persist, returned by every read. The adapter remembers it
    per aggregate in a private `WeakMap<X, number>` on load
    (`rowVersions.set(x, row.rowVersion)`), sends it back on save
    (`rowVersion = rowVersions.get(x) ?? 0`, `table.persist({ ...x.toPrimitives(), rowVersion })`)
    and, once `persist` succeeds, forgets it (`rowVersions.delete(x)`): a saved aggregate is never
    used again. `persist` is the one that checks, in one transaction: a
    row that is not stored is created; a stored row whose `rowVersion` differs from the one sent
    throws `ConcurrencyException`, also when none is sent (a new aggregate whose id is taken). The
    adapter never writes the check nor a version of its own;
  - the adapter's `remove(x)` does nothing for an aggregate it never loaded nor saved (no
    `rowVersion` remembered); otherwise it is `table.remove(x.id.value, rowVersion)`, which
    deletes in one transaction and throws `ConcurrencyException` when the stored `rowVersion` is
    another one, and then it forgets the aggregate (`rowVersions.delete(x)`). Calling
    `table.remove` without a `rowVersion` deletes without any check. `persistMany` and
    `removeMany` (batches) never check;
  - `search` is `table.find(toIndexedDbQuery(criteria, table.indexes))` with `toIndexedDbQuery` of
    `@archi-code/criteria-adapters/indexeddb`, then `X.fromPrimitives` on every row;
  - the adapter catches nothing: every error of the table passes to the use case as it is,
    `ConcurrencyException` (named after the table, `orders with ID … was changed by someone
    else`) or an `IndexedDbException` with a `reason` such as `quota_exceeded`, `blocked`,
    `schema_mismatch` or `unavailable`;
  - declaring the database, a schema and a repository works where there is no `indexedDB`; only
    using a table fails there (`unavailable`).

  A read-model store kept in IndexedDB follows the same rules with its own schema and folder.
- The in-memory repository is an implementation like any other [IDDD ch. 12]. It lives in
  `infrastructure/persistence/in-memory-<aggregate>-repository.ts` when the application runs in
  memory, or in `test/support/` when it is only a test double; the package ships none.
- **Port adapters** (`infrastructure/<area>/<technology>-<port>.ts`, `InMemoryCouponCatalog
  implements CouponCatalog`) are their own class (never a repository nor a read-model store), receive
  raw data or their technology by constructor (raw shapes are interfaces in the same file), answer
  in value objects, and turn bad external data into
  `InternalErrorException('<message>', { cause: error })`, never a business error.
- **Infrastructure never implements a domain service** (user rule, strict, no exceptions). No
  class in `infrastructure` extends, implements, replaces nor redefines a domain service
  (`domain/service/<Service>.ts`), and none holds its business logic. Infrastructure implements
  only the abstract repository of an aggregate, domain ports, read-model stores and event
  channels. A domain service is a concrete class of the domain (`domain-services.md`): when an
  adapter seems to need to implement one, the technical step is a domain port and the adapter
  implements that port.

## Code

### Abstract repository

The domain declares one abstract repository per aggregate, `domain/repository/PaymentRepository.ts`:
only the verbs the business of payments needs, each the method of the package role it implements
(payments are never deleted, so there is no `remove`):

```ts
import { AggregateRepository } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';

export abstract class PaymentRepository
  extends AggregateRepository<Payment>
  implements AggregateFinder<Payment>, AggregateSaver<Payment>
{
  abstract findById(id: PaymentId): Promise<Payment | null>;
  abstract save(payment: Payment): Promise<void>;
}
```

Orders are deleted (`DiscardCancelledOrder`), so `OrderRepository` also declares `remove`; when
a use case changes the orders a criteria selects, it declares `search` too:

```ts
import { AggregateRepository } from '@archi-code/ddd/domain';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  AggregateSearcher,
  Criteria,
  SearchOptions,
  SearchResult,
} from '@archi-code/ddd/domain';

export abstract class OrderRepository
  extends AggregateRepository<Order>
  implements
    AggregateFinder<Order>,
    AggregateSaver<Order>,
    AggregateRemover<Order>,
    AggregateSearcher<Order>
{
  abstract findById(id: OrderId): Promise<Order | null>;
  abstract save(order: Order): Promise<void>;
  abstract remove(order: Order): Promise<void>;
  abstract search(criteria: Criteria<Order>, options?: SearchOptions): Promise<SearchResult<Order>>;
}
```

Every use case and reaction of orders receives `OrderRepository`.

### Adapters

The adapter in memory,
`infrastructure/persistence/in-memory-order-repository.ts` (also the test double of
`test/support/`), extends it with copies both ways and the version check; `search` runs the
criteria with `searchMemory` of `@archi-code/criteria-adapters/memory`:

```ts
import type { Criteria, PrimitiveTypes, SearchOptions, SearchResult } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';
import { searchMemory } from '@archi-code/criteria-adapters/memory';

interface OrderRow {
  version: number;
  primitives: PrimitiveTypes<Order>;
}

export class InMemoryOrderRepository extends OrderRepository {
  private readonly rows = new Map<string, OrderRow>();
  private readonly versions = new WeakMap<Order, number>();

  async findById(id: OrderId): Promise<Order | null> {
    const row = this.rows.get(id.value);
    return row === undefined ? null : this.load(row);
  }

  async search(criteria: Criteria<Order>, options?: SearchOptions): Promise<SearchResult<Order>> {
    return searchMemory(Array.from(this.rows.values(), (row) => this.load(row)), criteria, options);
  }

  async save(order: Order): Promise<void> {
    const version = this.checkedVersion(order);
    this.rows.set(order.id.value, {
      version: version + 1,
      primitives: structuredClone(order.toPrimitives()),
    });
    this.versions.delete(order);
  }

  async remove(order: Order): Promise<void> {
    this.checkedVersion(order);
    this.rows.delete(order.id.value);
    this.versions.delete(order);
  }

  private load(row: OrderRow): Order {
    const order = Order.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(order, row.version);
    return order;
  }

  private checkedVersion(order: Order): number {
    const key = order.id.value;
    const version = this.versions.get(order) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Order', key, version);
    }
    return version;
  }
}
```

A real adapter extends the same abstract repository, checks the version (also on
`remove`) and wraps driver errors with their cause:

```ts
import type { Collection } from 'mongodb';
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';
import { InternalErrorException } from '@archi-code/ddd/infrastructure';

type OrderDocument = PrimitiveTypes<Order> & { _id: string; version: number };

const DUPLICATE_KEY = 11000;

export class MongoOrderRepository extends OrderRepository {
  private readonly versions = new WeakMap<Order, number>();

  constructor(private readonly collection: Collection<OrderDocument>) {
    super();
  }

  async findById(id: OrderId): Promise<Order | null> {
    const document = await this.run('loading order', () =>
      this.collection.findOne({ _id: id.value }),
    );
    if (document === null) {
      return null;
    }
    const { _id, version, ...primitives } = document;
    const order = Order.fromPrimitives(primitives);
    this.versions.set(order, version);
    return order;
  }

  async save(order: Order): Promise<void> {
    const version = this.versions.get(order) ?? 0;
    const document = { ...order.toPrimitives(), _id: order.id.value, version: version + 1 };
    const written =
      version === 0
        ? await this.insertUnlessTaken(document)
        : await this.run('saving order', async () => {
            const filter = { _id: document._id, version };
            const result = await this.collection.replaceOne(filter, document);
            return result.matchedCount === 1;
          });
    if (!written) {
      throw new ConcurrencyException('Order', order.id.value, version);
    }
    this.versions.delete(order);
  }

  async remove(order: Order): Promise<void> {
    const version = this.versions.get(order) ?? 0;
    const _id = order.id.value;
    const removed = await this.run('removing order', async () => {
      const { deletedCount } = await this.collection.deleteOne({ _id, version });
      if (deletedCount === 1) {
        return true;
      }
      const stored = await this.collection.countDocuments({ _id }, { limit: 1 });
      return version === 0 && stored === 0;
    });
    if (!removed) {
      throw new ConcurrencyException('Order', _id, version);
    }
    this.versions.delete(order);
  }

  private async insertUnlessTaken(document: OrderDocument): Promise<boolean> {
    try {
      await this.collection.insertOne(document);
      return true;
    } catch (error) {
      if ((error as { code?: unknown }).code === DUPLICATE_KEY) {
        return false;
      }
      throw new InternalErrorException('saving order', { cause: error });
    }
  }

  private async run<T>(action: string, work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      throw new InternalErrorException(action, { cause: error });
    }
  }
}
```

When the database is IndexedDB, the database, each schema and each adapter are their own class.
`infrastructure/persistence/indexeddb/shop.db.ts`:

```ts
import { IndexedDbDatabase } from '@archi-code/ddd/infrastructure';
import type { IndexedDbDatabaseOptions } from '@archi-code/ddd/infrastructure';

export const SHOP_DATA_VERSION = 3;

export const SHOP_MIGRATIONS: NonNullable<IndexedDbDatabaseOptions['migrations']> = {
  2: { orders: renameNewStatusAndDropCancelled },
  3: { orders: stampMissingUpdatedAt },
};

export class ShopDb extends IndexedDbDatabase {
  constructor() {
    super({ name: 'shop', version: SHOP_DATA_VERSION, migrations: SHOP_MIGRATIONS });
  }
}
```

`infrastructure/persistence/indexeddb/orders/order.migrations.ts`, the rows earlier releases
stored (release 1 had a `new` and a `cancelled` status and no `updatedAt`) and how each release
turns them into the next one:

```ts
export interface OrderRowV1 {
  readonly id: string;
  readonly customerId: string;
  readonly lines: string[];
  readonly status: 'new' | 'shipped' | 'cancelled';
  readonly createdAt: Date;
}

export interface OrderRowV2 {
  readonly id: string;
  readonly customerId: string;
  readonly lines: string[];
  readonly status: OrderStatus;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
}

export function renameNewStatusAndDropCancelled(row: OrderRowV1): OrderRowV2 | null {
  if (row.status === 'cancelled') {
    return null;
  }
  return { ...row, status: row.status === 'new' ? OrderStatus.PLACED : OrderStatus.SHIPPED };
}

export function stampMissingUpdatedAt(row: OrderRowV2): OrderRow {
  return { ...row, updatedAt: row.updatedAt ?? row.createdAt };
}
```

`infrastructure/persistence/indexeddb/orders/order.schema.ts`:

```ts
import type { PrimitiveTypes } from '@archi-code/ddd/domain';
import { IndexedDbSchema } from '@archi-code/ddd/infrastructure';

export type OrderRow = PrimitiveTypes<Order>;

export class OrderSchema extends IndexedDbSchema<OrderRow> {
  constructor() {
    super({ name: 'orders', indexes: { byCustomer: 'customerId' } });
  }
}
```

`infrastructure/persistence/indexeddb/orders/indexeddb-order-repository.ts`:

```ts
import type { Criteria, SearchOptions, SearchResult } from '@archi-code/ddd/domain';
import type { IndexedDbStored, IndexedDbTable } from '@archi-code/ddd/infrastructure';
import { toIndexedDbQuery } from '@archi-code/criteria-adapters/indexeddb';

export class IndexedDbOrderRepository extends OrderRepository {
  private readonly table: IndexedDbTable<OrderRow>;
  private readonly rowVersions = new WeakMap<Order, number>();

  constructor(database: ShopDb) {
    super();
    this.table = database.table(new OrderSchema());
  }

  async findById(id: OrderId): Promise<Order | null> {
    const row = await this.table.get(id.value);
    return row === null ? null : this.load(row);
  }

  async search(criteria: Criteria<Order>, options?: SearchOptions): Promise<SearchResult<Order>> {
    const page = await this.table.find(toIndexedDbQuery(criteria, this.table.indexes));
    const items = page.items.map((row) => this.load(row));
    return options?.withTotal ? { items, total: page.total } : { items };
  }

  async save(order: Order): Promise<void> {
    const rowVersion = this.rowVersions.get(order) ?? 0;
    await this.table.persist({ ...order.toPrimitives(), rowVersion });
    this.rowVersions.delete(order);
  }

  async remove(order: Order): Promise<void> {
    const rowVersion = this.rowVersions.get(order);
    if (rowVersion === undefined) {
      return;
    }
    await this.table.remove(order.id.value, rowVersion);
    this.rowVersions.delete(order);
  }

  private load(row: IndexedDbStored<OrderRow>): Order {
    const order = Order.fromPrimitives(row);
    this.rowVersions.set(order, row.rowVersion);
    return order;
  }
}
```

The database owns the version of the data, the upgrade, the migrations and the connection, the
schema declares what is stored next to the data, and the table owns `rowVersion`: `persist` looks
the row up by its id and throws `ConcurrencyException` if the `rowVersion` the adapter sends is
not the stored one, a missing row counting as 0 (a new aggregate sends 0, so a taken id is
refused, and saving an aggregate someone removed is refused instead of bringing it back); a new
row is created at `rowVersion` 1, all in one transaction; `remove` checks it the same way. The
adapter only remembers each aggregate's `rowVersion` and lets every error of the table through. `search` turns the criteria into a query with
`toIndexedDbQuery` and the table runs it, sorting in memory only when the query has a `compare`.

A port adapter, `infrastructure/coupon/in-memory-coupon-catalog.ts`: raw data in, value objects
out, bad external data as an internal error:

```ts
import { InternalErrorException } from '@archi-code/ddd/infrastructure';

export interface MarketingCampaign {
  code: string;
  percentOff: number;
  active: boolean;
}

export class InMemoryCouponCatalog implements CouponCatalog {
  private readonly campaigns: ReadonlyMap<string, MarketingCampaign>;

  constructor(campaigns: readonly MarketingCampaign[]) {
    this.campaigns = new Map(campaigns.map((campaign) => [campaign.code, campaign]));
  }

  async discountOf(code: CouponCode): Promise<DiscountPercent | null> {
    const campaign = this.campaigns.get(code.value);
    if (campaign === undefined || !campaign.active) {
      return null;
    }
    try {
      return new DiscountPercent(campaign.percentOff);
    } catch (error) {
      throw new InternalErrorException(`the campaign ${campaign.code} has an invalid discount`, {
        cause: error,
      });
    }
  }
}
```

## What not to do

- A repository without its abstract class in the domain, an `interface OrderRepository`, or an
  abstract repository that does not extend `AggregateRepository<Order>` and implement the role
  of each verb it declares.
- Verbs the business of the aggregate does not need (`remove` on invoices that are never
  deleted), verbs other than `findById`, `search`, `save` and `remove`, or code in the abstract
  repository: it only declares them.
- Repository methods with business names or rules (`pendingOlderThan`), `nextId()`, events, or
  methods that return DTOs: a business query is a `Criteria` for `search` when a use case needs the
  aggregates to change them, and a read model (row, store, query port, projection) when it only
  shows or lists data.
- Throwing `AggregateNotFoundException` from the domain or a repository: the user use case throws
  it when `findById` returns `null`.
- A repository that reads aggregate fields or builds rows by hand, or whose constructor receives
  an aggregate class, a mapper or `{ toPrimitives, fromPrimitives }`.
- A generic repository shared by several aggregates: write one per aggregate.
- Database code outside the repository adapter (a use case, a reaction, a controller,
  `composition.ts` or a second class, a DAO or a "storage service", that reads or writes the
  aggregate's data), or more than one adapter for the same aggregate and technology.
- An IndexedDB repository that opens `indexedDB` itself, works on `IDBDatabase`/`IDBObjectStore`,
  uses another IndexedDB library, or handles the database version or the upgrade: it is
  `IndexedDb<Aggregate>Repository` over the table `database.table(new <Aggregate>Schema())` gives.
- A database, a schema and an adapter declared in one file, a table declared inside the database
  class, a schema shared by two tables, or an adapter that builds its own `IndexedDbDatabase`
  instead of receiving it.
- An IndexedDB repository that reads the row and compares the `rowVersion` itself, writes a
  version field of its own into the row, keeps the `rowVersion` in a `Map` by id instead of a
  `WeakMap` by aggregate, or passes an aggregate (not its primitives) to the table.
- An IndexedDB `remove` that calls `table.remove` for an aggregate it never loaded nor saved, or
  without its `rowVersion`: it deletes the stored row without any check.
- An IndexedDB adapter that converts dates to text, casts the stored row or declares a row type of
  its own instead of `PrimitiveTypes<X>`, or an `audit` field that repeats a date the aggregate
  already stamps.
- An IndexedDB adapter that catches the errors of the table to rename, wrap or swallow them:
  `ConcurrencyException` and `IndexedDbException` reach the use case as they are.
- Changing the shape of stored rows without raising the database `version` and adding a
  migration; editing or removing a migration already released; a migration that is
  asynchronous, reads another table, the clock or the network, changes the `id` or the
  `rowVersion`, or works on aggregates instead of rows; old row shapes typed as `any` instead
  of one `OrderRowV<n>` per release; a repository that converts old rows on load instead of
  leaving it to the migrations.
- A default or audit value computed asynchronously, or expected from the package: every one is a
  synchronous function or value declared in the schema.
- A repository (also the in-memory one; the IndexedDB one delegates it to `persist`) that saves with no version condition or "last save
  wins", keeps remembering the version after a save (or reuses a saved aggregate instead of reloading
  it), forgets the stored version on load, removes
  by id without the loaded aggregate, or exposes the version to domain or application code.
- An in-memory repository that stores or returns the same objects it received: store and return
  `structuredClone` copies.
- An adapter without the repository contract spec that every adapter of the aggregate runs.
- A port adapter that throws a business error for bad external data: wrap it in
  `InternalErrorException` with `{ cause }`.
- Wrapping or translating an error without `{ cause: error }`.
- A domain port implemented by a repository or a read-model store instead of its own adapter.
- An infrastructure class that extends or implements a domain service, or that holds its business
  logic: infrastructure implements repositories, domain ports, stores and channels, never a
  domain service.
