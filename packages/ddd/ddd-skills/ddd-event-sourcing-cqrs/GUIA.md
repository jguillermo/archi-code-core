# Event Sourcing y CQRS

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos usan la API de `@archi-code/ddd`; la forma del código la fija `ddd-skills/archi-code-ddd/`, que manda si un ejemplo difiere. El paquete se aparta de los libros donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`.
>
> **Cuándo consultarla.** Cuando se mencione event sourcing, CQRS, read models, proyecciones, auditoría completa, event store o pantallas lentas que cruzan muchos agregados, aunque sea "¿debería usar...?".

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* El paquete no trae event store, repositorios con Event Sourcing, snapshots ni proyecciones con checkpoint: se escriben en el proyecto, solo si la decisión de abajo lo justifica.
* `AggregateRoot` no lleva versión: la de los repositorios de instantáneas la recuerda cada repositorio en un `WeakMap` y crece 1 por guardado, no por evento. Un agregado con Event Sourcing lleva su versión de stream (`streamVersion()`), se reconstruye con `fromHistory` desde los eventos que reconstruye `EventRegistry` y no usa `toPrimitives()`/`fromPrimitives()`.
* El dominio no declara ningún contrato de stream (`load`/`append`): sería un puerto de dominio, y no existen. La guía no fija cómo se guarda el stream; quien lo guarde anexa los eventos en una escritura atómica con la versión esperada y lanza `ConcurrencyException` si otro escribió antes. La aplicación no abre transacciones. El reintento va en `handle` del caso de uso, con límite, recargando y volviendo a guardar; una reacción no reintenta (reentrega el canal).
* Un read model es un módulo de `application/` (`order-summaries/`): fila de primitivos, puerto de store (`find`, `hasApplied(eventId)`, `save(row, eventId)`), puerto de consulta (`byId`, `ofCustomer`), una proyección idempotente por `eventId` (no es caso de uso ni escucha) y un caso de uso por reacción por cada evento que cambia la fila. Una clase de infraestructura implementa ambos puertos.
* Las consultas no tienen caso de uso: el controlador lee el puerto de consulta.
* Un `EventChannel` no guarda historial: reconstruir o auditar exige un log de eventos propio (con Event Sourcing, el event store).

**CQRS** separa el modelo de comandos de los de consulta [IDDD cap. 4]. **Event Sourcing** guarda el agregado como su secuencia de eventos [Destilado cap. 6; IDDD apéndice A] y casi siempre exige CQRS [IDDD apéndice A; Destilado cap. 6]. CQRS no exige Event Sourcing.

## Decidir (casi siempre, no)

Ningún estilo es para todo [IDDD cap. 4].

* CQRS a favor: vistas que cruzan muchos agregados [IDDD cap. 4], muchos `findBy` en repositorios [IDDD cap. 12], lectura muy superior a escritura `[Fuera de los libros]`. En contra: interfaz que sigue a un agregado (complejidad accidental) [IDDD cap. 4]; usuarios que deben ver al instante lo que escribieron. Paso intermedio: consultas de solo lectura sobre las mismas tablas (`ddd-skills/ddd-arquitectura/GUIA.md`).
* Event Sourcing a favor: auditoría completa, escritura por anexión, libertad estructural, agregados pequeños [IDDD apéndice A; Destilado cap. 6]. En contra: exige conocer el dominio a fondo (solo compensa en modelos complejos que dan ventaja competitiva) y obliga a CQRS [IDDD apéndice A].
* `[Fuera de los libros]` Solo en agregados del Core Domain donde el historial es requisito de negocio o legal, o donde "¿cómo llegó a este estado?" es frecuente; nunca en todo el sistema. Si solo hace falta auditoría, basta guardar cada `SerializedEvent` en una tabla que no se borra (o el outbox de `ddd-skills/ddd-eventos-dominio/GUIA.md`).

## Event Sourcing

Detalle en `ddd-skills/ddd-event-sourcing-cqrs/references/event-sourcing-ts.md`.

1. El agregado separa decidir (comandos que validan y emiten) de aplicar (`apply` privado que cambia estado); IDDD llega a proponer dos clases, estado y comportamiento [IDDD apéndice A].
2. Cargar: leer el stream y aplicar en orden. Ejecutar: nuevos eventos pendientes.
3. Guardar con la versión esperada; conflicto → reintentar recargando o propagar [IDDD apéndice A].
4. Publicar después [IDDD apéndice A]: el caso de uso publica con `EventBus` tras guardar; si no puede perderse, el event store hace de bandeja para un reenviador por un `EventChannel`.
5. Snapshots y caché para streams largos [IDDD apéndice A; Destilado cap. 6].

## Proyecciones

Suscriptores que mantienen modelos de lectura, reconstruibles reproduciendo los eventos, lo que permite cambiar una vista sin tocar el agregado; también dan a un agregado datos de otro [IDDD apéndice A, con un servicio de dominio que consulta la proyección]: aquí el caso de uso lee la proyección por un puerto de aplicación y pasa los datos ya cargados al método del agregado; no existen puertos de dominio y el agregado nunca llama a un servicio `[Fuera de los libros: convención de @archi-code/ddd]`. Con el paquete, `EventListener` suscritos al `DomainEventBus` e idempotentes por `eventId`. Detalle en `ddd-skills/ddd-event-sourcing-cqrs/references/proyecciones-cqrs-ts.md`.

## Interfaz eventual

Diseña para el peor caso: mostrar lo enviado, la antigüedad del dato, push, o "se está procesando" [IDDD cap. 4].

## Eventos con doble función

Persistir y comunicar crea tensión [IDDD apéndice A]. `[Fuera de los libros]` Eventos del stream mínimos; los publicados se traducen al Published Language.

## Datos personales

`[Fuera de los libros]` Un stream inmutable choca con la supresión del RGPD: no guardes datos personales en eventos (solo ids; los datos en un almacén borrable) o cífralos con clave por persona y destrúyela al suprimir (crypto-shredding). Decídelo antes del primer evento.

## Señales de alarma

* Event Sourcing en todo el sistema "por si acaso"; CQRS con dos bases para un CRUD pequeño.
* `OrderUpdated` con el estado completo en el stream.
* Proyecciones no reconstruibles (dependen de estado externo no reproducible) o no idempotentes por `eventId`.
* Un agregado con Event Sourcing que usa la versión de un repositorio de instantáneas o se guarda con `toPrimitives()`.
* Agregados que consultan read models para proteger invariantes.
* Datos personales en eventos sin estrategia de supresión.

## Siguiente guía

* Revisar un sistema existente → `ddd-skills/ddd-auditoria-refactorizacion/GUIA.md`.
