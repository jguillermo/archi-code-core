# Estilos de integración

## Comparativa

| Estilo | Acoplamiento temporal | Robustez | Cuándo |
|---|---|---|---|
| RPC (SOAP, gRPC, HTTP con procedimientos) | Alto: si el otro cae, fallas | Baja. Parece una llamada local y no lo es [Destilado cap. 4] | Consultas rápidas a servicios muy disponibles; siempre con ACL |
| REST | Alto en peticiones directas | Media. Se apoya en la fiabilidad probada de la web [Destilado cap. 4] | OHS para varios consumidores; consultas de detalle (query-back) |
| Mensajería con eventos | Bajo | La más robusta: elimina gran parte del acoplamiento temporal y obliga a diseñar contando con latencia [Destilado cap. 4] | Notificar hechos, coordinar procesos entre contextos |
| Base de datos o ficheros compartidos | Estructural | Pésima. Evitar [Destilado cap. 4; IDDD cap. 13] | Solo heredados sin alternativa, con ACL |

## Principios de la computación distribuida

IDDD los formula como principios, no como falacias, para subrayar que hay que diseñar contando con ellos [IDDD cap. 13]: la red no es fiable; siempre hay latencia; el ancho de banda no es infinito; la red no es segura; la topología cambia; el conocimiento y las políticas están repartidos entre varios administradores; el transporte tiene coste; la red es heterogénea.

## REST

* El contexto que ofrece REST debe proporcionar un OHS con Published Language; los recursos son el idioma publicado [Destilado cap. 4].
* Recursos **sintéticos**: con la forma que necesita el caso de uso del cliente, no la del agregado. Reflejar los agregados fuerza a todos los clientes a ser Conformist ante cualquier cambio del modelo [Destilado cap. 4].
* Para reducir la dependencia temporal aunque solo haya REST: llama al sistema remoto desde un temporizador o al recibir un mensaje propio, con reintentos y espera creciente, en lugar de hacerlo dentro de la petición del usuario [IDDD cap. 13].

### REST asíncrono (notification log)

Publicar los eventos de dominio como un feed de recursos (al estilo Atom) que los clientes sondean periódicamente. Si el servicio no está disponible, el cliente reintenta más tarde [Destilado cap. 4]. IDDD lo implementa con un log de notificaciones actual y logs archivados navegables; cada cliente es responsable de no consumir duplicados [IDDD cap. 3 y cap. 13].

## Mensajería

* El contexto suscrito reacciona a eventos de dominio publicados por otros, y eso suele crear o modificar un agregado propio [Destilado cap. 4].
* Si el cliente necesita forzar una acción, envía un **mensaje de comando** y recibe el resultado como un evento publicado [Destilado cap. 4].
* **Entrega al menos una vez** en el mecanismo y **receptor idempotente** en el consumidor: deduplicar o reaplicar con el mismo resultado [Destilado cap. 4].
* Las peticiones no deben bloquearse esperando respuesta; siempre habrá algo de latencia y hay que planificarla [Destilado cap. 4].

### Publicar de forma fiable

`[Fuera de los libros como nombre; la idea de guardar eventos en la misma transacción está en IDDD cap. 8]`. Patrón **outbox transaccional**: en la misma transacción que guarda el agregado, se guardan sus eventos en una tabla; un proceso aparte los lee y los publica en el bus, marcándolos como enviados. Evita perder eventos si el bus falla tras confirmar la transacción, o publicar eventos de cambios que luego se revierten. Se desarrolla en `ddd-skills/ddd-eventos-dominio/GUIA.md`. Con `@archi-code/ddd` la aplicación no abre transacciones: el caso de uso sigue llamando a `EventBus.publish` después de `save`, y el outbox lo escribe el adaptador del repositorio, que guarda el agregado y sus eventos pendientes en la misma escritura atómica de `save` (el mismo documento o la misma transacción de base de datos); un reenviador los entrega después por un `EventChannel` `[Fuera de los libros: convención de @archi-code/ddd]`.

### Receptor idempotente en TypeScript

El evento de Almacén llega por un `EventChannel` a un listener (`RegisterStockReservationOnStockReserved`, en `ddd-skills/ddd-context-mapping/references/anticorrupcion-ts.md`), que ejecuta un solo caso de uso. Ese caso de uso registra un hecho: no lo rechaza, vuelve sin error si el pedido no existe (un error haría que el canal lo reentregara sin fin) y el método del agregado es idempotente:

```ts
// src/contexts/sales/application/register-stock-reservation/RegisterStockReservation.ts
import { ValueObjects } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import { Order, OrderEvent, OrderId, ReservationId } from '../../domain/order/Order';

interface RegisterStockReservationInput {
  orderId: string;
  reservationId: string;
}

interface RegisterStockReservationCommand {
  orderId: OrderId;
  reservationId: ReservationId;
}

export class RegisterStockReservation extends UseCase<
  RegisterStockReservationInput,
  RegisterStockReservationCommand,
  void
> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: RegisterStockReservationInput): RegisterStockReservationCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      reservationId: () => new ReservationId(input.reservationId),
    });
  }

  protected async handle(command: RegisterStockReservationCommand): Promise<void> {
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      return;
    }
    order.registerStockReservation(command.reservationId, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

El método de `Order` (el de `ddd-skills/ddd-agregados/references/implementacion-ts.md`), que guarda la reserva en `private _stockReservation: ReservationId | null` (`null` porque al principio no hay reserva) y confirma el pedido cuando también tiene la autorización de pago:

```ts
registerStockReservation(reservation: ReservationId, clock: { now(): Date }): void {
  if (!this._status.isPending()) {
    return;
  }
  this._stockReservation = reservation;
  this.tryToConfirm(clock);
}
```

Aplicar dos veces "reserva registrada" no cambia nada la segunda vez ni graba un segundo evento. Cuando la operación no es idempotente por naturaleza, el `eventId` del mensaje se guarda como procesado en la misma escritura atómica que el cambio, y si ya estaba no se hace nada `[Fuera de los libros]`; con el paquete esa escritura la hace el adaptador que persiste el cambio, no el caso de uso, que solo le pasa el `eventId` (ver "Consumidor idempotente" en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`) `[Fuera de los libros: convención de @archi-code/ddd]`. Si dos mensajes del mismo pedido llegan a la vez, `save` lanza `ConcurrencyException` en uno de ellos y el listener falla; lo que pase después lo decide el canal (reintento o cola de mensajes muertos), y en el reintento el caso de uso vuelve a cargar el pedido y la operación idempotente no cambia nada.

## Contratos y versionado

* Dos opciones para intercambiar estructuras: distribuir clases e interfaces a todos los sistemas (tipado fuerte, pero recompilaciones y riesgo de usar objetos ajenos como propios) o un contrato basado en estándar, un media type propio que es un Published Language [IDDD cap. 13].
* Con contrato, el consumidor solo lee datos; no tiene acceso a comportamiento del otro modelo, y IDDD lo ve como protección, no como carencia. Los cálculos los hace el productor y los envía como atributos del evento [IDDD cap. 13].
* Los eventos y notificaciones llevan versión. Si se diseñan con cuidado, muchos consumidores pueden leer cualquier versión como si fuera la 1 y no necesitan cambiar [IDDD cap. 13].
* Los value objects estables (identificadores) se pueden incluir en el evento; quedan congelados en la estructura [IDDD cap. 13]. Con el paquete, el payload lleva solo primitivos tomados de los value objects (`orderId: string`), también los identificadores `[Fuera de los libros: convención de @archi-code/ddd]`.

La notificación de IDDD envuelve el evento en `{ notificationId, typeName, version, occurredOn, event }` [IDDD cap. 13]. Con el paquete, el mensaje publicado es un `SerializedEvent` plano, con el nombre y la versión del Published Language `[Fuera de los libros: convención de @archi-code/ddd]`:

```json
{
  "eventName": "sales.order.OrderPlaced",
  "eventVersion": 1,
  "eventId": "6f1c2a3b-8d4e-4f5a-9b6c-7d8e9f0a1b2c",
  "aggregateId": "9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c",
  "occurredOn": "2026-10-18T10:15:00.000Z",
  "orderId": "9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c",
  "customerId": "1c5e7a90-2b3d-4e6f-8a1b-2c3d4e5f6a7b",
  "lines": [
    { "sku": "TORCH-01", "quantity": 2, "unitPrice": { "amount": 850, "currency": "EUR" } }
  ],
  "total": { "amount": 1700, "currency": "EUR" }
}
```

`eventName` hace de `typeName`, `eventVersion` de `version` y `eventId` es el identificador con el que el consumidor deduplica. No hay `notificationId` secuencial: si publicas un feed REST de notificaciones, la secuencia la asigna tu canal duradero (la fila del outbox).

El evento interno no sale tal cual. La traducción al Published Language vive en infraestructura, en el adaptador que habla con el broker: un `EventChannel` del proyecto (`ContractPublishingChannel`) que pasa cada `SerializedEvent` por `SalesContracts` (qué eventos salen y con qué contrato, uno por versión publicada, con `messageId` = `eventId`) y entrega todos al canal interno. El código está en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md` ("Lenguaje publicado en el adaptador del broker"); los casos de uso siguen viendo solo `EventBus`, y un evento sin contrato es interno y no sale del contexto. Para no perder mensajes, la publicación al broker la hace el reenviador del outbox después del commit (ver "Publicar de forma fiable").

El consumidor no valida el mensaje con un esquema aparte: lo lee con su propia clase `extends EventBase` (solo los campos que usa) y el caso de uso que ejecuta su listener construye cada valor como value object en `toCommand`, que lanza una `ValidationException` con todos los campos que no cumplen el contrato. El ejemplo completo está en `ddd-skills/ddd-context-mapping/references/anticorrupcion-ts.md`.

## Evento enriquecido o consulta al origen

| | Evento enriquecido | Evento ligero + query-back |
|---|---|---|
| Autonomía del consumidor | Alta | Depende de que el origen responda |
| Previsión de necesidades | Difícil acertar con todo | No hace falta |
| Seguridad | Riesgo de exponer datos de más | El origen controla el acceso en cada consulta |

Hay casos que piden una mezcla [Destilado cap. 4]. En el ejemplo del libro, `PolicyIssued` lleva el identificador de la póliza; el consumidor lo guarda como `issuedPolicyId` para trazabilidad y consulta al origen con `GET` si necesita más [Destilado cap. 4].

Pauta `[Fuera de los libros]`: incluye en el evento lo que el consumidor necesita para decidir y que no cambiará (identificadores, importes cerrados, fechas del hecho); deja fuera datos personales que el consumidor no necesite (minimización de datos) y datos que cambian a menudo.

## Procesos de larga duración

Cuando un proceso implica a varios contextos, se coordina con eventos y un objeto que guarda el estado del proceso, con un rastreador de tiempos para detectar respuestas que no llegan (estados como no completado, completado normalmente o agotado por tiempo) [IDDD cap. 13]. En la práctica actual se llama a esto process manager o saga `[Fuera de los libros como nombres]`. Reglas:

* El estado del proceso es un concepto del dominio con nombre del lenguaje (`ConfirmaciónDePedido`), no un `SagaState` genérico.
* Cada paso tiene un resultado esperado y un plazo.
* Las acciones compensatorias (liberar reserva, anular autorización) son comandos de negocio, no "rollbacks".
* Cuando un recurso remoto aún no existe, modela esa situación como estado. En IDDD, una discusión remota tiene estados de disponibilidad: complemento no contratado, no solicitada, solicitada y lista [IDDD cap. 3].
