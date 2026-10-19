# Consistencia eventual entre agregados

## Mecanismo básico

Un método de comando del agregado publica (o registra) un evento de dominio. Uno o varios suscriptores asíncronos lo reciben; cada uno carga **otro** agregado y ejecuta su comportamiento en **su propia transacción** [IDDD cap. 10; Destilado cap. 5].

El suscriptor puede estar en el mismo contexto (en el ejemplo del libro, `Sprint` reacciona a `BacklogItemCommitted` creando un `CommittedBacklogItem`) o en otro. Para el mismo contexto no hace falta un middleware de mensajería, aunque es fácil usarlo si ya existe [Destilado cap. 5].

## Fallos y reintentos

* Si el suscriptor falla por concurrencia, no confirma el mensaje; el mecanismo lo reenvía y se reintenta en una nueva transacción, hasta lograrlo o hasta un límite de reintentos [IDDD cap. 10].
* Si falla del todo: compensar o, como mínimo, informar del fallo para intervención [IDDD cap. 10]. Con el paquete, `OutboxRelay` cuenta los fallos, aparta el evento al llegar a `maxAttempts` y llama a `onParked` `[Fuera de los libros: convención de @archi-code/ddd]`.
* El suscriptor debe ser idempotente: la mensajería entrega al menos una vez [Destilado cap. 4].

## No crear asociaciones bidireccionales

El evento no está para mantener un puntero inverso sin sentido. En IDDD, `BacklogItem` ya conoce su `SprintId`; el evento sirve para que `Sprint` registre el compromiso con su propio orden, que es un concepto suyo [IDDD cap. 10].

## Políticas: el nombre del lenguaje para "cuando pase X, haz Y"

`[Fuera de los libros como término; en Event Storming son las notas lila de proceso, Destilado cap. 7]`

```ts
/** Política de Ventas: cuando Almacén reserva stock, se registra en el pedido. */
export class RegisterReservationOnOrder {
  constructor(private readonly orders: OrderRepository, private readonly tx: TransactionRunner) {}

  async when(event: StockReservedV1): Promise<void> {
    await this.tx.run(async () => {
      const order = await this.orders.byId(OrderId.of(event.orderId));
      if (!order) return;                                     // pedido de otro canal: no es nuestro
      order.registerStockReservation(ReservationId.of(event.reservationId));
      await this.orders.save(order);                          // un agregado, una transacción
    });
  }
}
```

Reglas para políticas:
* Una política, un agregado modificado.
* Nombre con el lenguaje del negocio (`RegisterReservationOnOrder`), no `StockReservedHandler`. Con el paquete, la política se parte en un listener `<Acción>On<Evento>` (`RegisterReservationOnStockReserved`, con `@ListensTo`) que solo traduce el evento a la entrada de un caso de uso, y ese caso de uso carga, invoca y guarda `[Fuera de los libros: convención de @archi-code/ddd]`.
* La regla de negocio está en el agregado; la política solo lo invoca.
* El método invocado no lanza errores de negocio (ver "Comandos frente a hechos" en `ddd-skills/ddd-agregados/references/implementacion-ts.md`). Los errores técnicos (base de datos caída, conflicto de versión) sí se propagan para que la mensajería reintente.

## Plazos y lo que ve el usuario

Si negocio acepta "en 30 segundos", el sistema debe comportarse bien durante esos 30 segundos:
* Estados intermedios explícitos en el modelo (`Pending`) [IDDD cap. 3 trata la indisponibilidad como estado válido].
* Mensajes al usuario que reflejen el estado ("Estamos confirmando tu pedido").
* Un temporizador o rastreador de plazo para el caso en que no llegue nunca (ver procesos en `ddd-skills/ddd-context-mapping/GUIA.md`).

## Procesos con varios pasos

Cuando hay varios agregados y plazos, un objeto de proceso con su propio estado (confirmación del pedido: esperando reserva y pago, confirmado, fallido, caducado) coordina los pasos [IDDD cap. 13]. Ese objeto es en sí un agregado pequeño: se modifica solo, en su transacción, al recibir cada evento.
