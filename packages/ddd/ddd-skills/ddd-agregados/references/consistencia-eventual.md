# Consistencia eventual entre agregados

## Mecanismo básico

Un método de comando del agregado publica (o registra) un evento de dominio. Uno o varios suscriptores asíncronos lo reciben; cada uno carga **otro** agregado y ejecuta su comportamiento en **su propia transacción** [IDDD cap. 10; Destilado cap. 5].

El suscriptor puede estar en el mismo contexto (en el ejemplo del libro, `Sprint` reacciona a `BacklogItemCommitted` creando un `CommittedBacklogItem`) o en otro. Para el mismo contexto no hace falta un middleware de mensajería, aunque es fácil usarlo si ya existe [Destilado cap. 5].

## Fallos y reintentos

* Si el suscriptor falla por concurrencia, no confirma el mensaje; el mecanismo lo reenvía y se reintenta en una nueva transacción, hasta lograrlo o hasta un límite de reintentos [IDDD cap. 10].
* Si falla del todo: compensar o, como mínimo, informar del fallo para intervención [IDDD cap. 10].
* El suscriptor debe ser idempotente: la mensajería entrega al menos una vez [Destilado cap. 4].

## No crear asociaciones bidireccionales

El evento no está para mantener un puntero inverso sin sentido. En IDDD, `BacklogItem` ya conoce su `SprintId`; el evento sirve para que `Sprint` registre el compromiso con su propio orden, que es un concepto suyo [IDDD cap. 10].

## Políticas: el nombre del lenguaje para "cuando pase X, haz Y"

`[Fuera de los libros como término; en Event Storming son las notas lila de proceso, Destilado cap. 7]`

Con `@archi-code/ddd` una política son dos piezas de la capa de aplicación `[Fuera de los libros: convención de @archi-code/ddd]`: un **listener** que traduce el evento a la entrada de un caso de uso, y el **caso de uso** que carga, invoca y guarda el agregado.

```ts
/** Política de Ventas: cuando Almacén reserva stock, se registra en el pedido. */
@ListensTo(StockReserved)
export class RegisterReservationOnStockReserved extends EventListener<StockReserved> {
  constructor(private readonly registerReservation: RegisterReservation) {
    super();
  }

  async handle(event: StockReserved): Promise<void> {
    await this.registerReservation.execute({ orderId: event.orderId, reservationId: event.aggregateId });
  }
}

export class RegisterReservation extends UseCase<RegisterReservationInput, RegisterReservationCommand, void> {
  // toCommand: ValueObjects.build({ orderId: () => new OrderId(...), reservationId: () => new ReservationId(...) })
  protected handle(command: RegisterReservationCommand): Promise<void> {
    return this.transactions.run(async () => {
      const order = await this.orders.findById(command.orderId);
      if (order === null) return;                              // pedido de otro canal: no es nuestro
      order.registerStockReservation(command.reservationId);
      await this.orders.save(order);                           // un agregado, una transacción
      await this.events.publish(order.pullDomainEvents());     // outbox, misma transacción
    });
  }
}
```

Reglas para políticas:
* Una política, un agregado modificado.
* Nombre del listener: `<Acción>On<Evento>`, donde la acción es el caso de uso que ejecuta y el evento el hecho que la dispara (`RegisterReservationOnStockReserved`), nunca `StockReservedHandler` `[Fuera de los libros: convención de @archi-code/ddd]`.
* La regla de negocio está en el agregado; el listener solo traduce el evento y el caso de uso solo coordina.
* El listener se suscribe con `@ListensTo(Evento)`, un evento por listener; el `EventDispatcher` con inbox hace que cada evento se procese una vez por listener.
* El método invocado no lanza errores de negocio (ver "Comandos frente a hechos" en `implementacion-ts.md`). Los errores técnicos (base de datos caída, conflicto de versión) sí se propagan para que la mensajería reintente.

## Plazos y lo que ve el usuario

Si negocio acepta "en 30 segundos", el sistema debe comportarse bien durante esos 30 segundos:
* Estados intermedios explícitos en el modelo (`Pending`) [IDDD cap. 3 trata la indisponibilidad como estado válido].
* Mensajes al usuario que reflejen el estado ("Estamos confirmando tu pedido").
* Un temporizador o rastreador de plazo para el caso en que no llegue nunca (ver procesos en `ddd-context-mapping`).

## Procesos con varios pasos

Cuando hay varios agregados y plazos, un objeto de proceso con su propio estado (confirmación del pedido: esperando reserva y pago, confirmado, fallido, caducado) coordina los pasos [IDDD cap. 13]. Ese objeto es en sí un agregado pequeño: se modifica solo, en su transacción, al recibir cada evento.
