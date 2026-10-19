# Descubrimiento del dominio

> Guía de la suite DDD de @archi-code/ddd: se lee solo a través del skill `archi-code-ddd` (packages/ddd/SKILL.md), nunca como skill independiente.

**Cuándo usarla.** Úsala siempre que alguien quiera empezar un proyecto con DDD, hacer una lluvia de ideas del dominio, entender un negocio antes de modelar, preparar o interpretar un Event Storming, definir o revisar el lenguaje ubicuo, escribir escenarios de negocio, o cuando pida "por dónde empiezo con DDD", aunque no mencione estos términos. Es el primer paso de la suite DDD; sus salidas alimentan ddd-subdominios-bounded-contexts y ddd-agregados.

Este skill cubre la fase en la que todavía no hay modelo, solo un negocio que entender. Su salida es conocimiento compartido y verificable, no clases. La idea de fondo de Vernon es que la conversación entre expertos y desarrolladores vale más que cualquier documento, y que al final el código es el modelo [Destilado cap. 2]. Todo lo que se produce aquí (notas, glosarios, bocetos) es andamio para llegar a ese código.

## Convenciones de la suite DDD

* **Trazabilidad.** Cada regla indica su origen: `[Destilado cap. N]` (Domain-Driven Design Destilado / Distilled, Vernon), `[IDDD cap. N]` (Implementing Domain-Driven Design, Vernon), `[PHP: capítulo]` (Domain-Driven Design in PHP). Lo que no sale de esos libros va marcado `[Fuera de los libros]`. Respeta estas marcas al responder: si apoyas una recomendación en algo marcado así, dilo.
* **Idioma.** Responde en el idioma de la persona. El código de ejemplo es TypeScript.
* **Honestidad del modelo.** Nunca presentes como validado por negocio algo que no ha pasado por un experto del dominio. Si trabajas sin expertos, todo sale como hipótesis.

## Elige el modo de trabajo antes de empezar

Lee la petición y decide cuál aplica. Si no está claro, pregunta una sola cosa: si hay expertos del dominio disponibles.

| Modo | Cuándo | Qué produces |
|---|---|---|
| **A. Preparar una sesión** | Van a reunir a personas para un Event Storming | Agenda, lista de asistentes, material, guion de facilitación y preguntas semilla |
| **B. Descubrimiento asistido** | Solo hay documentación, código heredado, tickets o una descripción | Un Event Storming textual como **hipótesis**, con cada elemento marcado `por validar` y una lista de preguntas para expertos `[Fuera de los libros]` |
| **C. Digitalizar resultados** | Ya hubo sesión y traen fotos, notas o un tablero de Miro | Los artefactos limpios: línea temporal, glosario, hotspots, contextos candidatos y escenarios |

En el modo B ten cuidado con un sesgo concreto: el código heredado y las tablas de base de datos empujan a modelar sustantivos y datos. Reconstruye primero el **proceso** (qué ocurre y en qué orden) y solo después mira los datos. Es exactamente el orden que propone Event Storming [Destilado cap. 7].

## Flujo de trabajo

### Paso 0. ¿Merece la pena DDD aquí?

DDD paga cuando la complejidad del negocio supera a la técnica [Destilado cap. 2]. IDDD propone una puntuación (DDD Scorecard) para decidirlo; con 7 puntos o más recomienda considerarlo en serio [IDDD cap. 1]. Como heurística rápida `[Fuera de los libros, inspirada en esa tabla; consulta la original]`:

* Señales a favor: reglas de negocio que cambian a menudo, expertos que discrepan entre sí sobre términos, procesos con muchos estados y excepciones, ventaja competitiva ligada a ese software.
* Señales en contra: CRUD con pocas reglas, formularios sobre tablas, lógica que cabe en validaciones de campo. Ahí un Transaction Script es honesto y más barato [IDDD cap. 1].

Avisa si detectas intención de hacer **DDD-Lite**: usar patrones tácticos (entidades, repositorios) sin lenguaje ubicuo ni Bounded Contexts. Vernon lo describe como un camino de menor recompensa y origen de problemas [IDDD cap. 1].

### Paso 1. Identificar a las personas

* Busca al menos un experto del dominio por función de negocio. Los departamentos suelen anticipar dónde estarán los límites de los modelos, porque cada función da significados distintos al mismo término [Destilado cap. 2].
* El Product Owner no es automáticamente el experto. Suele centrarse en priorizar el backlog; asegúrate de que hay alguien que domina de verdad el negocio [Destilado cap. 2].
* "Experto del dominio" no es un cargo. Es quien vive el negocio día a día [Destilado cap. 2].

### Paso 2. Event Storming

Resumen del método de Vernon [Destilado cap. 7]. El detalle (colores, facilitación, notación textual, errores típicos) está en `references/event-storming.md`. Léelo antes de preparar o ejecutar una sesión.

1. **Eventos de dominio** en naranja, en pasado, de izquierda a derecha en orden temporal. Lo paralelo va en vertical. Más eventos de los necesarios es mejor que pocos.
2. **Hotspots** en púrpura o rojo donde haya dudas, conflictos o dolor. Son la mejor señal de dónde hay que aprender más.
3. **Comandos** en azul, en imperativo, a la izquierda del evento que causan. Los roles relevantes en amarillo pequeño.
4. **Procesos o políticas** en lila cuando un evento o comando dispara más trabajo.
5. **Agregados o entidades** en amarillo, sustantivos, encima de sus pares comando/evento. Se repite la nota si el agregado aparece en varios puntos: manda la línea temporal.
6. **Límites**: línea continua para Bounded Contexts, discontinua para subdominios, nombres en rosa, flechas para eventos que cruzan contextos.
7. **Vistas** en verde, solo las que requieran cuidado especial.

Los pasos 6 y 7 son opcionales y suelen hacerse en sesiones posteriores.

### Paso 3. Desafiar y unificar

Para cada concepto que aparezca, pregunta "¿es fundamental para esta iniciativa?" y clasifícalo [Destilado cap. 2]:

| Categoría | Qué significa | Acción |
|---|---|---|
| En contexto | Forma parte del lenguaje del núcleo | Entra al glosario del contexto |
| Fuera de contexto | Pertenece a otro modelo (usuarios, permisos, pagos en un sistema de gestión de proyectos) | Se saca; se integrará mediante Context Mapping |
| En contexto, fuera de alcance | Es del núcleo pero no toca ahora | Se anota para iteraciones posteriores |

Sustituye términos genéricos por los del negocio. El ejemplo del libro: `User` deja paso a `ProductOwner` y `TeamMember`, porque así habla el negocio aunque técnicamente sean usuarios [Destilado cap. 2].

### Paso 4. Escenarios concretos

El lenguaje no son solo sustantivos. Escribe escenarios de cómo funciona el modelo (no casos de uso ni historias de usuario) y desafíalos con preguntas de quién, qué condiciones y quién se entera [Destilado cap. 2]. Luego pásalos a Given/When/Then y a un test de aceptación que se ejecuta contra el modelo de dominio. Plantillas, preguntas de refinamiento y ejemplos en TypeScript en `references/escenarios-y-especificaciones.md`.

### Paso 5. Glosario del lenguaje ubicuo

Hay **un lenguaje ubicuo por Bounded Context**; intentar uno para toda la empresa fracasa [IDDD cap. 1]. Construye un glosario por contexto con la plantilla de `assets/plantilla-glosario.md` y las reglas de `references/lenguaje-ubicuo.md`, que incluyen cómo decidir el idioma de los identificadores en código.

### Paso 6. Planificar el modelado

Si el trabajo va a entrar en un proyecto ágil, usa `references/planificacion-agil.md`: análisis DOFA, modeling spikes, deuda de modelo, estimación por componentes, timeboxed modeling y cuánto tiempo pedir a los expertos [Destilado cap. 7].

## Entregable

Cuando termines una ronda de descubrimiento, entrega siempre este documento (adapta lo que no aplique, pero conserva el orden):

```markdown
# Descubrimiento: <nombre de la iniciativa>
Modo: A | B | C    Estado: hipótesis | validado con <expertos, fecha DD/MM/AAAA>

## 1. Objetivo de negocio y por qué DDD
## 2. Personas y expertos por función
## 3. Línea temporal de eventos (notación de references/event-storming.md)
## 4. Hotspots abiertos (pregunta, a quién, impacto)
## 5. Desafiar y unificar (en contexto / fuera / fuera de alcance)
## 6. Contextos y subdominios candidatos (solo propuesta; se decide en ddd-subdominios-bounded-contexts)
## 7. Agregados candidatos (solo nombres y comandos; se diseñan en ddd-agregados)
## 8. Glosario por contexto
## 9. Escenarios clave en Given/When/Then
## 10. Siguientes pasos y deuda de modelo
```

## Señales de alarma

Detén el trabajo y avisa si ves alguna de estas:

* Se empieza por un diagrama entidad-relación o por el esquema de base de datos. Event Storming deja los datos para el tercer paso porque empezar por ellos cierra conversaciones [Destilado cap. 7].
* No hay ningún experto del dominio y aun así se quiere "cerrar" el modelo.
* El glosario tiene un término con dos definiciones que se usan a la vez en el mismo contexto. Es una frontera de contexto sin dibujar.
* Se modela en detalle algo genérico (registro de usuarios, notificaciones). Vernon recomienda reducirlo a un único evento y seguir [Destilado cap. 7].
* Se trata el lenguaje como cerrado. El lenguaje crece siempre, también en "mantenimiento" [Destilado cap. 2].
* La documentación del modelo pesa más que la conversación [Destilado cap. 2].

## Ejemplo completo

`references/ejemplo-ecommerce.md` recorre todo el flujo para una tienda online (pedidos, pagos, almacén): línea temporal, hotspots, desafío de términos, glosario, escenario y test. Úsalo como patrón de calidad del entregable.

## Siguiente skill

* Contextos y subdominios candidatos → `ddd-subdominios-bounded-contexts`.
* Relaciones entre contextos y eventos que cruzan límites → `ddd-context-mapping`.
* Agregados candidatos con sus comandos y eventos → `ddd-agregados`.
