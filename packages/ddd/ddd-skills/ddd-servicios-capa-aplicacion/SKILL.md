---
name: ddd-servicios-capa-aplicacion
description: Servicios de dominio y servicios de aplicación (casos de uso) en DDD con TypeScript. Cubre cuándo una operación merece un servicio de dominio y cuándo pertenece a una entidad o value object, cómo evitar el modelo anémico, cómo escribir casos de uso finos (cargar, invocar, guardar, publicar), comandos y DTOs de entrada, salida mediante DTOs o read models, command bus, transacciones, seguridad y autorización, manejo de errores y tests de la capa de aplicación con adaptadores en memoria. Úsalo SIEMPRE que se escriba o revise un "service", "manager", "handler", "use case" o "interactor", cuando la lógica de negocio esté en servicios en vez de en el modelo, al decidir dónde va una regla que implica varios objetos, o al conectar un controlador con el dominio, aunque no se mencione DDD.
---

# Servicios de dominio y capa de aplicación

Dos cosas con el mismo nombre ("servicio") y papeles opuestos. Confundirlas es la vía más rápida hacia un modelo anémico [IDDD cap. 7 y cap. 14].

| | Servicio de dominio | Servicio de aplicación |
|---|---|---|
| Contiene lógica de negocio | **Sí** | **No** |
| Vive en | `domain/` | `application/` |
| Nombre | Del lenguaje ubicuo | Del caso de uso |
| Estado | Sin estado [IDDD cap. 7] | Sin estado; coordina |
| Transacciones y seguridad | Nunca [IDDD cap. 7] | Sí [IDDD cap. 14] |
| Quién lo llama | Servicios de aplicación (u otros de dominio) | Adaptadores de entrada (HTTP, mensajes, CLI) |

Ninguno es un servicio SOA remoto ni tiene por qué ser pesado [IDDD cap. 7].

## Convenciones de la suite DDD

* **Trazabilidad.** Cada regla indica su origen: `[Destilado cap. N]`, `[IDDD cap. N]`, `[PHP: capítulo]`. Lo que no sale de esos libros va marcado `[Fuera de los libros]`. Respeta estas marcas al responder.
* **Idioma.** Responde en el idioma de la persona. El código de ejemplo es TypeScript.
* **Honestidad del modelo.** Si faltan datos, declara los supuestos.

## Paso 1. ¿Dónde va esta lógica?

Árbol de decisión `[Fuera de los libros: síntesis de IDDD cap. 7, cap. 10 y cap. 14]`:

1. ¿Es una regla sobre el estado de **un** agregado? → método del agregado.
2. ¿Es un cálculo o comportamiento sobre unos valores? → método del value object.
3. ¿Es un proceso de negocio relevante, una transformación de una composición a otra, o un cálculo que necesita **varios** objetos de dominio y queda forzado en cualquiera de ellos? → **servicio de dominio** [IDDD cap. 7].
4. ¿Es coordinación: cargar, decidir qué invocar, guardar, publicar, autorizar? → **servicio de aplicación** [IDDD cap. 14].
5. ¿Es formato, protocolo o traducción de otro sistema? → adaptador o ACL.

Si la "lógica" es una regla con nombre que decide si algo cumple un criterio (cliente moroso, pedido apto para envío urgente), suele ser una **Specification**, no un servicio (ver `ddd-value-objects-entidades`).

Antes de crear un servicio de dominio, asegúrate de que lo necesitas. Usarlos por defecto lleva al modelo anémico [IDDD cap. 7]. IDDD admite una "mini capa" de servicios de dominio en algunos contextos, pero avisa de que es un camino peligroso [IDDD cap. 7].

## Paso 2. Servicios de dominio

* Interfaz con el lenguaje del modelo; el nombre de la operación forma parte del lenguaje ubicuo; sin estado [IDDD cap. 7, citando a Evans].
* Reciben y devuelven objetos de dominio, no DTOs ni primitivos.
* Algunos tienen implementación técnica en infraestructura, sobre todo los de integración, con interfaz en el dominio (ver la ACL en `ddd-context-mapping`) [IDDD cap. 7].
* Pueden leer agregados por repositorio para cálculos o validaciones de composición [IDDD cap. 5 y cap. 7], pero **no modifican varios agregados** en una transacción.

Ejemplos e implementación en `references/servicios-dominio-ts.md`.

## Paso 3. Servicios de aplicación

* Clientes directos del modelo; un método por flujo de caso de uso; controlan transacciones y seguridad [IDDD cap. 14].
* **Finos.** Si crecen, la lógica de dominio se escapa y el modelo se vuelve anémico [IDDD cap. 4 y cap. 14; PHP: Application].
* Forma típica: recibir parámetros, obtener el agregado del repositorio, ejecutar un comando sobre él, guardar [IDDD cap. 4].
* Entrada con primitivos, DTOs o, mejor, objetos comando [PHP: Application, citando a Vernon]. En TypeScript, un tipo comando plano por caso de uso.
* Salida: identificador, DTO de lectura, o nada (con un puerto de salida), según lo que necesite el cliente [IDDD cap. 14].

Plantilla, variantes y errores frecuentes en `references/capa-aplicacion-ts.md`.

## Paso 4. Seguridad

* La autorización del caso de uso ("¿puede este usuario cancelar pedidos?") es responsabilidad de la aplicación [IDDD cap. 14].
* Si la regla es de negocio ("solo el cliente que hizo el pedido puede cancelarlo mientras está pendiente"), pertenece al modelo y se expresa con conceptos del contexto (`Customer`, no `User`) [IDDD cap. 2].
* La identidad del solicitante viene del token en el adaptador, nunca del cuerpo de la petición.
* La autenticación (quién es el usuario) la resuelve el adaptador de entrada con el mecanismo de seguridad del proyecto; este skill solo cubre dónde encaja la autorización en la arquitectura.

## Paso 5. Probar

* Servicios de dominio: tests unitarios con objetos de dominio reales [IDDD cap. 7].
* Servicios de aplicación: con repositorios y adaptadores **en memoria**; comprueban orquestación, no reglas de negocio [IDDD cap. 12; PHP: Application].
* Las reglas de negocio se prueban en el agregado o el value object, no a través del caso de uso.

## Señales de alarma

* `OrderService` con 40 métodos y entidades con solo getters y setters [Destilado cap. 5].
* `if` sobre el estado de una entidad dentro del servicio de aplicación.
* Servicios de dominio llamados `XxxManager`, `XxxHelper`, `XxxUtils` [Destilado cap. 5].
* Un servicio de dominio que abre transacciones o comprueba permisos de usuario.
* Un caso de uso que guarda dos agregados en la misma transacción.
* El caso de uso devuelve el agregado al controlador.
* Tests de reglas de negocio escritos contra el caso de uso con mocks de todo.

## Ejemplo

`references/ejemplo-ecommerce.md`: servicio de dominio de cálculo de gastos de envío, casos de uso `PlaceOrder` y `CancelOrder`, listener `RegisterReservationOnStockReserved` y sus tests.

## Siguiente skill

* Si las lecturas se complican o hay mucho volumen → `ddd-event-sourcing-cqrs`.
* Para revisar un proyecto existente con todo esto → `ddd-auditoria-refactorizacion`.
