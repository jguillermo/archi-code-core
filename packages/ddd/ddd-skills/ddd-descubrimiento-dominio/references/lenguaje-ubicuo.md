# Lenguaje ubicuo (Ubiquitous Language)

## Qué es y qué no es

* Es un lenguaje compartido que construye **el equipo**, expertos y desarrolladores juntos. No es solo la jerga de los expertos: ellos influyen mucho, pero a menudo discrepan entre sí o no han pensado en todos los casos, así que el lenguaje sale de discusión, consenso y compromiso [IDDD cap. 1].
* Se negocian los conceptos y los significados; la calidad del lenguaje no se negocia [IDDD cap. 1].
* Es riguroso: estricto, exacto y preciso [Destilado cap. 2].
* Se habla en voz alta y se implementa en el código. Si el equipo no lo usa al hablar, no es ubicuo [IDDD cap. 1].
* Está vivo: crece y cambia con cada descubrimiento, también en "mantenimiento" [IDDD cap. 1; Destilado cap. 2].

## Alcance

* **Un lenguaje por Bounded Context.** El contexto es la frontera lingüística, como la frontera de un país [Destilado cap. 2; IDDD cap. 1].
* Cada contexto con el que te integras tiene su propio lenguaje, aunque haya términos que se solapen [IDDD cap. 1].
* Intentar un único lenguaje para toda la empresa no funciona [IDDD cap. 1].
* Rechaza los conceptos que no pertenezcan al lenguaje acordado del contexto [IDDD cap. 1].

El ejemplo canónico: "póliza" en una aseguradora significa cosas distintas en suscripción, inspecciones y reclamaciones. No es un fallo de comunicación, es la naturaleza del negocio [Destilado cap. 2]. Cuando encuentres un término así, no busques la definición "correcta": busca los contextos.

## Cómo capturarlo

Formas que propone Vernon [IDDD cap. 1]:
* Dibujos informales del dominio físico y conceptual, etiquetados con nombres y acciones. Sin ceremonia UML.
* Un glosario con definiciones sencillas que incluya los términos alternativos, tanto los prometedores como los descartados, y por qué.
* Si no hay glosario, al menos documentación informal con dibujos de los conceptos importantes.
* Revisión con el resto del equipo de lo que haya escrito una sola persona, con disposición a editar mucho.

Y una advertencia [IDDD cap. 1; Destilado cap. 2]: todo eso es el origen del lenguaje, no el modelo. Lo duradero son las conversaciones del equipo y el código. Prepárate para abandonar documentos que cueste mantener al día.

Usa `ddd-skills/ddd-descubrimiento-dominio/assets/plantilla-glosario.md` para el formato.

## Más allá de los sustantivos

Los desarrolladores tienden a quedarse con los nombres. El lenguaje también son verbos, condiciones, restricciones y consecuencias [Destilado cap. 2]. En código, eso significa que los comportamientos deben llevar nombres del lenguaje.

La comparación de IDDD es clara [IDDD cap. 1]. Este modelo es de datos, no de dominio:

```ts
backlogItem.setSprintId(sprintId);
backlogItem.setStatus(BacklogItemStatus.Committed);
```

Este expresa el lenguaje y protege la regla:

```ts
backlogItem.commitTo(sprint);
```

Con el segundo, el cliente no necesita saber qué atributos tocar, la regla ("solo si está planificado para una entrega") vive en un sitio y el evento de dominio se publica sin que el cliente lo recuerde. Con el primero, cualquier cliente puede dejar el objeto a medias.

**Regla práctica:** si un término del glosario es un verbo del negocio, debería existir un método con ese nombre en algún agregado o servicio de dominio. Si no existe, o el modelo está anémico o el término no es del contexto.

## Preguntas para desafiar el lenguaje

Preguntas basadas en el ejemplo de refinamiento de escenarios de Vernon [Destilado cap. 2]:
* **¿Quién?** ¿Quién ejecuta esta acción en el modelo? Puede revelar conceptos nuevos (en el libro aparece "consenso del equipo").
* **¿Bajo qué condiciones?** ¿Qué tiene que ser cierto antes? Son invariantes o precondiciones.
* **¿Quién se entera?** "Notificar a los interesados" casi siempre esconde un evento de dominio y a veces consistencia eventual.
* **¿Tiene que pasar todo a la vez?** Si dos cosas no necesitan saberse en el mismo instante, es candidata a consistencia eventual (se decide en `ddd-skills/ddd-agregados/GUIA.md`).

## Idioma de los identificadores en código

Los libros no tratan este punto porque están escritos en inglés para equipos en inglés `[Fuera de los libros]`. En equipos hispanohablantes hay que decidirlo de forma explícita y por contexto:

| Opción | Ventaja | Coste |
|---|---|---|
| Código en el idioma del negocio (`Pedido.confirmar()`) | El lenguaje ubicuo es literal; el experto puede leer los tests | Mezcla con el inglés de frameworks y librerías; nombres sin tildes |
| Código en inglés con tabla de traducción (`Order.confirm()`) | Encaja con el ecosistema; facilita equipos internacionales | La traducción es un punto de fallo: dos personas traducen distinto |

Recomendación: cualquiera de las dos vale, lo que falla es no decidir. Si eliges inglés, la tabla de traducción es obligatoria y forma parte del glosario; cada término de negocio tiene **un único** identificador. Nunca mezcles idiomas para un mismo concepto (`PedidoLine`).

## Señales de que el lenguaje se está rompiendo

* Un término con dos definiciones en el mismo contexto.
* Sinónimos usados indistintamente (`cliente`, `comprador`, `usuario`) sin que nadie sepa si son lo mismo.
* Términos técnicos ocupando el sitio de conceptos de negocio (`Manager`, `Processor`, `Data`, `Info`).
* El equipo usa unas palabras al hablar y el código otras.
* Los expertos no reconocen los nombres de los tests.
