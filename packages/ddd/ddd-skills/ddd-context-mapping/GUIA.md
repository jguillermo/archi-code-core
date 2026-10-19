# Context Mapping

> Parte del skill `archi-code-ddd`: léela solo cuando ese skill te dirija aquí. Los ejemplos están escritos con la API de `@archi-code/ddd` (las clases de su `src`) y se copian tal cual; las guías son la fuente de verdad: el paquete solo se aparta de ellas donde lo marca `[Fuera de los libros: convención de @archi-code/ddd]`, y cualquier otra discrepancia es un defecto del paquete.
>
> **Cuándo consultar esta guía.** Context Mapping de DDD para decidir cómo se integran en el código los Bounded Contexts. Cubre los patrones de integración entre modelos (Shared Kernel, Conformist, Anticorruption Layer, Open Host Service, Published Language, Separate Ways, Big Ball of Mud), upstream y downstream, estilos de integración (RPC, REST, mensajería con eventos), contratos e idioma publicado, idempotencia, consistencia eventual entre contextos, procesos de larga duración y cómo implementar una capa anticorrupción en TypeScript. Consúltala siempre que haya que conectar dos sistemas, servicios o módulos, integrar con un ERP, CRM, pasarela o sistema heredado, decidir entre llamada síncrona y eventos, diseñar una API pública entre servicios, o cuando un modelo empiece a copiar conceptos de otro, aunque no se mencione "context map".

## Con @archi-code/ddd

[Fuera de los libros: convención de @archi-code/ddd]

* El paquete no trae capa anticorrupción, Open Host Service ni Published Language: se escriben en el proyecto sobre sus clases y puertos. El puerto hacia otro contexto (`ProductPricing`) es una interfaz en `domain/` que recibe y devuelve value objects (`Sku`, un `Composite` `SellableProduct`); adaptador (`CatalogHttpProductPricing`) y traductor (`CatalogTranslator`) van en `infrastructure/` y lanzan una `InfrastructureException` con código propio (`CAT001`), que `HttpErrorMapper` traduce (`new HttpErrorMapper({ CAT001: 503 })`).
* Un webhook entrante es un punto de entrada en `interfaces/` que traduce el lenguaje del emisor a la entrada de un `UseCase` y responde con `HttpErrorMapper`.
* Los mensajes entre contextos viajan como `SerializedEvent` plano (`{ eventName, eventVersion, eventId, aggregateId, occurredOn, ...datos }`) por un `EventChannel` (tu canal de broker o de outbox), no con el envoltorio de IDDD `{ notificationId, typeName, version, occurredOn, event }`: `eventName` hace de `typeName` (`'sales.order.OrderPlaced'`), `eventVersion` de `version` y `eventId` identifica el mensaje para deduplicar. No hay `notificationId` secuencial: si un feed REST lo necesita, lo asigna tu canal duradero.
* Lo que sale se traduce al Published Language en infraestructura, con un `EventChannel` propio en el adaptador del broker (`ContractPublishingChannel` + `SalesContracts`, en `ddd-skills/ddd-eventos-dominio/references/publicacion-ts.md`); nunca se publica fuera del contexto el `toJSON()` de un evento interno tal cual.
* Lo que entra de otro contexto se lee con una clase propia `extends EventBase` que lleva el nombre publicado y solo los campos que este contexto usa; la factoría de `EventRegistry` es el traductor, y un `EventListener` con `@ListensTo(Evento, { consumer })` ejecuta un caso de uso, que valida cada campo con value objects en `toCommand`.
* Los procesos entre contextos se encadenan con eventos y listeners, cada uno con su caso de uso.

Una línea entre dos Bounded Contexts significa **integración técnica** y **traducción entre dos lenguajes** [Destilado cap. 4]. Esta guía decide el tipo de cada línea y cómo se implementa.


## Flujo de trabajo

### Paso 1. Elegir el patrón de integración para cada relación

Para cada par de contextos que se relacionan, anota quién es upstream (U, de quien depende el otro) y quién downstream (D) [Destilado cap. 4]. Resumen [Destilado cap. 4]:

| Patrón | Esencia |
|---|---|
| Shared Kernel | Pequeño modelo común compartido por acuerdo explícito. Difícil de mantener; se evita si es posible [IDDD cap. 2] |
| Conformist | El downstream adopta el modelo upstream tal cual |
| Anticorruption Layer | El downstream traduce entre el modelo upstream y el suyo; la opción más defensiva |
| Open Host Service | El upstream ofrece un protocolo abierto, documentado y cómodo para cualquier integrador |
| Published Language | Formato de intercambio documentado (JSON Schema, Protobuf, Avro); suele ir con OHS |
| Separate Ways | No integrar: la integración no aporta lo suficiente |
| Big Ball of Mud | Sistema sin fronteras; si hay que integrarse, siempre con ACL y sin hablar su lenguaje |

Árbol de decisión rápido `[Fuera de los libros: síntesis de las definiciones]`:

1. ¿La integración aporta valor real? No → Separate Ways.
2. ¿Eres downstream? Entonces:
   * ¿El upstream es un Big Ball of Mud o un producto externo? → ACL, siempre.
   * ¿Tu contexto es Core? → ACL, salvo coste desproporcionado.
   * ¿El upstream ofrece OHS con Published Language y su modelo se parece al tuyo? → Conformist puede ser aceptable.
3. ¿Eres upstream con varios consumidores? → Open Host Service con Published Language.
4. ¿La tentación es compartir clases o tablas? → Para y revisa: casi siempre se resuelve mejor con Published Language.

### Paso 2. Elegir el estilo de integración

Vernon los ordena de menos a más robusto: RPC, REST, mensajería [Destilado cap. 4]. Detalle en `ddd-skills/ddd-context-mapping/references/estilos-integracion.md`.

Reglas que aplican siempre:

* **Integración por base de datos o ficheros:** evitarla. Si es inevitable, aislar el modelo con ACL [Destilado cap. 4].
* **Asume los principios de la computación distribuida:** la red falla, hay latencia, el ancho de banda no es infinito, la red no es segura, la topología cambia, hay varios administradores, el transporte cuesta y la red es heterogénea [IDDD cap. 13].
* **Evita los choques de trenes de integración:** si C0 hace una petición bloqueante a C1, C1 no debe hacer a su vez una petición bloqueante a S1 para responderla. Usa mensajería [Destilado cap. 4].
* **Recursos REST sintéticos:** diseñados para los casos de uso del cliente, no como espejo de los agregados. Exponer el modelo tal cual obliga a todos a ser Conformist [Destilado cap. 4; IDDD cap. 13].
* **Los consumidores dependen del esquema, no de las clases del productor.** Leen el Published Language (por ejemplo JSON) y lo traducen a sus propios tipos [Destilado cap. 4; IDDD cap. 13].
* **Mensajería:** el mecanismo debe garantizar entrega al menos una vez y el receptor debe ser idempotente [Destilado cap. 4].
* **Estado remoto mínimo:** copia solo los atributos que tu modelo necesita y modélalos con tus conceptos. Si no, tu `ProductOwner` acaba siendo un `User` disfrazado [IDDD cap. 3].
* **La indisponibilidad se modela:** "todavía no está" es un estado válido del dominio, no un error. IDDD lo resuelve con un estado explícito en un value object [IDDD cap. 3].

### Paso 3. Diseñar la traducción

Para cada relación con ACL, define puerto, adaptador y traductor. Implementación con `@archi-code/ddd` (puerto con value objects, adaptador HTTP, webhook entrante, eventos de otro contexto y Published Language de salida) en `ddd-skills/ddd-context-mapping/references/anticorrupcion-ts.md`.

Para cada evento que cruza un contexto, decide entre **evento enriquecido** (más autonomía del consumidor, pero difícil prever todo y riesgo de exponer datos sensibles) o **evento ligero con consulta al origen** (query-back), o una mezcla [Destilado cap. 4].

## Señales de alarma

* Un contexto importa tipos (clases, interfaces, enums) del dominio de otro.
* Tablas compartidas entre contextos.
* API REST que devuelve el agregado serializado con todos sus campos.
* Una petición de usuario que atraviesa tres servicios en cadena de forma síncrona.
* Un consumidor de eventos sin control de duplicados.
* Un contexto publica hacia fuera el `toJSON()` de sus eventos internos, o un listener recibe la clase de evento de otro contexto importada de su código.
* "Shared Kernel" usado como excusa para compartir una librería de modelos que crece sin acuerdo [IDDD cap. 13].
* El código copia sin traducir el modelo de un proveedor.

## Siguiente guía

* Estructura interna de cada contexto y dónde vive el ACL → `ddd-skills/ddd-arquitectura/GUIA.md`.
* Diseño de los eventos que se publican → `ddd-skills/ddd-eventos-dominio/GUIA.md`.
* Consistencia eventual entre agregados y procesos → `ddd-skills/ddd-agregados/GUIA.md`.
