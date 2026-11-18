# Módulos

## Reglas de los libros

* Un módulo agrupa clases muy cohesionadas, con nombre del lenguaje ubicuo [IDDD cap. 9; PHP: Modules].
* Nunca nombres de patrones (`valueobjects`, `services`) [PHP: Modules].
* Bajo acoplamiento entre módulos; se refactorizan como el código [IDDD cap. 9; PHP: Modules].
* Sin nombres comerciales de producto [IDDD cap. 9; PHP: Modules].
* Contexto → zona (`domain`, `application`…) → módulos [IDDD cap. 9].
* Submódulos en aplicación e interfaz solo si hay bastantes servicios (unos seis) [IDDD cap. 9].
* Ante terminología difusa, módulo antes que contexto nuevo [IDDD cap. 9]; pero un término con dos significados pide otro contexto [IDDD cap. 2].

## Con @archi-code/ddd

`[Fuera de los libros: convención de @archi-code/ddd]` El paquete agrupa `domain/` por agregado y, dentro de cada agregado, por tipo (`domain/<agregado>/<tipo>/`), con una única excepción: `domain/shared/<tipo>/`, carpeta reservada para los tipos que usa más de un agregado del contexto; el lenguaje vive en el contexto, las clases y las carpetas de `application/`.

* `domain/<agregado>/` y `domain/shared/`: `aggregate/` (raíces y `New<Child>`), `entity/`, `value-object/`, `event/`, `exception/`, `repository/`, `service/`, `specification/`; `event/` un fichero por evento, sin unión de eventos; `service/` servicios de dominio, solo clases concretas (no existen puertos de dominio); una clase por fichero, PascalCase.
* `application/`: una carpeta por acción (`place-order/`, `mark-order-paid/`) con su caso de uso, sus tipos y la copia del evento ajeno de una reacción; nunca `listeners/`, `use-cases/`, `commands/`, `dtos/`. Un read model es una carpeta con fila, puertos, proyección y reacciones.
* `infrastructure/` por área técnica (`persistence/`, `messaging/`, `read-model/`, `coupon/`) e `interfaces/` por protocolo (`http/`).
* Clases base y roles de repositorio no son un módulo del proyecto: se importan de `@archi-code/ddd/domain` donde se usan.
* Imports al fichero que declara cada símbolo, nunca a carpeta ni `index.ts`. Un contexto nunca importa otro; solo `shared-kernel/`.
* Un tipo que usan dos agregados va en `domain/shared/<tipo>/` y ambos lo importan de ahí; de la carpeta de otro agregado solo se importan su raíz, su repositorio y su identidad (`<Agregado>Id`), que nunca van a `shared/`. Ningún agregado se llama `shared`. `domain/shared/` no es `shared-kernel/`: el primero comparte entre agregados de un contexto, el segundo entre contextos.
* Dos agregados que se importan mutuamente: modelo enredado, revisa los conceptos.
