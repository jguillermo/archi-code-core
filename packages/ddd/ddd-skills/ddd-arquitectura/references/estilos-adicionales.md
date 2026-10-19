# Estilos adicionales: cuándo sí y cuándo no

Ninguno es obligatorio. Úsalos cuando mitiguen un riesgo con alta probabilidad de causar fallo si se ignora [IDDD cap. 4]. Destilado los presenta como combinables con puertos y adaptadores según las necesidades [Destilado cap. 2].

## CQRS

**Problema que resuelve:** las pantallas cruzan muchos agregados y consultarlas desde repositorios obliga a juntar varios agregados en DTOs, a crear buscadores especiales o a empobrecer la interfaz para que siga los límites de los agregados [IDDD cap. 4].

**Cómo es:** un modelo de comandos (los agregados, que ejecutan comportamiento) y un modelo de consultas (vistas desnormalizadas) actualizado por suscriptores a eventos [IDDD cap. 4]. Con el paquete, cada suscriptor es un `EventListener` con `@ListensTo(OrderPlaced, { consumer: '...' })` suscrito al `DomainEventBus`, que escribe la tabla de lectura y salta un `eventId` que ya aplicó (la entrega es al menos una vez). Reconstruir una vista desde el principio necesita un registro de eventos propio: un `EventChannel` no guarda historial legible. `[Fuera de los libros: convención de @archi-code/ddd]`

**Cuándo no:** si la interfaz no es compleja ni cruza a menudo varios agregados en una vista, CQRS añade complejidad accidental [IDDD cap. 4].

**Paso intermedio** `[Fuera de los libros]`: consultas de lectura que van directas a la base de datos con SQL o vistas, sin pasar por repositorios ni agregados, en la misma base. Ya separa lectura y escritura sin eventos ni consistencia eventual. Suele bastar. La consulta es una interfaz de `application/` que devuelve DTOs, implementada en `infrastructure/` sobre la base (`MongoOrderSummaries`), nunca con `AggregateFinder`:

```ts
export interface OrderSummary {
  readonly id: string;
  readonly customerId: string;
  readonly lines: number;
}

export interface OrderSummaries {
  ofCustomer(customerId: CustomerId, page: { limit: number; offset: number }): Promise<OrderSummary[]>;
}
```

**Si el modelo de consultas es eventualmente consistente**, la interfaz debe asumir lo peor. Opciones de IDDD: mostrar temporalmente los datos enviados en el comando; mostrar la fecha y hora de los datos para que el usuario sepa su antigüedad; notificaciones push; o simplemente avisar de que la petición se procesará [IDDD cap. 4].

Más detalle en `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.

## Arquitectura dirigida por eventos

Contextos que se comunican publicando y consumiendo eventos de dominio. Es la base de la integración robusta descrita en `ddd-skills/ddd-context-mapping/GUIA.md` y del diseño de `ddd-skills/ddd-eventos-dominio/GUIA.md`. Dentro de un contexto, los eventos también desacoplan efectos secundarios del caso de uso: el caso de uso llama a `events.publish(order.pullDomainEvents())` después de `await this.orders.save(order)` y un listener (`PrepareShipmentOnOrderLineAdded`) ejecuta la acción siguiente.

Con el paquete, la tecnología es un `EventChannel` del proyecto (`RabbitMqEventChannel`, un relay que entrega el outbox que el repositorio escribió junto al agregado…) bajo el mismo `DomainEventBus`; en tests, `InMemoryEventChannel`. Hacia otros contextos no viaja `event.toJSON()` de la clase de dominio: el adaptador que habla con el broker lo traduce a un contrato publicado y versionado (`sales.order.OrderPlaced`) [IDDD cap. 13], algo que el paquete no da y escribe el proyecto. `[Fuera de los libros: convención de @archi-code/ddd]`

## Event Sourcing

El estado de un agregado se guarda como la secuencia de sus eventos y se reconstruye aplicándolos [Destilado cap. 6; IDDD cap. 4]. Aporta historial completo y auditoría, pero cambia por completo la persistencia y las consultas. Ver `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md` antes de decidir.

El paquete no trae event store: guarda agregados como primitivas con `AggregateMapper` y su `version` crece 1 por cada `save`, no por evento. Un agregado con Event Sourcing sigue extendiendo `AggregateRoot` y registrando con `record()`, pero su repositorio (en `infrastructure/`, implementando `AggregateFinder`/`AggregateSaver`) lleva la versión del flujo él mismo y no usa `AggregateMapper`. `[Fuera de los libros: convención de @archi-code/ddd]`

## Tabla de decisión

| Situación | Recomendación |
|---|---|
| Pantallas simples que siguen a un agregado | Solo hexagonal |
| Listados y búsquedas que cruzan agregados | Consultas SQL directas de solo lectura |
| Vistas muy distintas del modelo, alto volumen de lectura, otra base para leer | CQRS con read models por eventos |
| Requisito legal o de negocio de historial completo de cambios del agregado | Valorar Event Sourcing en ese agregado |
| Integración entre contextos | Eventos de dominio por un `EventChannel` de mensajería, traducidos a un contrato publicado |
