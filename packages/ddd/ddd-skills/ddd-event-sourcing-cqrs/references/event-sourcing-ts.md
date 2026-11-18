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

## Guardar el stream

La guía no fija cómo se guarda el stream. No existe un contrato de stream en el dominio (`PaymentStream` con `load`/`append`): sería un puerto de dominio, y no existen; lo único del dominio que implementa la infraestructura es el repositorio abstracto de un agregado `[Fuera de los libros: convención de @archi-code/ddd]`. Lo que sí vale para cualquier forma de guardarlo [IDDD apéndice A; Destilado cap. 6]: un stream por agregado, solo anexión, todos los eventos de un guardado o ninguno, y un conflicto de versión (`ConcurrencyException`) cuando otro escribió antes.

## Snapshots

Estado serializado con su versión; cargar desde ahí más los eventos posteriores [IDDD apéndice A; Destilado cap. 6]. Desechables: si cambia la forma, se borran y regeneran. Con el paquete, una tabla del proyecto (`stream_id`, `version`, `state`) y una fábrica que parte del estado y aplica solo los eventos de versión mayor, dejando `streamVersion()` en el último aplicado.

## Versionado

`[Fuera de los libros]` Los eventos del stream no se reescriben: upcasting al leer o evento nuevo [IDDD apéndice A]. Con el paquete, el upcasting va en la fábrica del `EventRegistry`, que reconoce la forma antigua por sus campos (`typeof json.amountCents === 'number'`), o se usa otro `eventName` (`'payment.created_v2'`). Siempre `eventId: json.eventId` y `occurredOn: json.occurredOn`: `fromJSON` lanza `InternalErrorException` si la fábrica los pierde.
