# Agregados

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos están escritos con la API de `@archi-code/ddd` (las clases de su `src`) y se copian tal cual; las guías son la fuente de verdad: el paquete solo se aparta de ellas donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`, y cualquier otra discrepancia es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Diseño e implementación de agregados DDD en TypeScript, la guía central del diseño táctico. Cubre las cuatro reglas (proteger invariantes reales dentro del límite, agregados pequeños, referencias por identidad, consistencia eventual fuera del límite), el procedimiento para dimensionar agregados según los plazos de consistencia, la heurística de "¿de quién es el trabajo?", cuándo está justificado romper las reglas, la raíz del agregado, partes como value objects, fábricas, concurrencia optimista, registro de eventos de dominio y tests. Consúltala siempre que haya que decidir qué objetos van juntos, qué se guarda en una transacción, por qué hay conflictos de concurrencia o bloqueos, si un objeto debe contener una colección de otro, cómo coordinar cambios en varias entidades, o cuando aparezca un objeto enorme que carga medio modelo, aunque no se diga "agregado".

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* La raíz no se escribe: extiende `AggregateRoot<Id, Event>` y llama a `super(id)`; la `version` de la concurrencia optimista está en la base, fuera del estado del agregado, y solo la tocan los repositorios (`restoreVersion()` al cargar, `markPersisted()` tras escribir).
* Todo el estado son value objects, composites o entidades hijas con getter público; constructor privado, una factoría de negocio y `fromPrimitives`, y `toPrimitives()` con datos planos (las seis reglas de `layers.md`).
* Las identidades nuevas salen del value object (`OrderId.generate()`), no del repositorio.
* Los métodos del dominio reciben `clock: { now(): Date }` y lo pasan a los eventos (`{ clock }`).
* La variante funcional (estado inmutable + funciones que devuelven `[estado, eventos]`) no la da el paquete: necesita clases `AggregateRoot`, `PrimitiveTypes` y `AggregateMapper`.
* El agregado registra sus eventos con `record()` y el caso de uso los publica con `events.publish(order.pullDomainEvents())` dentro de `transactions.run`, no después; entregarlos solo tras confirmar es cosa de un `EventChannel` duradero.
* Una política se parte en un listener `<Acción>On<Evento>` con `@ListensTo` y el caso de uso que ejecuta.

Un agregado es un grupo de entidades y value objects con una entidad raíz que lo nombra y lo controla, y que forma un **límite de consistencia transaccional**: al confirmar la transacción, todo lo de dentro cumple las reglas del negocio [Destilado cap. 5]. No es un grafo de objetos cómodo de navegar; es una decisión sobre consistencia [IDDD cap. 10].


## Las cuatro reglas

[Destilado cap. 5; IDDD cap. 10]

1. **Protege las invariantes reales dentro del límite.** Una invariante es una regla que debe cumplirse siempre, de forma inmediata y atómica. Es negocio quien decide qué tiene que ser consistente al confirmar.
2. **Diseña agregados pequeños.** Raíz y los mínimos atributos y value objects necesarios: todos los que deben ser consistentes entre sí, ninguno más. Un caso real que cita IDDD: en torno al 70 % de los agregados de un proyecto tenían solo la raíz con value objects, y el resto dos o tres entidades.
3. **Referencia a otros agregados solo por su identidad.** `productId: ProductId`, nunca `product: Product`.
4. **Actualiza otros agregados con consistencia eventual.** Un agregado publica un evento de dominio; un suscriptor modifica el otro en **otra** transacción.

Corolario operativo: **una transacción modifica una sola instancia de agregado** [Destilado cap. 5; IDDD cap. 10]. Eso implica que cada petición de usuario debería ejecutar un comando sobre un agregado [IDDD cap. 10].

## Flujo de diseño

### Paso 1. Partir de los candidatos

Lista los agregados candidatos con sus comandos y eventos: sustantivos del negocio con ciclo de vida que reciben comandos.

### Paso 2. Dimensionar con el procedimiento de Vernon

[Destilado cap. 5]

1. Empieza con **un agregado por entidad**, cada uno solo con su raíz. Ponle lo necesario para identificarlo, encontrarlo y dejarlo en un estado inicial válido.
2. Para cada agregado A1, lista qué otros agregados deben actualizarse cuando A1 cambia.
3. Para cada reacción, fija **cuánto puede tardar**: inmediatamente, o en N segundos, minutos, horas o días.
4. Lo que debe ser **inmediato**: considera fusionar ambas entidades en un único agregado.
5. Lo que admite **plazo**: consistencia eventual con eventos de dominio.

Desconfía de "inmediato" para todo: con usuarios concurrentes, un agregado grande falla en las transacciones y consume mucha memoria [Destilado cap. 5].

### Paso 3. Desempatar con "¿de quién es el trabajo?"

Si no está claro si algo es transaccional o eventual: si es trabajo **del usuario que ejecuta el caso de uso** dejar los datos consistentes, intenta consistencia transaccional (respetando las demás reglas). Si es trabajo de otro usuario o del sistema, eventual [IDDD cap. 10, guía atribuida a Evans].

### Paso 4. Desconfiar de los casos de uso que tocan varios agregados

Un caso de uso que pide modificar varios agregados en una transacción puede indicar una invariante que falta (y un concepto nuevo), o simplemente que el caso de uso debe reescribirse con consistencia eventual y un retraso aceptable. Cuidado con fusionar agregados y acabar en uno gigante [IDDD cap. 10].

### Paso 5. Elegir bien la abstracción

Modela el lenguaje ubicuo explícitamente. Nada de `ScrumElement` con un `typeName` para cubrir "todos los casos futuros": el lenguaje no coincide con el del negocio, aparecen casos especiales, sobra código y nunca se acierta con el futuro [Destilado cap. 5].

### Paso 6. Implementar

Guía completa en `ddd-skills/ddd-agregados/references/implementacion-ts.md`. Lo esencial:

* La raíz tiene identidad global; las entidades internas solo identidad local [IDDD cap. 10].
* Partes internas como **value objects** siempre que se puedan reemplazar enteras [IDDD cap. 10].
* Comportamiento con nombres del lenguaje; sin setters públicos. Ley de Demeter y "Tell, Don't Ask": los clientes piden a la raíz que haga algo, no navegan por dentro [IDDD cap. 10].
* **No inyectes repositorios ni servicios en el agregado.** Busca antes lo que necesite (en el servicio de aplicación) y pásaselo al método [IDDD cap. 10].
* **Concurrencia optimista** con versión en la raíz [IDDD cap. 10]: la `version` de `AggregateRoot`, que el repositorio comprueba al guardar (`ConcurrencyException`).
* El agregado **registra** sus eventos (`record`); el caso de uso los publica tras guardar con `events.publish(order.pullDomainEvents())` (ver `ddd-skills/ddd-eventos-dominio/GUIA.md`).
* **Distingue comandos de hechos.** Un comando de usuario puede rechazarse con un error de negocio. Un método que registra un hecho ya ocurrido en otro agregado o contexto es idempotente y no lanza: si el hecho no encaja, registra un evento de negocio para que otra política compense [Destilado cap. 6]. Una excepción en un consumidor de mensajes provoca reintentos sin fin.
* Creación con **fábricas**: método en la raíz de otro agregado cuando el nuevo nace de él (`customer.placeOrder(...)`), o servicio cuando la creación necesita traducir de otro contexto [IDDD cap. 11; PHP: Factories]. Ver `ddd-skills/ddd-agregados/references/fabricas.md`.

### Paso 7. Coordinar agregados

Consistencia eventual dentro y fuera del contexto: suscriptores (`EventListener` + caso de uso), reintentos, compensaciones y procesos. `ddd-skills/ddd-agregados/references/consistencia-eventual.md`.

## Cuándo romper las reglas

Solo con un buen motivo. IDDD cita cuatro [IDDD cap. 10]:

| Motivo | Condición para que sea aceptable |
|---|---|
| Comodidad de interfaz: crear varios agregados en lote | Crear en lote no cambia nada semánticamente frente a crearlos de uno en uno; cada uno protege sus invariantes |
| Falta de mecanismos técnicos (sin mensajería, temporizadores ni procesos en segundo plano) | Afinidad usuario-agregado (un solo usuario trabaja sobre ese conjunto) y concurrencia optimista |
| Transacciones globales impuestas (dos fases) | Aun así, intenta no modificar varios agregados del propio contexto |
| Rendimiento de consultas | Referencia directa a otro agregado, valorando el coste |

## Señales de alarma

* Un agregado con colecciones que crecen sin límite (`Product.backlogItems` con miles de elementos) [Destilado cap. 5; IDDD cap. 10].
* Fallos frecuentes por concurrencia en un agregado concreto.
* Propiedades que son otro agregado completo (`order.customer.address.city`).
* Servicios de aplicación que guardan dos o más agregados en la misma transacción "porque sí".
* Un agregado que recibe un repositorio por constructor.
* Setters públicos o un `update(dto)` genérico [Destilado cap. 5].
* Lógica de negocio en servicios de aplicación o en clases `Helper`/`Utils` [Destilado cap. 5].
* Relaciones bidireccionales mantenidas solo por comodidad o por la versión de concurrencia [IDDD cap. 10].

## Programación funcional

Con un estilo funcional, separar datos y comportamiento no es anemia: el agregado es un tipo inmutable y las funciones devuelven un estado nuevo o un evento. Parte de esta guía orientada a objetos no aplica tal cual [Destilado cap. 5]. `ddd-skills/ddd-agregados/references/implementacion-ts.md` incluye una variante funcional escrita con los value objects y eventos del paquete; el paquete no da su base ni su persistencia `[Fuera de los libros: convención de @archi-code/ddd]`.

## Ejemplo completo

`ddd-skills/ddd-agregados/references/ejemplo-ecommerce.md` aplica el procedimiento de dimensionado a Pedido, Pago y Reserva de stock, con la tabla de reacciones y plazos; el código del agregado `Order` está en `ddd-skills/ddd-agregados/references/implementacion-ts.md` y la política que registra la reserva, en `ddd-skills/ddd-agregados/references/consistencia-eventual.md`.

## Siguiente guía

* Diseño, publicación y consumo de eventos → `ddd-skills/ddd-eventos-dominio/GUIA.md`.
* Repositorio del agregado → `ddd-skills/ddd-repositorios-persistencia/GUIA.md`.
* Casos de uso que cargan, invocan y guardan agregados → `ddd-skills/ddd-servicios-capa-aplicacion/GUIA.md`.
