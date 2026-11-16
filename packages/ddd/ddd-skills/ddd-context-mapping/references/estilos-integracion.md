# Estilos de integración

| Estilo | Acoplamiento temporal | Cuándo |
|---|---|---|
| RPC | Alto; parece local y no lo es [Destilado cap. 4] | Consultas a servicios muy disponibles, con ACL |
| REST | Alto en peticiones directas [Destilado cap. 4] | OHS para varios consumidores; query-back |
| Mensajería | Bajo; la más robusta [Destilado cap. 4] | Notificar hechos, coordinar procesos |
| BD o ficheros compartidos | Estructural; evitar [Destilado cap. 4; IDDD cap. 13] | Solo heredados, con ACL |

## REST

* El contexto que ofrece REST da un OHS con Published Language; recursos sintéticos para el caso de uso del cliente [Destilado cap. 4].
* Para reducir la dependencia temporal, llama al remoto desde un temporizador o al recibir un mensaje propio, con reintentos y espera creciente, no dentro de la petición del usuario [IDDD cap. 13].
* REST asíncrono: los eventos como feed que los clientes sondean; cada cliente evita duplicados [Destilado cap. 4; IDDD cap. 3 y 13].

## Mensajería

* El suscriptor reacciona creando o modificando un agregado propio; para forzar una acción se envía un mensaje de comando y el resultado llega como evento [Destilado cap. 4].
* Al menos una vez + receptor idempotente; nunca bloquear esperando respuesta [Destilado cap. 4].
* Publicar de forma fiable (outbox) `[Fuera de los libros como nombre; la idea está en IDDD cap. 8]`: el caso de uso publica tras `save` y, si el evento no puede perderse, el repositorio guarda agregado y eventos en la misma escritura atómica y un reenviador los entrega por un `EventChannel` `[Fuera de los libros: convención de @archi-code/ddd]`. Detalle en `ddd-skills/ddd-eventos-dominio/GUIA.md`.

### Receptor idempotente

La reacción (`RegisterStockReservationOnStockReserved`, en `ddd-skills/ddd-context-mapping/references/anticorrupcion-ts.md`) registra un hecho: vuelve sin error si el agregado no existe y llama a un método idempotente que vuelve sin cambios si no aplica (`Order.registerStockReservation`, en `ddd-skills/ddd-agregados/references/implementacion-ts.md`). Si la operación no es idempotente por naturaleza, el `eventId` se guarda como procesado en la misma escritura que el cambio `[Fuera de los libros]`; esa escritura es del adaptador, no de la reacción ("Consumidor idempotente" en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`) `[Fuera de los libros: convención de @archi-code/ddd]`. Un `ConcurrencyException` hace fallar la reacción y el canal reentrega.

## Contratos y versionado

* Contrato por estándar (Published Language) en vez de distribuir clases: el consumidor solo lee datos y el productor envía los cálculos como atributos [IDDD cap. 13].
* Eventos versionados, diseñados para que muchos consumidores lean cualquier versión [IDDD cap. 13]. Aquí la versión va en el `eventName` (`sales.order.OrderPlacedV2`) `[Fuera de los libros: convención de @archi-code/ddd]`.
* Los identificadores pueden viajar en el evento [IDDD cap. 13], aquí como primitivos (`orderId: string`) `[Fuera de los libros: convención de @archi-code/ddd]`.

```json
{ "eventName": "sales.order.OrderPlaced", "eventId": "6f1c2a3b-…", "occurredOn": "2026-10-18T10:15:00.000Z",
  "orderId": "9b2f6c1e-…", "total": { "amount": 1700, "currency": "EUR" } }
```

El evento interno no sale tal cual: el adaptador del broker lo traduce a su contrato y un evento sin contrato no sale del contexto; para no perder mensajes, publica al broker el reenviador del outbox tras el commit (`ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`).

El consumidor no valida con un esquema aparte: su reacción construye los value objects con `ValueObjectBuilder.build`, que lanza una `ValidationException` con cada campo inválido.

## Evento enriquecido o consulta al origen

| | Enriquecido | Ligero + query-back |
|---|---|---|
| Autonomía | Alta | Depende del origen |
| Previsión | Difícil acertar | No hace falta |
| Seguridad | Riesgo de exponer de más | El origen controla el acceso |

Se pueden mezclar [Destilado cap. 4]. Pauta `[Fuera de los libros]`: incluye lo que no cambia y sirve para decidir (ids, importes cerrados, fechas); fuera datos personales innecesarios y datos que cambian a menudo.

## Procesos de larga duración

Un objeto con el estado del proceso y un rastreador de plazos (completado, agotado) [IDDD cap. 13] (process manager o saga `[Fuera de los libros como nombres]`):
* Estado con nombre del lenguaje, no `SagaState`.
* Cada paso con resultado esperado y plazo.
* Las compensaciones son comandos de negocio.
* Lo remoto que aún no existe es un estado [IDDD cap. 3].
