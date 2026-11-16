# Event Sourcing en TypeScript

Código del proyecto sobre las clases del paquete; solo en los agregados que justifique `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.

## Eventos del stream

Como cualquier evento del paquete: `PaymentAuthorizedDomainEvent extends EventBase`, `eventName = 'payment.authorized'`, campos primitivos `readonly` (`paymentId`, `authorizationCode`, `expiresAt` ISO), constructor `{ …campos } & EventMetadata` [IDDD cap. 8] `[Fuera de los libros: convención de @archi-code/ddd]`. Nacen sin `occurredOn`; se lo pone el stream al anexar (y `DomainEventBus` al publicar), así que reconstruir no depende de la hora actual.

## Agregado con decidir y aplicar

`[Fuera de los libros como código; estructura basada en IDDD apéndice A]`

```ts
export class Payment extends AggregateRoot<PaymentId> {
  private status = new PaymentStatusType(PaymentStatus.REQUESTED);
  private expiresAt: ExpiresAt | null = null;
  private replayed = 0;

  constructor(id: PaymentId) {
    super(id);
  }

  static create(id: PaymentId, order: OrderReference, amount: Money): Payment {
    const payment = new Payment(id);
    payment.emit(new PaymentCreatedDomainEvent({ paymentId: id.value, orderId: order.value, amount: amount.toPrimitives() }));
    return payment;
  }

  static fromHistory(id: PaymentId, history: readonly EventBase[]): Payment {
    const payment = new Payment(id);
    history.forEach((event) => payment.apply(event));
    payment.replayed = history.length;
    return payment;
  }

  streamVersion(): number {
    return this.replayed;
  }

  capture(): void {
    if (this.status.value !== PaymentStatus.AUTHORIZED || this.expiresAt === null) {
      throw new PaymentNotAuthorized(this.id.value);
    }
    if (this.expiresAt.value < UpdatedAt.now().value) {
      throw new AuthorizationExpired(this.id.value);
    }
    this.emit(new PaymentCapturedDomainEvent({ paymentId: this.id.value }));
  }

  private emit(event: EventBase): void {
    this.apply(event);
    this.record(event);
  }

  private apply(event: EventBase): void {
    if (event instanceof PaymentAuthorizedDomainEvent) {
      this.status = new PaymentStatusType(PaymentStatus.AUTHORIZED);
      this.expiresAt = new ExpiresAt(event.expiresAt);
    } else if (event instanceof PaymentCapturedDomainEvent) {
      this.status = new PaymentStatusType(PaymentStatus.CAPTURED);
    }
  }
}
```

* `apply` no valida ni lanza: los eventos son hechos [Destilado cap. 6]. Las reglas van en los comandos, antes de emitir, con errores de negocio.
* El estado solo cambia por eventos: `emit` aplica y luego `record`, así que `pullDomainEvents()` devuelve exactamente los cambios pendientes, en orden. `fromHistory` aplica sin `record`: reconstituir no genera eventos.
* La hora actual sale de `UpdatedAt.now()`; nada la recibe como parámetro.
* IDDD separa estado y comportamiento en dos clases [IDDD apéndice A]; aquí, campos privados que solo escribe `apply`; si el agregado crece, extrae ese estado a una clase con su `apply`.
* Sin `toPrimitives()`/`fromPrimitives()` ni getters: se persisten los eventos; el constructor recibe solo el id y el resto lo ponen los eventos (`create` emite `PaymentCreatedDomainEvent`, o `fromHistory`). Su versión es `streamVersion()`, nunca la de guardados de un repositorio de instantáneas `[Fuera de los libros: convención de @archi-code/ddd]`.

## Event store

Un stream por agregado, solo anexión, consistencia fuerte [IDDD apéndice A; Destilado cap. 6]:

```sql
CREATE TABLE event_streams (
  stream_id TEXT NOT NULL, version INT NOT NULL, body JSONB NOT NULL,
  global_seq BIGSERIAL UNIQUE, PRIMARY KEY (stream_id, version)
);
```

La clave primaria impide dos escrituras con la misma versión; `global_seq` da el orden global para publicar y reconstruir. Contrato en el dominio, de solo tipos; no es un `AggregateRepository` con `findById`/`save` porque anexar necesita los cambios que el caso de uso ya sacó con `pullDomainEvents()` para publicarlos `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
export interface PaymentStream {
  load(id: PaymentId): Promise<Payment | null>;
  append(payment: Payment, changes: readonly EventBase[]): Promise<void>;
}
```

`PgPaymentStream`: `load` lee `ORDER BY version` y hace `Payment.fromHistory(id, rows.map((row) => registry.fromJSON(row.body)))`. `append` abre su transacción, inserta cada cambio con versión `payment.streamVersion() + index + 1` y `{ ...event, occurredOn: event.occurredOn ?? appendedOn }`, confirma, y traduce la violación de unicidad (`'23505'` en PostgreSQL) a `ConcurrencyException('Payment', id, expected, { cause })`; otros errores a `InternalErrorException`. La transacción empieza y termina dentro de `append` (todos los eventos o ninguno) y la aplicación no la ve.

## Caso de uso y reintento

Reintentar recargando contra el estado nuevo [IDDD apéndice A]; si el comando ya no es válido, sale el error de negocio y, agotados los intentos, la `ConcurrencyException` (`Conflict`, 409); el bucle va en `handle`, pocos intentos, solo comandos seguros de repetir; una reacción no reintenta `[Fuera de los libros: convención de @archi-code/ddd]`:

```ts
protected async handle({ paymentId }: CapturePaymentCommand): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const payment = await this.payments.load(paymentId);
      if (payment === null) {
        throw new AggregateNotFoundException('Payment', paymentId.value);
      }
      payment.capture();
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
```

Si `publish` falla tras `append`, los eventos ya están en el stream: un reenviador por `global_seq` los entrega por un `EventChannel`; el canal del bus del caso de uso no escribe nada en `send` (ya están guardados) y delega `receive` en el del reenviador [IDDD apéndice A] `[Fuera de los libros: convención de @archi-code/ddd]`.

## Pruebas

`InMemoryPaymentStream` (un `Map<string, SerializedEvent[]>` que rechaza con `ConcurrencyException` si `stream.length !== payment.streamVersion()` y anexa todo o nada) y la misma suite (carga lo anexado, rechaza una versión esperada antigua) de contrato contra él y `PgPaymentStream`, como en `ddd-skills/ddd-repositorios-persistencia/GUIA.md`.

## Snapshots

Estado serializado con su versión; cargar desde ahí más los eventos posteriores [IDDD apéndice A; Destilado cap. 6]. Desechables: si cambia la forma, se borran y regeneran. Con el paquete, una tabla del proyecto (`stream_id`, `version`, `state`) y una fábrica que parte del estado y aplica solo los eventos de versión mayor, dejando `streamVersion()` en el último aplicado.

## Versionado

`[Fuera de los libros]` Los eventos del stream no se reescriben: upcasting al leer o evento nuevo [IDDD apéndice A]. Con el paquete, el upcasting va en la fábrica del `EventRegistry`, que reconoce la forma antigua por sus campos (`typeof json.amountCents === 'number'`), o se usa otro `eventName` (`'payment.created_v2'`). Siempre `eventId: json.eventId` y `occurredOn: json.occurredOn`: `fromJSON` lanza `InternalErrorException` si la fábrica los pierde.
