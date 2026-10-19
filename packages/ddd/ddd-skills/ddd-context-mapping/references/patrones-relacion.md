# Patrones de relación entre contextos

Para cada patrón: qué es, cuándo usarlo, qué cuesta y cómo se reconoce en el código. Las definiciones vienen de [Destilado cap. 4] salvo indicación. Las columnas "cómo se reconoce" y "cómo implementarlo" son `[Fuera de los libros]` salvo cita.

## Upstream y downstream

El upstream (U) es el contexto del que se depende; sus cambios afectan al downstream (D). No indica dirección del flujo de datos: un contexto puede enviar eventos a otro y aun así ser downstream si se adapta a lo que el otro decide.

## Partnership (Alianza)

* **Qué es:** cada equipo tiene su contexto, pero se coordinan para objetivos dependientes. Triunfan o fracasan juntos; se reúnen a menudo y usan integración continua.
* **Cuándo:** lanzamientos conjuntos, funcionalidades que no tienen sentido por separado.
* **Coste:** compromiso muy alto. Difícil de sostener; debe durar mientras aporte ventaja y luego cambiar a otra relación.
* **Cómo se reconoce:** planificación conjunta, tests de contrato que ejecutan ambos equipos.
* **Cómo implementarlo:** fecha de revisión explícita en el mapa; tests de contrato en el pipeline de ambos.

## Shared Kernel (Kernel compartido)

* **Qué es:** dos o más equipos comparten un modelo pequeño y común. Deben acordar qué comparten; puede que solo un equipo mantenga, compile y pruebe ese código.
* **Cuándo:** cuando compartir es claramente mejor que ir por separado y todos se comprometen.
* **Coste:** difícil de concebir y mantener; exige comunicación abierta y acuerdo constante. IDDD lo considera poco común y algo que se evita si es posible [IDDD cap. 2].
* **Riesgo:** compartir clases entre sistemas lleva por una pendiente resbaladiza, y declararlo Shared Kernel no lo justifica por sí solo [IDDD cap. 13].
* **Cómo implementarlo:** paquete versionado (por ejemplo `@empresa/kernel-ventas-almacen`) con dueño, revisión obligatoria de ambos equipos en cada cambio y contenido limitado a value objects estables (identificadores, `Money`). Nunca agregados.

## Customer-Supplier (Cliente-proveedor)

* **Qué es:** el proveedor (U) domina porque decide qué recibe el cliente (D) y cuándo, pero el cliente planifica con él. Relación muy común y práctica, siempre que la cultura no permita al proveedor ignorar al cliente.
* **Cuándo:** equipos de la misma organización con dependencia clara.
* **Cómo implementarlo:** el downstream presenta sus necesidades en la planificación del upstream; contratos (tests de contrato dirigidos por el consumidor, por ejemplo con Pact) en el pipeline del upstream.

## Conformist (Conformista)

* **Qué es:** el upstream no tiene motivación para atender al downstream, y este no puede sostener la traducción, así que adopta el modelo upstream tal cual. Ejemplo del libro: integrarse como vendedor en un gran marketplace.
* **Cuándo es aceptable:** el modelo upstream es bueno y estable (un OHS bien diseñado es mucho más tolerable que un sistema heredado), y tu contexto no es Core.
* **Riesgo:** los cambios upstream te llegan sin filtro. Puede ser una decisión forzada que no se ve: IDDD cuenta el caso de un equipo que esperaba Customer-Supplier y se encontró Conformist [IDDD cap. 3].
* **Cómo se reconoce:** los nombres del proveedor aparecen en tu dominio (`MarketplaceListingStatus` en tus agregados).

## Anticorruption Layer (Capa anticorrupción)

* **Qué es:** la relación más defensiva. El downstream crea una capa que traduce entre su modelo y el upstream, aislándose de conceptos externos.
* **Cuándo:** siempre que sea posible entre tu modelo y un modelo de integración upstream; obligatoria frente a una Big Ball of Mud o a integración por base de datos.
* **Coste:** como contratar un intérprete; en algunos casos puede ser demasiado alto.
* **Estructura en IDDD:** un servicio de dominio como interfaz de la capa, un adaptador que actúa de cliente del sistema remoto y un traductor que convierte el Published Language en conceptos locales [IDDD cap. 3]. Implementación en `ddd-skills/ddd-context-mapping/references/anticorrupcion-ts.md`.

## Open Host Service (Servicio abierto)

* **Qué es:** un protocolo o interfaz que da acceso al contexto mediante servicios, abierto para que cualquiera pueda integrarse con facilidad; API documentada y agradable de usar.
* **Cuándo:** contextos upstream con varios consumidores.
* **Matiz:** exponer el modelo de dominio como recursos navegables no es un OHS; según el tamaño de lo expuesto, es un Shared Kernel o fuerza a Conformist [IDDD cap. 13].
* **Cómo implementarlo:** endpoints y mensajes diseñados por casos de uso del consumidor, versionados, con su Published Language.

## Published Language (Idioma publicado)

* **Qué es:** lenguaje de intercambio bien documentado que permite consumir y traducir con facilidad desde varios contextos. Se puede definir con XML Schema, JSON Schema, Protobuf o Avro.
* **Con OHS:** combinación que simplifica mucho la traducción.
* **Variante IDDD:** un media type propio que actúa de contrato y evita distribuir clases entre sistemas [IDDD cap. 13].
* **Cómo implementarlo en TypeScript:** esquemas JSON publicados en el repositorio del productor; el consumidor los valida en su adaptador (por ejemplo con Zod o Ajv) y nunca importa tipos del productor.

## Separate Ways (Caminos separados)

* **Qué es:** integrar no produce beneficios significativos; se implementa una solución propia en el contexto y se olvida la integración.
* **Cuándo:** el coste de integrar supera el de duplicar una funcionalidad pequeña.
* **Riesgo:** duplicar algo que luego sí necesita coherencia entre contextos.

## Big Ball of Mud

* **Qué es:** sistema sin límites. Con el tiempo los agregados crecen y se contaminan, tocar una parte genera incertidumbre en todo y solo sobrevive gracias al conocimiento tribal.
* **Regla:** si hay que integrarse, una ACL por cada sistema de este tipo. No hables su lenguaje.

## Combinaciones habituales

| Upstream | Downstream | Lectura |
|---|---|---|
| OHS + PL | ACL | La integración más limpia: el upstream publica bien y el downstream traduce |
| OHS + PL | Conformist | Aceptable si el downstream no es Core |
| Sistema heredado sin API | ACL (sobre BD o ficheros) | Último recurso, siempre aislado |
| Customer-Supplier | ACL | El upstream escucha y el downstream protege su núcleo |
