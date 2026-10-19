# Event Sourcing y CQRS

> Guía de la suite DDD de @archi-code/ddd: se lee solo a través del skill `archi-code-ddd` (packages/ddd/SKILL.md), nunca como skill independiente.

**Cuándo usarla.** Úsala siempre que alguien mencione event sourcing, CQRS, read models, proyecciones, auditoría completa de cambios, "volver a un estado anterior", event store, o pantallas lentas que cruzan muchos agregados, aunque la pregunta sea solo "¿debería usar...?".

Dos patrones distintos que a menudo van juntos. **CQRS** separa el modelo que ejecuta comandos (agregados) de los modelos que responden consultas [IDDD cap. 4]. **Event Sourcing** guarda el estado de un agregado como la secuencia de eventos que le han ocurrido y lo reconstruye aplicándolos [Destilado cap. 6; IDDD apéndice A]. Event Sourcing casi siempre exige alguna forma de CQRS, porque los streams de eventos son difíciles de consultar [IDDD apéndice A; Destilado cap. 6]. CQRS no exige Event Sourcing.

## Convenciones de la suite DDD

* **Trazabilidad.** Cada regla indica su origen: `[Destilado cap. N]`, `[IDDD cap. N]`, `[IDDD apéndice A]`, `[PHP: capítulo]`. Lo que no sale de esos libros va marcado `[Fuera de los libros]`. Respeta estas marcas al responder.
* **Idioma.** Responde en el idioma de la persona. El código de ejemplo es TypeScript.
* **Honestidad del modelo.** Si faltan datos para decidir, declara los supuestos.

## Paso 1. Decidir (la mayoría de las veces, no)

Ningún estilo es para todo: se usa donde mitiga un riesgo concreto [IDDD cap. 4].

### CQRS

| A favor | En contra |
|---|---|
| Vistas que cruzan muchos agregados y no encajan en repositorios [IDDD cap. 4] | Interfaz sencilla que sigue a un agregado: CQRS añade complejidad accidental [IDDD cap. 4] |
| Volumen de lectura muy superior al de escritura `[Fuera de los libros]` | Usuarios que necesitan ver al instante lo que acaban de escribir, sin margen de diseño |
| Muchos `findBy` en repositorios: señal de IDDD [IDDD cap. 12] | |

Antes de CQRS completo, prueba el paso intermedio: consultas SQL de solo lectura sobre las mismas tablas (`ddd-arquitectura`).

### Event Sourcing

Beneficios [IDDD apéndice A; Destilado cap. 6]:
* No se pierde el motivo de ningún cambio: auditoría completa, análisis, depuración mirando atrás.
* Escritura solo por anexión, muy rápida.
* Libertad estructural: la forma interna del agregado puede cambiar sin migrar datos; el stream se puede llevar a otra infraestructura o a un equipo de desarrollo para reproducir un error.
* Tiende a producir agregados más pequeños.

Inconvenientes que el propio apéndice reconoce [IDDD apéndice A]:
* Definir buenos eventos exige conocer el dominio a fondo; solo compensa en modelos complejos que dan ventaja competitiva.
* Herramientas y conocimiento menos maduros; pocos desarrolladores con experiencia.
* Obliga a CQRS: más carga cognitiva y curva de aprendizaje.

Recomendación de esta suite `[Fuera de los libros]`: Event Sourcing solo en agregados del Core Domain donde el historial es un requisito de negocio (o legal) o donde las preguntas "¿cómo llegó a este estado?" son frecuentes. No en todo el sistema. Si solo hace falta auditoría, el outbox de `ddd-eventos-dominio` ya deja un registro de eventos sin cambiar la persistencia.

Registra la decisión como ADR (por ejemplo en `docs/adr/`).

## Paso 2. Implementar Event Sourcing

Guía completa en `references/event-sourcing-ts.md`. Esquema:

1. El agregado separa **decidir** (comprobar reglas y emitir eventos) de **aplicar** (cambiar estado a partir de un evento). IDDD propone incluso dos clases, una de estado y otra de comportamiento, que solo colaboran a través de `apply` [IDDD apéndice A].
2. Cargar: leer el stream del agregado y aplicar sus eventos en orden.
3. Ejecutar el comando: genera eventos nuevos (cambios pendientes).
4. Guardar: anexar los cambios con la **versión esperada** del stream; si otro escribió antes, conflicto [IDDD apéndice A].
5. Ante conflicto: reintentar recargando y reejecutando, o propagar al cliente [IDDD apéndice A].
6. Publicar: un proceso en segundo plano lee lo anexado y lo publica [IDDD apéndice A].

Rendimiento: caché de streams en memoria (los eventos son inmutables) y **snapshots** para streams largos [IDDD apéndice A; Destilado cap. 6].

## Paso 3. Proyecciones y read models

Suscriptores que reciben eventos y mantienen modelos de lectura persistentes; parecidos a un agregado, pero para consultar [IDDD apéndice A]. Se pueden **reconstruir** reproduciendo todos los eventos, lo que permite cambiar una vista sin tocar el agregado [IDDD apéndice A]. También sirven para dar a un agregado datos de otro de forma desacoplada, a través de un servicio de dominio que consulta la proyección [IDDD apéndice A].

Guía en `references/proyecciones-cqrs-ts.md`.

## Paso 4. La interfaz con un modelo de lectura eventual

Diseña para el peor caso: la vista siguiente puede no reflejar todavía el comando [IDDD cap. 4]. Opciones de IDDD: mostrar temporalmente lo enviado; mostrar la antigüedad de los datos (técnica discutida, validar con usuarios); actualizaciones push; o avisar de que la operación se está procesando [IDDD cap. 4].

## Paso 5. Eventos con doble función

En Event Sourcing los eventos sirven para persistir el agregado **y** para comunicar al resto de la empresa. Eso crea tensión: lo que necesita el agregado no es lo que necesitan los consumidores. IDDD lo trata como enriquecimiento de eventos [IDDD apéndice A]. Pauta `[Fuera de los libros]`: eventos internos del stream con lo mínimo para reconstruir, y eventos publicados traducidos al Published Language (igual que en `ddd-eventos-dominio`).

## Datos personales e inmutabilidad

`[Fuera de los libros]` Un stream inmutable choca con el derecho de supresión del RGPD. Opciones: no guardar datos personales en los eventos (solo identificadores y los datos en un almacén borrable); o cifrar los datos personales con una clave por persona y destruir la clave al suprimir ("crypto-shredding"). Decide esto antes de escribir el primer evento y consúltalo con quien lleve protección de datos en la organización.

## Señales de alarma

* Event Sourcing en todo el sistema "por si acaso".
* Eventos tipo `OrderUpdated` con el estado completo en el stream.
* Proyecciones que no se pueden reconstruir (dependen de estado externo no reproducible).
* Proyecciones no idempotentes.
* Agregados que consultan read models para proteger invariantes (las invariantes viven en el agregado).
* Datos personales en eventos sin estrategia de supresión.
* CQRS con dos bases de datos para un CRUD de cinco pantallas.

## Siguiente skill

* Revisar un sistema existente → `ddd-auditoria-refactorizacion`.
