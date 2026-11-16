# Context Mapping

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Cómo se integran en el código los Bounded Contexts: patrones de relación, estilos (RPC, REST, mensajería), contratos, idempotencia y capa anticorrupción. La forma del código la fija `ddd-skills/archi-code-ddd/`.

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* El paquete no trae ACL, Open Host Service ni Published Language: se escriben en el proyecto. El puerto (`ProductPricing`) es una interfaz en `domain/service/` que habla con value objects; adaptador y traductor van en `infrastructure/` y lanzan una `InfrastructureException` con código propio (`CAT001`), que el punto de entrada traduce (sin traducción, `ExceptionKind.Internal`).
* Un webhook entrante es un punto de entrada en `interfaces/` que traduce al input de un `UseCase` y responde según `ExceptionClassifier.classify(error)`.
* Los mensajes son `SerializedEvent` planos (`{ eventName, eventId, occurredOn, ...datos }`) por un `EventChannel`, no el envoltorio de IDDD: `eventName` hace de tipo y de versión (una versión incompatible es otro nombre), `eventId` deduplica; no hay `notificationId` (si un feed REST lo necesita, lo asigna tu canal duradero).
* Lo que sale del sistema se traduce al Published Language en el adaptador del broker (un `EventChannel` del proyecto que envuelve al interno: `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`, "Lenguaje publicado en el adaptador del broker"); nunca `{ ...event }`. Dentro del sistema, el JSON del evento interno es el contrato y no cambia de forma incompatible bajo el mismo `eventName`.
* Lo que entra se lee con una copia propia `extends EventBase` por evento y contexto (mismo `eventName`, los campos que leen sus reacciones) en `application/<acción>/` de la primera reacción, registrada una vez; la factoría de `EventRegistry` es el traductor y lo ejecuta un caso de uso por reacción `<Acción>On<Evento>` con `@ListensTo`.
* Los procesos entre contextos se encadenan con eventos y casos de uso por reacción.
* Un contexto nunca importa otro; solo `shared-kernel/` (el dinero). Los agregados ajenos se referencian con un `UuidType` propio (`OrderReference`).

## Paso 1. Patrón de cada relación

Anota quién es upstream y quién downstream [Destilado cap. 4].

| Patrón | Esencia |
|---|---|
| Shared Kernel | Modelo común pequeño por acuerdo explícito; difícil de mantener, evitarlo si se puede [IDDD cap. 2] |
| Conformist | El downstream adopta el modelo upstream |
| Anticorruption Layer | El downstream traduce; la opción más defensiva |
| Open Host Service | Protocolo abierto y documentado para cualquier integrador |
| Published Language | Formato documentado de intercambio; suele ir con OHS |
| Separate Ways | No integrar |
| Big Ball of Mud | Si hay que integrarse, siempre con ACL y sin hablar su lenguaje |

Decisión `[Fuera de los libros: síntesis de las definiciones]`: sin valor → Separate Ways; upstream heredado o externo → ACL siempre; contexto Core → ACL salvo coste desproporcionado; upstream con OHS + Published Language parecido a tu modelo → Conformist aceptable; upstream con varios consumidores → OHS + Published Language; ¿compartir clases o tablas? → casi siempre Published Language.

## Paso 2. Estilo de integración

De menos a más robusto: RPC, REST, mensajería [Destilado cap. 4]. Detalle en `ddd-skills/ddd-context-mapping/references/estilos-integracion.md`.

* Evitar integrar por base de datos o ficheros; si es inevitable, ACL [Destilado cap. 4].
* Principios de la computación distribuida: la red falla, hay latencia, el ancho de banda no es infinito, no es segura, la topología cambia, hay varios administradores, el transporte cuesta y es heterogénea [IDDD cap. 13].
* Nada de cadenas de peticiones bloqueantes entre contextos; usar mensajería [Destilado cap. 4].
* Recursos REST sintéticos, no espejo de los agregados [Destilado cap. 4; IDDD cap. 13].
* Los consumidores dependen del esquema, no de las clases del productor [Destilado cap. 4; IDDD cap. 13].
* Entrega al menos una vez y receptor idempotente [Destilado cap. 4].
* Estado remoto mínimo, con tus conceptos [IDDD cap. 3].
* "Todavía no está" es un estado del dominio, no un error [IDDD cap. 3].

## Paso 3. Traducción

Para cada ACL: puerto, adaptador y traductor; código en `ddd-skills/ddd-context-mapping/references/anticorrupcion-ts.md`. Para cada evento que cruza: enriquecido (más autonomía, pero difícil prever todo y riesgo de exponer datos sensibles), ligero con consulta al origen, o mezcla [Destilado cap. 4].

## Señales de alarma

* Un contexto importa tipos de otro, o comparten tablas.
* REST que devuelve el agregado serializado.
* Peticiones síncronas en cadena entre servicios.
* Consumidor sin control de duplicados.
* Eventos internos publicados fuera tal cual.
* Shared Kernel que crece sin acuerdo [IDDD cap. 13].
* Código que copia sin traducir el modelo de un proveedor.
