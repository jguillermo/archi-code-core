# Capa de aplicación: el caso de uso según los libros

El código (clase de usuario y de reacción, `Input`/`Command`, `toCommand`, orden de `handle`, reintento, errores y tests) está en `ddd-skills/archi-code-ddd/use-cases.md` y `ddd-skills/archi-code-ddd/reactions.md`, apartados Rules y Code; el controlador y el ayudante de protocolo, en `ddd-skills/archi-code-ddd/composition-and-entry-points.md`. Aquí queda el porqué.

## Caso de uso de usuario

Forma de IDDD: recibe parámetros, carga el agregado por su repositorio y le da una orden; es fino y cliente directo del modelo [IDDD cap. 4 y cap. 14; PHP: Application]. Ninguna regla de negocio en él: en `CancelOrder`, quién puede cancelar y en qué estado lo decide `order.cancel`; el caso de uso solo carga, llama, guarda y publica.

## Caso de uso por reacción

`[Fuera de los libros: convención de @archi-code/ddd]`: los libros ponen un suscriptor que llama a un servicio de aplicación [IDDD cap. 8]; aquí la reacción es el caso de uso. Registra un hecho de otro contexto, que no se rechaza [Destilado cap. 6]: con entrega al menos una vez, si el agregado ya existe al crear o falta al cambiar, vuelve sin error, y su método no cambia nada si el hecho ya está aplicado. Nunca autoriza ni lanza errores de negocio: el canal la reentregaría sin fin. Código: `ddd-skills/archi-code-ddd/reactions.md`, apartado Code ("Reaction use case").

## Entrada

* El comando es una entrada plana y serializable [PHP: Application]; el paquete la separa en `Input` de primitivos y `Command` de value objects `[Fuera de los libros: convención de @archi-code/ddd]`.
* Un fallo de conversión informa de todos los campos a la vez y el caso de uso no llega a ejecutarse.
* El adaptador de entrada solo comprueba la forma; nunca pasa un agregado.

## Salida

Id o nada (comandos, lo normal), DTO si el cliente necesita el resultado ya, transformador si hay varios formatos de cliente, o método sin retorno y puerto de salida en hexagonal estricto [IDDD cap. 14]; nunca el agregado. Para pantallas, read model leído por el punto de entrada sin caso de uso (`ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`).

## Sin bus de comandos

*DDD in PHP* usa un command bus [PHP: Application]; el paquete no `[Fuera de los libros: convención de @archi-code/ddd]`: el composition root construye cada caso de uso y el punto de entrada lo llama. Las reacciones se suscriben al bus de eventos [IDDD cap. 4]. Outbox, si un evento no puede perderse, en el repositorio (`ddd-skills/ddd-eventos-dominio/GUIA.md`).

## Concurrencia

Reintento con límite recargando el agregado, solo si el comando es seguro de repetir [IDDD cap. 10; IDDD apéndice A]; nunca con el agregado ya cargado, nunca para un cambio relativo ni llamando a otro caso de uso. Si no, el conflicto llega al cliente. Una reacción no reintenta: reentrega el canal. Ejemplo en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.

## Errores

* Cada capa lanza los suyos: los errores de negocio, el dominio (agregados, value objects y servicios de dominio); "no existe" y "no autorizado", el caso de uso; el punto de entrada los traduce al protocolo sin capturarlos uno a uno `[Fuera de los libros: convención de @archi-code/ddd]`.
* No capturar para relanzar.
* Clasificación y estados: `ddd-skills/archi-code-ddd/composition-and-entry-points.md`, apartado Rules (ayudante de protocolo); el ayudante, también en `ddd-skills/ddd-arquitectura/references/estructura-hexagonal-ts.md`.

## Tests

El test del caso de uso prueba la orquestación con adaptadores en memoria (repositorio y canal de eventos) y comprueba los eventos enviados y los rechazos [IDDD cap. 12; PHP: Application]; las reglas de `cancel` se prueban en `Order`, no con mocks de todo a través del caso de uso. Código: `ddd-skills/archi-code-ddd/tests.md`; repositorio en memoria en `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`.
