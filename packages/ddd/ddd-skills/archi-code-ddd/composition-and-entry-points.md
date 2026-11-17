# Composition, event wiring, entry points and logging

Part of the `archi-code-ddd` skill: read it only when that skill routes here. The composition root,
the event bus, registry and channels, controllers with their protocol helper, and logging.

## Rules

- **Event wiring** is infrastructure, used only by the composition root:
  `DomainEventBus(channel, registry, logger)` implements `EventBus` (`publish` sends a plain copy
  of each event in one `send`; `subscribe(listener)` → `Subscription { unsubscribe() }` reads the
  `@ListensTo`, refuses an event the registry lacks with `UnknownEventException` and hands the
  listener the event rebuilt from its JSON, also in memory). A messaging technology implements
  only `EventChannel` (`send(serialized)`, `receive(eventName, consumer, handler)` →
  `ChannelSubscription { close() }`); swapping it changes one line. Never a second bus.
- `EventRegistry` registers each event the context hears exactly once, with a factory that maps
  every field from the JSON with a cast and passes `eventId: json.eventId` and
  `occurredOn: json.occurredOn`; `fromJSON` throws `InternalErrorException` when the rebuilt event
  lost them, which reactions need to skip a redelivery.

- The package speaks no protocol. One technical helper per protocol (`platform/http/http.ts`,
  shared by every context and holding no business rule) translates errors with
  `ExceptionClassifier.classify(error)` from `/infrastructure`: `Malformed` (a conversion or
  required error thrown alone) 400, `Rejected` (any other `ApplicationException`) 400,
  `NotAllowed` 403, `NotFound` 404, `Conflict` 409, `Invalid` (`ValidationException` and any other
  `DomainException`) 422, `Internal` (`UnexpectedErrorException`, `InvalidEventDefinitionException`,
  anything else) 500, logged once as `logger.error('http_request_failed', …)` with the message
  hidden. The error body is `{ code, message, errors }` (`errors` only for `ValidationException`).
  It is the only file that imports `ExceptionClassifier`. Never classify with hand-written
  `instanceof` chains.
- A "not found" thrown by a domain service (`CourseNotFound`, a `DomainException`) is `Invalid`
  (422), while `AggregateNotFoundException` thrown by a use case is `NotFound` (404). When the
  business wants a 404 for such a business error, the protocol helper keeps one table of business
  codes per status (`private static readonly NOT_FOUND_CODES = new Set(['CRS001'])`) and checks
  `error.code` after `ExceptionClassifier`; it is the only place that looks at a code, and
  controllers still never catch errors.
- A controller (`interfaces/http/<aggregates>-controller.ts`) receives the user use cases (or one
  `<Aggregates>UseCases` interface when there are many), the query ports and `logger` last, and
  builds its `Http` helper. One method per endpoint returns `this.http.respond(async () => { … })`:
  (1) when an actor matters, missing `request.auth` → 401; (2) a body that is not a JSON object,
  or a list that is not an array → 400 with an English hint (shape only, never values); (3)
  `await useCase.execute({ actorId | actorRole, …params, …body })` or a call to a query port; (4)
  201 `{ id }` to create, 204 for a command, 200 for a query (a missing row → 404). It never
  catches errors, maps statuses, imports a repository or an adapter, nor holds rules.
- The composition root (`composition.ts`, one class `<Context>Context` and
  `interface <Context>Settings { channel; logger; …own data }`) is the only place that
  builds classes of the context and reads configuration: `static async start(settings)` builds
  `new DomainEventBus(channel, <Context>Context.registry(), logger)`, the repositories,
  stores, port adapters and projections, every reaction use case with its
  dependencies (each subscribed with `await bus.subscribe(listener)`, its `Subscription` kept),
  then the controller with the user use cases; it never builds a domain service. `async stop()`
  unsubscribes every subscription; `private static registry()` builds the `EventRegistry`. Nothing
  imports `composition.ts`. One top-level file opens one channel and starts every context with the
  same channel and logger, and stops them in reverse order.

- Logging goes through the `Logger` port of `/application` (`debug`, `info`, `warn`, `error`,
  each `(message, context?)`): the message is a stable snake_case name and the data goes in the
  context (`this.logger.info('order_cancelled_for_rejected_payment', { orderId: orderId.value })`,
  after publishing; a reaction logs only when its method recorded events, since one that did not
  apply changed nothing). The domain never logs (it records events or throws). The composition root
  picks the provider: `ConsoleLogger({ level })`, an adapter over pino or winston,
  `InMemoryLogger` in tests (`entries`), `SilentLogger` by default. Each error is logged once,
  where it is handled; never passwords, tokens nor personal data the entry does not need.

## Code

### Composition root

`composition.ts`: the only place that builds the context; one bus per context over the shared
channel, every reaction subscribed, every heard event registered once with a factory that keeps
`eventId` and `occurredOn`:

```ts
import type { Logger } from '@archi-code/ddd/application';
import { DomainEventBus, EventRegistry } from '@archi-code/ddd/infrastructure';
import type { EventChannel, Subscription } from '@archi-code/ddd/infrastructure';

export interface PaymentsSettings {
  channel: EventChannel;
  logger: Logger;
}

export class PaymentsContext {
  private constructor(
    readonly payments: InMemoryPaymentRepository,
    readonly controller: PaymentsController,
    private readonly subscriptions: Subscription[],
  ) {}

  static async start({ channel, logger }: PaymentsSettings): Promise<PaymentsContext> {
    const bus = new DomainEventBus(channel, PaymentsContext.registry(), logger);
    const payments = new InMemoryPaymentRepository();
    const listeners = [
      new RequestPaymentOnOrderCreated(payments, bus),
      new SettleCancelledOrderPaymentOnOrderCancelled(payments, bus),
    ];
    const subscriptions: Subscription[] = [];
    for (const listener of listeners) {
      subscriptions.push(await bus.subscribe(listener));
    }
    const controller = new PaymentsController(
      new ConfirmTransferReceived(payments, bus),
      logger,
    );
    return new PaymentsContext(payments, controller, subscriptions);
  }

  async stop(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      await subscription.unsubscribe();
    }
  }

  private static registry(): EventRegistry {
    return new EventRegistry()
      .register(
        OrderCreatedDomainEvent,
        (json) =>
          new OrderCreatedDomainEvent({
            orderId: json.orderId as string,
            total: json.total as MoneyData,
            paymentMethod: json.paymentMethod as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      )
      .register(
        OrderCancelledDomainEvent,
        (json) =>
          new OrderCancelledDomainEvent({
            orderId: json.orderId as string,
            total: json.total as MoneyData,
            paymentMethod: json.paymentMethod as string,
            eventId: json.eventId,
            occurredOn: json.occurredOn,
          }),
      );
  }
}
```

A context whose repository is IndexedDB builds its database once and hands it to every repository
of that database, before the first read: `const database = new SchoolDb();` then
`new IndexedDbCourseRepository(database)`. Nothing is opened until a repository is used, so the
same composition also loads in Node.

The top level opens one channel and starts every context on it:

```ts
const channel = new InMemoryEventChannel({ delivery: 'serial' });
const sales = await SalesContext.start({ channel, logger, campaigns });
const payments = await PaymentsContext.start({ channel, logger });
const shipping = await ShippingContext.start({ channel, logger });
// close: shipping.stop(), payments.stop(), sales.stop()
```

### Entry points

One shared helper, `platform/http/http.ts`, the only place that turns errors into statuses (the
requests and responses are the project's own types):

```ts
import {
  DomainException,
  ValidationException,
} from '@archi-code/ddd/domain';
import { ApplicationException } from '@archi-code/ddd/application';
import type { Logger } from '@archi-code/ddd/application';
import {
  ExceptionClassifier,
  ExceptionKind,
  InfrastructureException,
} from '@archi-code/ddd/infrastructure';

export interface HttpRequest {
  auth?: { userId?: string; role?: string };
  params?: Record<string, string>;
  body?: unknown;
}

export interface HttpResponse {
  status: number;
  body?: unknown;
}

export type JsonBody = Record<string, unknown>;

export class Http {
  private static readonly STATUS: Record<ExceptionKind, number> = {
    [ExceptionKind.NotFound]: 404,
    [ExceptionKind.NotAllowed]: 403,
    [ExceptionKind.Conflict]: 409,
    [ExceptionKind.Malformed]: 400,
    [ExceptionKind.Invalid]: 422,
    [ExceptionKind.Rejected]: 400,
    [ExceptionKind.Internal]: 500,
  };
  private static readonly NOT_FOUND_CODES = new Set(['CRS001']);

  constructor(private readonly logger: Logger) {}

  async respond(action: () => Promise<HttpResponse>): Promise<HttpResponse> {
    try {
      return await action();
    } catch (error) {
      return this.failure(error);
    }
  }

  jsonBody(request: HttpRequest): JsonBody | null {
    const { body } = request;
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as JsonBody)
      : null;
  }

  badRequest(message: string): HttpResponse {
    return { status: 400, body: { code: 'BAD_REQUEST', message } };
  }

  unauthenticated(): HttpResponse {
    return { status: 401, body: { code: 'UNAUTHENTICATED', message: 'Sign in first' } };
  }

  private failure(error: unknown): HttpResponse {
    const kind = ExceptionClassifier.classify(error);
    const known =
      error instanceof DomainException ||
      error instanceof ApplicationException ||
      error instanceof InfrastructureException;
    const code = known ? error.code : 'E000';
    if (kind === ExceptionKind.Internal) {
      this.logger.error('http_request_failed', { code, error });
      return { status: 500, body: { code, message: 'Internal server error' } };
    }
    const status = Http.NOT_FOUND_CODES.has(code) ? 404 : Http.STATUS[kind];
    const errors = error instanceof ValidationException ? error.errors : undefined;
    return { status, body: { code, message: (error as Error).message, errors } };
  }
}
```

A controller checks only the actor and the shape, calls one use case or query port and answers:

```ts
export class PaymentsController {
  private readonly http: Http;

  constructor(
    private readonly confirmTransferReceived: ConfirmTransferReceived,
    logger: Logger,
  ) {
    this.http = new Http(logger);
  }

  confirmTransfer(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const role = request.auth?.role;
      if (role === undefined) {
        return this.http.unauthenticated();
      }
      const body = this.http.jsonBody(request);
      if (body === null) {
        return this.http.badRequest('Send the received amount as a JSON object');
      }
      await this.confirmTransferReceived.execute({
        actorRole: role,
        paymentId: request.params?.paymentId as string,
        received: body as unknown as MoneyData,
      });
      return { status: 204 };
    });
  }
}
```

A query endpoint calls the query port with the actor, never a use case:

```ts
  getOrder(request: HttpRequest): Promise<HttpResponse> {
    return this.http.respond(async () => {
      const userId = request.auth?.userId;
      if (userId === undefined) {
        return this.http.unauthenticated();
      }
      const summary = await this.summaries.byIdOfCustomer(
        request.params?.orderId as string,
        userId,
      );
      return summary === null
        ? { status: 404, body: { code: 'NOT_FOUND', message: 'Order not found' } }
        : { status: 200, body: summary };
    });
  }
```

### Another event channel

Another messaging technology is one `EventChannel` class in `infrastructure/messaging/`; the use
cases, the reactions and `DomainEventBus` stay the same, and the composition root changes one
line. A RabbitMQ channel over the methods of an amqplib channel it uses, declared structurally:
one durable topic exchange, the event name as routing key, one durable queue per consumer (the
`consumer` of `@ListensTo`) and event, `ack` when the reaction finished and `nack` without requeue
when it failed (a dead-letter exchange on the queue keeps those messages):

```ts
import type { SerializedEvent } from '@archi-code/ddd/domain';
import type {
  ChannelHandler,
  ChannelSubscription,
  EventChannel,
} from '@archi-code/ddd/infrastructure';

interface AmqpMessage {
  content: Buffer;
}

interface AmqpChannel {
  assertExchange(exchange: string, type: 'topic', options: { durable: boolean }): Promise<unknown>;
  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: { persistent: boolean; messageId: string; contentType: string },
  ): boolean;
  assertQueue(queue: string, options: { durable: boolean }): Promise<unknown>;
  bindQueue(queue: string, exchange: string, pattern: string): Promise<unknown>;
  consume(
    queue: string,
    onMessage: (message: AmqpMessage | null) => void,
  ): Promise<{ consumerTag: string }>;
  ack(message: AmqpMessage): void;
  nack(message: AmqpMessage, allUpTo: boolean, requeue: boolean): void;
  cancel(consumerTag: string): Promise<unknown>;
}

export class RabbitMqEventChannel implements EventChannel {
  constructor(
    private readonly amqp: AmqpChannel,
    private readonly exchange = 'shop.events',
  ) {}

  async send(events: readonly SerializedEvent[]): Promise<void> {
    await this.amqp.assertExchange(this.exchange, 'topic', { durable: true });
    for (const event of events) {
      this.amqp.publish(this.exchange, event.eventName, Buffer.from(JSON.stringify(event)), {
        persistent: true,
        messageId: event.eventId,
        contentType: 'application/json',
      });
    }
  }

  async receive(
    eventName: string,
    consumer: string,
    handler: ChannelHandler,
  ): Promise<ChannelSubscription> {
    const queue = `${consumer}.${eventName}`;
    await this.amqp.assertExchange(this.exchange, 'topic', { durable: true });
    await this.amqp.assertQueue(queue, { durable: true });
    await this.amqp.bindQueue(queue, this.exchange, eventName);
    const { consumerTag } = await this.amqp.consume(queue, (message) => {
      if (message === null) {
        return;
      }
      handler(JSON.parse(message.content.toString()))
        .then(() => this.amqp.ack(message))
        .catch(() => this.amqp.nack(message, false, false));
    });
    let open = true;
    return {
      close: async () => {
        if (open) {
          open = false;
          await this.amqp.cancel(consumerTag);
        }
      },
    };
  }
}
```

With a broker, `publish` resolves when RabbitMQ took the messages, not when the reaction ran: an
integration test waits for the effect (polling the repository) instead of reading it right after
`execute`.

## What not to do

- A registry factory that does not pass `eventId: json.eventId` and `occurredOn: json.occurredOn`:
  the event gets a new `eventId`, a reaction cannot skip a redelivery, and `fromJSON` throws.
- Registering an event twice, or subscribing a reaction to an event the registry does not know
  (`UnknownEventException`).
- Writing a second bus for a new technology (a `RabbitMqEventBus`): implement only `EventChannel`
  and keep `DomainEventBus`.
- A controller that catches errors, maps statuses by hand, checks values instead of shape, converts
  query values (`Number(params.x)` for a query port), or holds business rules: the protocol helper
  translates every error with `ExceptionClassifier` (and, only there, a table of business codes
  that must be another status, such as a 404), and the query port converts its parameters.
- A query of data that is not public (my orders) without the actor, or one that does not filter by
  it.
- Classifying exceptions with hand-written `instanceof` chains.
- Sending the message of an `Internal` failure to the client.
- Importing a logging library (pino, winston, `console`) in a use case: inject the `Logger` port.
- Logging an error and rethrowing it in every layer: the edge that handles it logs it once
  (`DomainEventBus` with a logger already does; the protocol helper logs an `Internal` failure).
- Interpolating data into the message (`` `order ${id} failed` ``) or logging passwords, tokens or
  personal data the entry does not need.
- Logging from the domain: it records events or throws.
