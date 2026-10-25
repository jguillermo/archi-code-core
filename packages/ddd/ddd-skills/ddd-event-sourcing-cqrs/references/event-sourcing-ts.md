# Event Sourcing en TypeScript

`@archi-code/ddd` no trae event store, repositorios con Event Sourcing ni snapshots: todo lo de esta referencia es código del proyecto escrito sobre las clases del paquete (`AggregateRoot`, `EventBase`, `EventRegistry`, `UseCase`, `EventBus`, `ConcurrencyException`). Úsalo solo en los agregados que la tabla de decisión de `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md` justifique.

## Eventos del stream

Cada evento es una subclase de `EventBase` con `static readonly eventName` y, como campos `readonly`, el id del agregado y los datos primitivos que necesita, tomados de los value objects (el dinero como `{ amount, currency }`), nunca value objects: el evento no tiene métodos y se serializa tal cual (`{ ...event }`) [IDDD cap. 8]. Con el paquete se nombra `<Agregado><AcciónEnPasado>DomainEvent`, su `eventName` es `'<agregado>.<acción_en_pasado>'` y su constructor recibe un objeto tipado en línea `{ …campos } & EventMetadata`, sin interfaces ni tipos propios; cada uno en su fichero de `domain/event/` `[Fuera de los libros: convención de @archi-code/ddd]`.

```ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class PaymentCreatedDomainEvent extends EventBase {
  static readonly eventName = 'payment.created';

  readonly paymentId: string;
  readonly orderId: string;
  readonly amount: { amount: number; currency: string };

  constructor({
    paymentId,
    orderId,
    amount,
    eventId,
    occurredOn,
    clock,
  }: {
    paymentId: string;
    orderId: string;
    amount: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.paymentId = paymentId;
    this.orderId = orderId;
    this.amount = amount;
  }
}

export class PaymentAuthorizedDomainEvent extends EventBase {
  static readonly eventName = 'payment.authorized';

  readonly paymentId: string;
  readonly authorizationCode: string;
  readonly expiresAt: string;

  constructor({
    paymentId,
    authorizationCode,
    expiresAt,
    eventId,
    occurredOn,
    clock,
  }: { paymentId: string; authorizationCode: string; expiresAt: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.paymentId = paymentId;
    this.authorizationCode = authorizationCode;
    this.expiresAt = expiresAt;
  }
}

export class PaymentRejectedDomainEvent extends EventBase {
  static readonly eventName = 'payment.rejected';

  readonly paymentId: string;
  readonly reason: string;

  constructor({
    paymentId,
    reason,
    eventId,
    occurredOn,
    clock,
  }: { paymentId: string; reason: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.paymentId = paymentId;
    this.reason = reason;
  }
}

export class PaymentCapturedDomainEvent extends EventBase {
  static readonly eventName = 'payment.captured';

  readonly paymentId: string;

  constructor({ paymentId, eventId, occurredOn, clock }: { paymentId: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.paymentId = paymentId;
  }
}

export type PaymentEvent =
  | PaymentCreatedDomainEvent
  | PaymentAuthorizedDomainEvent
  | PaymentRejectedDomainEvent
  | PaymentCapturedDomainEvent;
```

`EventBase` pone `eventName`, `eventId` y `occurredOn` (texto ISO en UTC, del `clock` que recibe el método del agregado); la identidad del pago es un campo más del evento (`paymentId`), declarado por cada clase. `{ ...event }` da `eventName`, `eventId`, `occurredOn` y los campos, todos datos primitivos (regla del paquete, no comprobada en ejecución): esa es la fila del stream.

## Agregado con decidir y aplicar

`[Fuera de los libros como código; estructura basada en IDDD apéndice A]`

```ts
import { AggregateRoot, DateType, DomainException, EnumType, IdType, Required, StringType, UuidType } from '@archi-code/ddd/domain';

export class PaymentId extends IdType<'PaymentId'> {}
export class OrderReference extends Required(UuidType) {}
export class AuthorizationCode extends Required(StringType) {}
export class RejectionReason extends Required(StringType) {}
export class ExpiresAt extends Required(DateType) {}

// value-object/PaymentStatusType.ts
export enum PaymentStatus {
  REQUESTED = 'requested',
  AUTHORIZED = 'authorized',
  REJECTED = 'rejected',
  CAPTURED = 'captured',
}

export class PaymentStatusOption extends EnumType<PaymentStatus> {
  protected getEnum(): typeof PaymentStatus {
    return PaymentStatus;
  }
}

export class PaymentStatusType extends Required(PaymentStatusOption) {}

// exception/*.ts
export class PaymentNotAuthorized extends DomainException {
  constructor(paymentId: string) {
    super(`Payment ${paymentId} is not authorized`, ['PAY002']);
  }
}

export class AuthorizationExpired extends DomainException {
  constructor(paymentId: string) {
    super(`The authorization of payment ${paymentId} has expired`, ['PAY003']);
  }
}

export class PaymentAlreadyDecided extends DomainException {
  constructor(paymentId: string) {
    super(`Payment ${paymentId} was already authorized or rejected`, ['PAY004']);
  }
}

// aggregate/Payment.ts
interface Clock {
  now(): Date;
}

export class Payment extends AggregateRoot<PaymentId, PaymentEvent> {
  private status = new PaymentStatusType(PaymentStatus.REQUESTED);
  private amount: Money | null = null;
  private expiresAt: ExpiresAt | null = null;
  private replayed = 0;

  constructor(id: PaymentId) {
    super(id);
  }

  static create(id: PaymentId, order: OrderReference, amount: Money, clock: Clock): Payment {
    const payment = new Payment(id);
    payment.emit(
      new PaymentCreatedDomainEvent({
        paymentId: id.value,
        orderId: order.value,
        amount: amount.toPrimitives(),
        clock,
      }),
    );
    return payment;
  }

  static fromHistory(id: PaymentId, history: readonly PaymentEvent[]): Payment {
    const payment = new Payment(id);
    history.forEach((event) => payment.apply(event));
    payment.replayed = history.length;
    return payment;
  }

  streamVersion(): number {
    return this.replayed;
  }

  authorize(code: AuthorizationCode, expiresAt: ExpiresAt, clock: Clock): void {
    if (!this.isIn(PaymentStatus.REQUESTED)) {
      throw new PaymentAlreadyDecided(this.id.value);
    }
    this.emit(
      new PaymentAuthorizedDomainEvent({
        paymentId: this.id.value,
        authorizationCode: code.value,
        expiresAt: expiresAt.value.toISOString(),
        clock,
      }),
    );
  }

  reject(reason: RejectionReason, clock: Clock): void {
    if (!this.isIn(PaymentStatus.REQUESTED)) {
      throw new PaymentAlreadyDecided(this.id.value);
    }
    this.emit(new PaymentRejectedDomainEvent({ paymentId: this.id.value, reason: reason.value, clock }));
  }

  capture(clock: Clock): void {
    if (!this.isIn(PaymentStatus.AUTHORIZED) || this.expiresAt === null) {
      throw new PaymentNotAuthorized(this.id.value);
    }
    if (this.expiresAt.value < clock.now()) {
      throw new AuthorizationExpired(this.id.value);
    }
    this.emit(new PaymentCapturedDomainEvent({ paymentId: this.id.value, clock }));
  }

  private isIn(status: PaymentStatus): boolean {
    return this.status.value === status;
  }

  private emit(event: PaymentEvent): void {
    this.apply(event);
    this.record(event);
  }

  private apply(event: PaymentEvent): void {
    if (event instanceof PaymentCreatedDomainEvent) {
      this.amount = Money.fromPrimitives(event.amount);
    } else if (event instanceof PaymentAuthorizedDomainEvent) {
      this.status = new PaymentStatusType(PaymentStatus.AUTHORIZED);
      this.expiresAt = new ExpiresAt(event.expiresAt);
    } else if (event instanceof PaymentRejectedDomainEvent) {
      this.status = new PaymentStatusType(PaymentStatus.REJECTED);
    } else {
      this.status = new PaymentStatusType(PaymentStatus.CAPTURED);
    }
  }
}
```

`Money` es el composite de `shared-kernel/money/` (`Cents` y `MoneyCurrency`, ver `ddd-skills/ddd-agregados/references/implementacion-ts.md`).

Reglas:
* `apply` no valida ni lanza: los eventos son hechos ya ocurridos [Destilado cap. 6].
* Las reglas viven en los métodos de comando (`authorize`, `capture`), antes de emitir, y lanzan errores de negocio (subclases de `DomainException` sin sufijo `Exception`, con su código).
* El estado solo cambia vía eventos: `emit` aplica y después llama a `record` (protegido en `AggregateRoot`), así que `pullDomainEvents()` devuelve exactamente los cambios pendientes, en orden.
* `fromHistory` aplica sin `record`: reconstituir no genera eventos nuevos.
* El reloj se recibe con la interfaz local `Clock` (`{ now(): Date }`, sin importar el puerto de `/application`) y se pasa a cada evento (`clock`), para que reconstruir no dependa de la hora actual; en pruebas, `FixedClock`.
* IDDD propone separar estado y comportamiento en dos clases que solo colaboran a través de `apply` [IDDD apéndice A]; aquí el estado son campos privados de value objects que solo `apply` escribe. Si el agregado crece, extrae ese estado a una clase propia con su `apply`.
* `[Fuera de los libros: convención de @archi-code/ddd]` `AggregateRoot` no tiene versión, y la que recuerda un repositorio de instantáneas en su `WeakMap` cuenta guardados, no eventos (crece 1 por `save`), así que este agregado lleva su propia versión de stream (`streamVersion()`, los eventos que se aplicaron al cargar) y no se guarda como instantánea: no necesita `toPrimitives()`/`fromPrimitives()` ni getters para sus campos, porque lo que se persiste son los eventos. Por eso su constructor público recibe solo el id: el resto del estado lo ponen los eventos, a través de `create` (que emite `PaymentCreatedDomainEvent`) o de `fromHistory`.

## Event store

Un stream por agregado, identificado por la identidad de la raíz; almacenamiento solo de anexión con cualquier tecnología que ofrezca consistencia fuerte [IDDD apéndice A; Destilado cap. 6].

```sql
CREATE TABLE event_streams (
  stream_id    TEXT      NOT NULL,
  version      INT       NOT NULL,
  body         JSONB     NOT NULL,
  global_seq   BIGSERIAL UNIQUE,
  PRIMARY KEY (stream_id, version)
);
```

La clave primaria `(stream_id, version)` impide dos escrituras con la misma versión; `global_seq` da el orden global que necesitan la publicación y la reconstrucción de proyecciones. `body` es la copia plana del evento (`{ ...event }`).

El dominio declara el contrato del stream (solo tipos, como los contratos de repositorio del paquete) `[Fuera de los libros: convención de @archi-code/ddd]`: no es `AggregateFinder`/`AggregateSaver`, porque guardar necesita los cambios que el caso de uso ya sacó con `pullDomainEvents()` para publicarlos.

```ts
export interface PaymentStream {
  load(id: PaymentId): Promise<Payment | null>;
  append(payment: Payment, changes: readonly PaymentEvent[]): Promise<void>;
}
```

La infraestructura lo implementa: reconstruye cada fila con `EventRegistry.fromJSON` (que conserva `eventId` y `occurredOn`), anexa todos los eventos de un `append` en una sola transacción que abre y cierra con su propia conexión, y traduce la violación de la clave primaria a `ConcurrencyException`. Como cualquier repositorio del paquete, el stream es responsable de todo lo de persistencia: la escritura atómica del stream con su versión esperada, la conexión y los errores del driver `[Fuera de los libros: convención de @archi-code/ddd]`.

```ts
import type { SerializedEvent } from '@archi-code/ddd/domain';
import { EventRegistry, InternalErrorException } from '@archi-code/ddd/infrastructure';
import { ConcurrencyException } from '@archi-code/ddd/application';

export const paymentEvents = new EventRegistry<PaymentEvent>()
  .register(
    PaymentCreatedDomainEvent,
    (json) =>
      new PaymentCreatedDomainEvent({
        paymentId: json.paymentId as string,
        orderId: json.orderId as string,
        amount: json.amount as { amount: number; currency: string },
        eventId: json.eventId,
        occurredOn: json.occurredOn,
      }),
  )
  .register(
    PaymentAuthorizedDomainEvent,
    (json) =>
      new PaymentAuthorizedDomainEvent({
        paymentId: json.paymentId as string,
        authorizationCode: json.authorizationCode as string,
        expiresAt: json.expiresAt as string,
        eventId: json.eventId,
        occurredOn: json.occurredOn,
      }),
  )
  .register(
    PaymentRejectedDomainEvent,
    (json) =>
      new PaymentRejectedDomainEvent({
        paymentId: json.paymentId as string,
        reason: json.reason as string,
        eventId: json.eventId,
        occurredOn: json.occurredOn,
      }),
  )
  .register(
    PaymentCapturedDomainEvent,
    (json) =>
      new PaymentCapturedDomainEvent({
        paymentId: json.paymentId as string,
        eventId: json.eventId,
        occurredOn: json.occurredOn,
      }),
  );

interface SqlClient {
  query<Row>(text: string, values: readonly unknown[]): Promise<{ rows: Row[] }>;
}

interface PoolClient extends SqlClient {
  release(): void;
}

interface Pool extends SqlClient {
  connect(): Promise<PoolClient>;
}

export class PgPaymentStream implements PaymentStream {
  constructor(
    private readonly pool: Pool,
    private readonly registry: EventRegistry<PaymentEvent>,
  ) {}

  async load(id: PaymentId): Promise<Payment | null> {
    const { rows } = await this.pool.query<{ body: SerializedEvent }>(
      'SELECT body FROM event_streams WHERE stream_id = $1 ORDER BY version',
      [id.value],
    );
    if (rows.length === 0) {
      return null;
    }
    return Payment.fromHistory(
      id,
      rows.map((row) => this.registry.fromJSON(row.body)),
    );
  }

  async append(payment: Payment, changes: readonly PaymentEvent[]): Promise<void> {
    const expected = payment.streamVersion();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN', []);
      for (const [index, event] of changes.entries()) {
        await client.query(
          'INSERT INTO event_streams (stream_id, version, body) VALUES ($1, $2, $3)',
          [payment.id.value, expected + index + 1, JSON.stringify(event)],
        );
      }
      await client.query('COMMIT', []);
    } catch (error) {
      await client.query('ROLLBACK', []);
      if ((error as { code?: string }).code === '23505') {
        throw new ConcurrencyException('Payment', payment.id.value, expected, { cause: error });
      }
      throw new InternalErrorException('appending payment events', { cause: error });
    } finally {
      client.release();
    }
  }
}
```

`Pool` y `SqlClient` son la parte de `pg` que usa el adaptador, declarada de forma estructural. La transacción empieza y termina dentro de `append`: o entran todos los eventos del cambio o ninguno, y la aplicación no ve ninguna transacción. `'23505'` es el código de violación de unicidad de PostgreSQL; con otro motor, comprueba el suyo.

## Caso de uso y reintento

El caso de uso carga, decide, anexa y publica; no abre transacciones ni recibe un puerto para ello. Ante un conflicto puede reintentar recargando y reejecutando el comando contra el estado nuevo, como propone IDDD [IDDD apéndice A]; si el comando ya no es válido, el error de negocio sale normalmente. `[Fuera de los libros: convención de @archi-code/ddd]` El stream solo carga y anexa; el bucle de reintento va en el `handle` del caso de uso, cada intento vuelve a cargar y vuelve a anexar, unos pocos intentos y después relanza la `ConcurrencyException` (`ExceptionKind.Conflict`, 409 en HTTP). Reintenta solo comandos seguros de repetir; un caso de uso por reacción no lleva este bucle: el reintento lo hace la reentrega del canal.

```ts
import { AggregateNotFoundException, ConcurrencyException, UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';

export interface CapturePaymentInput {
  paymentId: string;
}

export interface CapturePaymentCommand {
  paymentId: PaymentId;
}

export class CapturePayment extends UseCase<CapturePaymentInput, CapturePaymentCommand, void> {
  private static readonly ATTEMPTS = 3;

  constructor(
    private readonly payments: PaymentStream,
    private readonly events: EventBus<PaymentEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: CapturePaymentInput): CapturePaymentCommand {
    return ValueObjectBuilder.build({ paymentId: () => new PaymentId(input.paymentId) });
  }

  protected async handle({ paymentId }: CapturePaymentCommand): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const payment = await this.payments.load(paymentId);
        if (payment === null) {
          throw new AggregateNotFoundException('Payment', paymentId.value);
        }
        payment.capture(this.clock);
        const changes = payment.pullDomainEvents();
        await this.payments.append(payment, changes);
        await this.events.publish(changes);
        return;
      } catch (error) {
        if (!(error instanceof ConcurrencyException) || attempt === CapturePayment.ATTEMPTS) {
          throw error;
        }
      }
    }
  }
}
```

Publicar: IDDD publica con un proceso en segundo plano que lee lo anexado [IDDD apéndice A]. Con el paquete, el caso de uso solo ve el puerto `EventBus`; el `DomainEventBus` de la composición envía a un `EventChannel`. Si `publish` falla después de `append`, los eventos ya están en el stream pero no se entregan. Para no perder ninguno, el propio `event_streams` hace de bandeja, porque `append` ya los guardó en su escritura atómica: un reenviador lee por `global_seq` y entrega los `SerializedEvent` a los manejadores que registró `receive`, y el canal que recibe el bus del caso de uso no escribe nada en su `send` (los eventos ya están guardados) y delega `receive` en el canal del reenviador. Es persistencia y entrega, así que vive en la infraestructura; los casos de uso no cambian `[Fuera de los libros: convención de @archi-code/ddd]`.

## Pruebas en memoria

Una implementación en memoria del stream sirve como doble de pruebas y como referencia del contrato; anexa todos los cambios de una vez o ninguno, como `PgPaymentStream`:

```ts
import { DomainEventBus, FixedClock, InMemoryEventChannel } from '@archi-code/ddd/infrastructure';

export class InMemoryPaymentStream implements PaymentStream {
  private readonly streams = new Map<string, readonly SerializedEvent[]>();

  constructor(private readonly registry: EventRegistry<PaymentEvent>) {}

  async load(id: PaymentId): Promise<Payment | null> {
    const stream = this.streams.get(id.value);
    if (stream === undefined) {
      return null;
    }
    return Payment.fromHistory(
      id,
      stream.map((json) => this.registry.fromJSON(json)),
    );
  }

  async append(payment: Payment, changes: readonly PaymentEvent[]): Promise<void> {
    const stream = this.streams.get(payment.id.value) ?? [];
    if (stream.length !== payment.streamVersion()) {
      throw new ConcurrencyException('Payment', payment.id.value, payment.streamVersion());
    }
    this.streams.set(payment.id.value, [...stream, ...changes.map((event) => ({ ...event }))]);
  }
}

const clock = new FixedClock('2026-10-19T09:30:00Z');
const payments = new InMemoryPaymentStream(paymentEvents);
const channel = new InMemoryEventChannel();
const bus = new DomainEventBus<PaymentEvent>(channel, paymentEvents);

const paymentId = PaymentId.generate();
const payment = Payment.create(
  paymentId,
  new OrderReference('9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c'),
  Money.fromPrimitives({ amount: 4990, currency: 'EUR' }),
  clock,
);
payment.authorize(
  new AuthorizationCode('AUTH-7731'),
  new ExpiresAt(new Date('2026-10-26T09:30:00Z')),
  clock,
);
await payments.append(payment, payment.pullDomainEvents());

await new CapturePayment(payments, bus, clock).execute({
  paymentId: paymentId.value,
});
channel.sent.map((event) => event.eventName); // ['payment.captured']
(await payments.load(paymentId))?.streamVersion(); // 3
```

Ejecuta las mismas pruebas de contrato (carga lo anexado, rechaza una versión esperada antigua con `ConcurrencyException`) contra `InMemoryPaymentStream` y `PgPaymentStream`, como el contrato de repositorio de `ddd-skills/ddd-repositorios-persistencia/GUIA.md`.

## Snapshots

Para streams largos, guarda periódicamente el estado serializado con su versión y carga desde ahí más los eventos posteriores [IDDD apéndice A; Destilado cap. 6]. Los snapshots son una optimización desechable: si cambia la forma del estado, se borran y se regeneran. El paquete no los trae: son una tabla más de tu infraestructura (`stream_id`, `version`, `state`) y una fábrica del agregado que parte del estado y aplica solo los eventos con versión mayor, dejando `streamVersion()` en la versión del último evento aplicado.

## Versionado de eventos

`[Fuera de los libros]` Los eventos del stream no se reescriben. Para cambiar su forma, convierte las versiones antiguas al leer ("upcasting") en el deserializador, o añade un tipo de evento nuevo. El apéndice de IDDD trata los serializadores (por ejemplo Protocol Buffers) como apoyo para esta evolución [IDDD apéndice A].

Con el paquete, los eventos no llevan número de versión: la fábrica del `EventRegistry` recibe cada fila tal como se guardó, así que el upcasting va ahí y reconoce la forma antigua por sus campos; un cambio que no se pueda leer así se publica como un evento nuevo con otro `eventName` (`'payment.created_v2'`). Por ejemplo, si una primera forma de `PaymentCreatedDomainEvent` guardaba `amountCents` en euros:

```ts
new EventRegistry<PaymentEvent>().register(
  PaymentCreatedDomainEvent,
  (json) =>
    new PaymentCreatedDomainEvent({
      paymentId: json.paymentId as string,
      orderId: json.orderId as string,
      amount:
        typeof json.amountCents === 'number'
          ? { amount: json.amountCents, currency: 'EUR' }
          : (json.amount as { amount: number; currency: string }),
      eventId: json.eventId,
      occurredOn: json.occurredOn,
    }),
);
```

Pasa siempre `eventId: json.eventId` y `occurredOn: json.occurredOn`: el evento reconstruido conserva su `eventId` y su `occurredOn`, y `fromJSON` lanza `InternalErrorException` si la fábrica los pierde.
