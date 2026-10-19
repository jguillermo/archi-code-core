# Event Sourcing en TypeScript

## Agregado con decidir y aplicar

`[Fuera de los libros como código; estructura basada en IDDD apéndice A]`

```ts
type PaymentEvent =
  | { type: 'PaymentRequested'; paymentId: string; orderId: string; amount: MoneyJSON; at: string }
  | { type: 'PaymentAuthorized'; paymentId: string; authorizationCode: string; expiresAt: string; at: string }
  | { type: 'PaymentRejected'; paymentId: string; reason: string; at: string }
  | { type: 'PaymentCaptured'; paymentId: string; at: string };

class PaymentState {
  status: 'REQUESTED' | 'AUTHORIZED' | 'REJECTED' | 'CAPTURED' = 'REQUESTED';
  amount!: Money;
  expiresAt: Date | null = null;

  apply(e: PaymentEvent): void {                 // solo cambia estado; nunca lanza errores de negocio
    switch (e.type) {
      case 'PaymentRequested': this.amount = Money.fromJSON(e.amount); break;
      case 'PaymentAuthorized': this.status = 'AUTHORIZED'; this.expiresAt = new Date(e.expiresAt); break;
      case 'PaymentRejected': this.status = 'REJECTED'; break;
      case 'PaymentCaptured': this.status = 'CAPTURED'; break;
    }
  }
}

export class Payment {
  private readonly state = new PaymentState();
  private readonly changes: PaymentEvent[] = [];

  private constructor(readonly id: PaymentId, history: PaymentEvent[]) {
    history.forEach((e) => this.state.apply(e));   // reconstitución
  }

  static fromHistory(id: PaymentId, history: PaymentEvent[]): Payment {
    return new Payment(id, history);
  }

  static request(id: PaymentId, orderId: OrderId, amount: Money, clock: Clock): Payment {
    const p = new Payment(id, []);
    p.emit({ type: 'PaymentRequested', paymentId: id.value, orderId: orderId.value, amount: amount.toJSON(), at: clock.now().toISOString() });
    return p;
  }

  capture(clock: Clock): void {                    // decidir: reglas y luego evento
    if (this.state.status !== 'AUTHORIZED') throw new PaymentNotAuthorized(this.id);
    if (this.state.expiresAt! < clock.now()) throw new AuthorizationExpired(this.id);
    this.emit({ type: 'PaymentCaptured', paymentId: this.id.value, at: clock.now().toISOString() });
  }

  pendingChanges(): readonly PaymentEvent[] { return this.changes; }

  private emit(e: PaymentEvent): void {
    this.state.apply(e);                           // el estado solo cambia vía eventos
    this.changes.push(e);
  }
}
```

Reglas:
* `apply` no valida ni lanza: los eventos son hechos ya ocurridos [Destilado cap. 6].
* Las reglas viven en los métodos de comando, antes de emitir.
* El reloj se inyecta para que reconstruir no dependa de la hora actual.

## Event store

Un stream por agregado, identificado por la identidad de la raíz; almacenamiento solo de anexión con cualquier tecnología que ofrezca consistencia fuerte [IDDD apéndice A; Destilado cap. 6].

```sql
CREATE TABLE event_streams (
  stream_id    TEXT        NOT NULL,
  version      INT         NOT NULL,
  type_name    TEXT        NOT NULL,
  body         JSONB       NOT NULL,
  occurred_on  TIMESTAMPTZ NOT NULL,
  global_seq   BIGSERIAL   UNIQUE,     -- para proyecciones y publicación en orden
  PRIMARY KEY (stream_id, version)     -- la clave primaria impide dos escrituras con la misma versión
);
```

```ts
export class PgEventStore {
  async load(streamId: string): Promise<{ version: number; events: unknown[] }> {
    const { rows } = await this.db.query(`SELECT version, body FROM event_streams WHERE stream_id=$1 ORDER BY version`, [streamId]);
    return { version: rows.at(-1)?.version ?? 0, events: rows.map((r) => r.body) };
  }

  async append(streamId: string, expectedVersion: number, events: readonly { type: string }[]): Promise<void> {
    try {
      await this.tx.run(async () => {
        let v = expectedVersion;
        for (const e of events) {
          await this.tx.current().query(
            `INSERT INTO event_streams (stream_id, version, type_name, body, occurred_on) VALUES ($1,$2,$3,$4, now())`,
            [streamId, ++v, e.type, e]);
        }
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new EventStoreConcurrencyConflict(streamId, expectedVersion);
      throw err;
    }
  }
}
```

## Repositorio y reintento

```ts
export class EventSourcedPaymentRepository {
  constructor(private readonly store: PgEventStore) {}

  async update(id: PaymentId, execute: (p: Payment) => void, maxAttempts = 3): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      const { version, events } = await this.store.load(id.value);
      const payment = Payment.fromHistory(id, events as PaymentEvent[]);
      execute(payment);
      try {
        await this.store.append(id.value, version, payment.pendingChanges());
        return;
      } catch (e) {
        if (!(e instanceof EventStoreConcurrencyConflict) || attempt >= maxAttempts) throw e;
      }
    }
  }
}
```

El reintento recarga y vuelve a ejecutar el comando contra el estado nuevo, como propone IDDD [IDDD apéndice A]. Si el comando ya no es válido, el error de negocio sale normalmente. Con el paquete, el repositorio solo carga y anexa (`load`/`append`); el bucle de reintento va en el `handle` del caso de uso, cada intento en un `transactions.run` nuevo `[Fuera de los libros: convención de @archi-code/ddd]`.

## Snapshots

Para streams largos, guarda periódicamente el estado serializado con su versión y carga desde ahí más los eventos posteriores [IDDD apéndice A; Destilado cap. 6]. Los snapshots son una optimización desechable: si cambia la forma del estado, se borran y se regeneran.

## Versionado de eventos

`[Fuera de los libros]` Los eventos del stream no se reescriben. Para cambiar su forma, convierte las versiones antiguas al leer ("upcasting") en el deserializador, o añade un tipo de evento nuevo. El apéndice de IDDD trata los serializadores (por ejemplo Protocol Buffers) como apoyo para esta evolución [IDDD apéndice A].
