# Agregados

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Qué va junto, invariantes, tamaño, referencias por identidad, consistencia eventual, fábricas, concurrencia y tests. La forma del código la fija `ddd-skills/archi-code-ddd/`.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

La forma del código (raíz, entidades hijas, `create`, `fromPrimitives`/`toPrimitives`, eventos, errores, reacciones y tests) está en `ddd-skills/archi-code-ddd/aggregates.md`, `ddd-skills/archi-code-ddd/events-and-errors.md`, `ddd-skills/archi-code-ddd/reactions.md` y `ddd-skills/archi-code-ddd/tests.md`. Lo que se aparta de los libros:

* Constructor público que solo asigna y fábrica `static create`; los libros usan constructor privado y fábrica con nombre [IDDD cap. 11].
* El id lo genera o lo deriva el caso de uso con el value object; no hay `nextIdentity()` en el repositorio como en IDDD.
* El agregado no lleva versión: la concurrencia optimista y la transacción son del repositorio [IDDD cap. 10, 14].
* El agregado se convierte a sí mismo a datos planos; no hay mapper en infraestructura [IDDD cap. 6].
* El agregado registra sus eventos y el caso de uso los publica tras guardar; no hay publicador estático [IDDD cap. 8].
* La hora actual solo la lee el agregado; los eventos no la llevan al registrarse, la pone el bus.
* Una política es un caso de uso por reacción, sin servicio de aplicación detrás [IDDD cap. 8].
* Una regla entre quien pide y el estado (solo el comprador cancela) es del agregado, no autorización del caso de uso.
* Si el resultado de una acción cambia lo que hace el caso de uso, lo decide y lo devuelve el agregado.

Un agregado es un **límite de consistencia transaccional** con una raíz que lo controla [Destilado cap. 5]; no un grafo cómodo de navegar [IDDD cap. 10].

## Las cuatro reglas

[Destilado cap. 5; IDDD cap. 10]
1. Protege las **invariantes reales** dentro del límite: reglas que se cumplen siempre, de forma inmediata y atómica (las decide negocio).
2. Agregados **pequeños**: raíz y lo que debe ser consistente con ella (en un caso real de IDDD, ~70 % solo raíz y value objects).
3. Referencia a otros agregados **por identidad** (`productId`, nunca `product`).
4. **Consistencia eventual** fuera del límite: evento y otra transacción.

Corolario: **una transacción, un agregado**; cada petición, un comando sobre un agregado [Destilado cap. 5; IDDD cap. 10]. Aquí, un `save` atómico por caso de uso `[Fuera de los libros: convención de @archi-code/ddd]`.

## Flujo de diseño

1. Candidatos: sustantivos con ciclo de vida que reciben comandos.
2. Dimensionar [Destilado cap. 5]: un agregado por entidad, solo con lo necesario para identificarlo, encontrarlo y dejarlo en un estado inicial válido; lista qué otros deben reaccionar a cada cambio y en qué plazo; lo **inmediato** se fusiona, lo que admite **plazo** va por eventos. Desconfía de "inmediato para todo".
3. Desempate: si dejarlo consistente es trabajo **del usuario** que ejecuta el caso de uso, transaccional; si es de otro o del sistema, eventual [IDDD cap. 10].
4. Un caso de uso que toca varios agregados indica una invariante que falta o que debe ser eventual; no acabes en un agregado gigante [IDDD cap. 10].
5. Abstracciones del lenguaje, nada de `ScrumElement` genérico [Destilado cap. 5].
6. Implementar (`ddd-skills/ddd-agregados/references/implementacion-ts.md`):
   * Identidad global en la raíz, local en las entidades internas; partes internas como valores si se reemplazan enteras [IDDD cap. 10].
   * Sin setters; Demeter y "Tell, Don't Ask" [IDDD cap. 10].
   * **Sin repositorios ni servicios dentro**: el caso de uso busca y pasa lo necesario [IDDD cap. 10].
   * Concurrencia optimista con versión [IDDD cap. 10], aquí del repositorio (`ConcurrencyException`) `[Fuera de los libros: convención de @archi-code/ddd]`.
   * **Comandos frente a hechos**: un comando de usuario puede rechazarse; un hecho ajeno se registra sin lanzar (una excepción en un consumidor provoca reintentos sin fin), idempotente, y si no encaja se emite un evento para compensar [Destilado cap. 6].
   * Fábricas: `static create`, un método en otra raíz (`customer.placeOrder`) o un servicio que traduce de otro contexto [IDDD cap. 11; PHP: Factories] (con el paquete, ese servicio no vive en el dominio: es un puerto de aplicación que llama el caso de uso `[Fuera de los libros: convención de @archi-code/ddd]`); ver `ddd-skills/ddd-agregados/references/fabricas.md`.
7. Coordinar: `ddd-skills/ddd-agregados/references/consistencia-eventual.md`.

## Cuándo romper las reglas

[IDDD cap. 10]
| Motivo | Condición |
|---|---|
| Crear varios en lote | No cambia nada frente a crearlos uno a uno; cada uno protege sus invariantes |
| Sin mensajería ni procesos de fondo | Afinidad usuario-agregado y concurrencia optimista |
| Transacciones globales impuestas | Aun así, no modificar varios del propio contexto |
| Rendimiento de consultas | Referencia directa, valorando el coste |

## Señales de alarma

* Colecciones que crecen sin límite [Destilado cap. 5; IDDD cap. 10].
* Conflictos de concurrencia frecuentes en un agregado.
* `order.customer.address.city`: otro agregado dentro.
* Un caso de uso que guarda varios agregados o recibe `unitOfWork`.
* Un agregado con repositorio en el constructor.
* Setters o `update(dto)`; lógica en servicios de aplicación o `Utils` [Destilado cap. 5].
* Relaciones bidireccionales por comodidad o por la versión de concurrencia [IDDD cap. 10].

Con estilo funcional, separar datos y comportamiento no es anemia y parte de esta guía no aplica tal cual [Destilado cap. 5]; el paquete no da esa variante (`ddd-skills/ddd-agregados/references/implementacion-ts.md`) `[Fuera de los libros: convención de @archi-code/ddd]`.

Ejemplo de dimensionado (Pedido, Pago, Reserva): `ddd-skills/ddd-agregados/references/ejemplo-ecommerce.md`.
