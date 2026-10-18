# Diseñar eventos de dominio

## Nombre

* Pasado, con el lenguaje del contexto de origen [Destilado cap. 6; IDDD cap. 8].
* Normalmente derivado del comando que lo causa: `CreateProduct` → `ProductCreated` [Destilado cap. 6].
* Tan compacto como permita el lenguaje. IDDD prefiere `BacklogItemCommitted` a `BacklogItemCommittedToSprint` porque en Scrum un elemento solo se compromete en un sprint; si el equipo prefiere el nombre largo en algún caso, vale [IDDD cap. 8].
* La combinación del nombre y sus propiedades cuenta por completo lo que pasó en el modelo [Destilado cap. 6].

| Mal | Bien | Por qué |
|---|---|---|
| `OrderUpdated` | `OrderLinesChanged`, `ShippingAddressChanged` | Dice qué cambió |
| `CreateOrder` | `OrderPlaced` | Es un hecho, no una orden |
| `OrderStatusChangedToConfirmed` | `OrderConfirmed` | El lenguaje ya tiene la palabra |
| `PaymentWebhookReceived` | `PaymentAuthorized` | Lenguaje del dominio, no del transporte |
| `TimerElapsed` | `PaymentAuthorizationExpired` | El paso del tiempo con nombre de negocio [Destilado cap. 6] |

## Datos

Pregunta guía: ¿qué estimuló la publicación del evento? Normalmente un comando, y el evento debería llevar las propiedades que llevaba ese comando [Destilado cap. 6]. IDDD añade [IDDD cap. 8]:

* Marca de tiempo de cuándo ocurrió (`occurredOn`).
* Lo necesario para "volver a disparar" el evento: identidad del agregado y de los agregados implicados.
* Parámetros del comando si se demuestran útiles.
* Valores del estado resultante que ayuden a los suscriptores.
* En entornos multi-tenant, siempre el `tenantId`, aunque no viniera en el comando.

Ejemplo de IDDD: `BacklogItemCommitted` lleva `tenantId`, `backlogItemId` y `sprintId`. El `sprintId` es imprescindible porque el requisito dice que el sprint debe enterarse [IDDD cap. 8].

Lista de comprobación `[Fuera de los libros]`:
* ¿Un consumidor puede decidir qué hacer sin consultar al origen? Si no, ¿es aceptable que consulte (query-back)?
* ¿Hay datos personales? ¿Los necesita cada consumidor?
* ¿Los importes llevan moneda? ¿Las fechas, zona horaria?
* ¿Algún valor cambia a menudo y quedará obsoleto enseguida? Mejor fuera.

## Forma en TypeScript

```ts
export interface DomainEvent {
  readonly type: string;
  readonly eventId: string;        // para deduplicar fuera del contexto [IDDD cap. 8]
  readonly occurredOn: Date;
  readonly version: number;
}

export class OrderConfirmed implements DomainEvent {
  readonly type = 'OrderConfirmed';
  readonly version = 1;
  readonly eventId = newEventId();
  readonly occurredOn = new Date();
  constructor(
    readonly orderId: OrderId,
    readonly total: Money,
  ) {}
}
```

Inmutable y con constructor completo [IDDD cap. 8]. Si prefieres no generar ids ni fechas dentro (para tests deterministas), pásalos desde un reloj y un generador inyectados en la aplicación `[Fuera de los libros]`.

## Identidad del evento

* Dentro del contexto rara vez hace falta comparar eventos; el tipo, las identidades implicadas y la fecha suelen bastar, como en un value object [IDDD cap. 8].
* Fuera, con mensajería que puede reenviar, una identidad única permite deduplicar. Algunos buses la ponen en la cabecera; si no, la asigna el publicador [IDDD cap. 8].

## Eventos con características de agregado

A veces un evento no resulta de un comando sobre un agregado sino que un usuario lo origina directamente. Entonces puede modelarse como agregado inmutable en su propio repositorio, que no permite borrarlo, con identidad generada [IDDD cap. 8]. Ejemplo: una `IncidenciaDeEntregaReportada` por el transportista que se archiva y se consulta.

## Versionado

* Los eventos publicados llevan versión. Diseñados con cuidado, muchos consumidores pueden leer cualquier versión como si fuera la 1 [IDDD cap. 13].
* Cambios compatibles `[Fuera de los libros]`: añadir campos opcionales. Incompatibles: renombrar, quitar o cambiar el significado → nueva versión o nuevo evento, publicando ambas durante la transición.
