# Estilos adicionales

Ninguno es obligatorio: solo si mitigan un riesgo probable [IDDD cap. 4]; se combinan con puertos y adaptadores [Destilado cap. 2].

## CQRS

* **Problema:** pantallas que cruzan muchos agregados [IDDD cap. 4].
* **Forma:** modelo de comandos (agregados) y de consultas (vistas) actualizado por suscriptores [IDDD cap. 4]. Aquí: proyección que escribe por un puerto de store y salta `eventId` ya aplicados, un caso de uso por reacción por evento, y el controlador lee por el puerto de consulta, sin caso de uso; reconstruir una vista desde cero necesita un registro de eventos propio, porque un `EventChannel` no guarda historial `[Fuera de los libros: convención de @archi-code/ddd]`.
* **Cuándo no:** interfaz simple [IDDD cap. 4].
* **Paso intermedio** `[Fuera de los libros]`: consultas de solo lectura directas a la base, como interfaz en `application/` implementada en `infrastructure/`, nunca con el repositorio del agregado. Suele bastar.
* Con consistencia eventual, la interfaz asume lo peor: mostrar lo enviado, la antigüedad de los datos, push o aviso [IDDD cap. 4].

Detalle en `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.

## Dirigida por eventos

Dentro de un contexto, los eventos desacoplan efectos: el caso de uso publica tras `save` y una reacción ejecuta la acción siguiente. Base de la integración de `ddd-skills/ddd-context-mapping/GUIA.md` y de `ddd-skills/ddd-eventos-dominio/GUIA.md`. La tecnología es un `EventChannel` bajo `DomainEventBus` (`InMemoryEventChannel` en tests); fuera del sistema, el adaptador traduce a un contrato versionado [IDDD cap. 13] `[Fuera de los libros: convención de @archi-code/ddd]`.

## Event Sourcing

Estado como secuencia de eventos [Destilado cap. 6; IDDD cap. 4]; cambia toda la persistencia. El paquete no trae event store (cada repositorio guarda `toPrimitives()` con una versión que crece 1 por `save`, no por evento): el agregado sigue con `AggregateRoot` y `record()`, y su adaptador lleva la versión del flujo y lo rehace aplicando eventos, no con `fromPrimitives` `[Fuera de los libros: convención de @archi-code/ddd]`.

| Situación | Recomendación |
|---|---|
| Pantallas que siguen a un agregado | Solo hexagonal |
| Listados que cruzan agregados | Consultas de lectura directas |
| Vistas muy distintas, mucha lectura, otra base para leer | CQRS con read models |
| Historial completo exigido (legal o de negocio) | Valorar ES en ese agregado |
| Integración entre contextos | Eventos por un `EventChannel` con contrato publicado |
