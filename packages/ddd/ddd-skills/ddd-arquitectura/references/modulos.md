# Módulos

## Qué son

En DDD, un módulo es un contenedor con nombre para clases del dominio muy cohesionadas entre sí, buscando bajo acoplamiento con las de otros módulos. No es un cajón genérico: su nombre forma parte del lenguaje ubicuo [IDDD cap. 9]. Deben contar la historia del sistema y reflejar conocimiento del dominio [IDDD cap. 9, citando a Evans].

## Reglas

* Nombres del lenguaje ubicuo [IDDD cap. 9; PHP: Modules].
* Nunca nombres de patrones o piezas (`valueobjects`, `services`, `entities`) [PHP: Modules].
* Lo de dentro, lo menos acoplado posible con otros módulos [PHP: Modules].
* Refactoriza módulos como el código: muévelos, renómbralos, agrúpalos [IDDD cap. 9; PHP: Modules].
* Nada de nombres comerciales de producto: cambian. Usa el nombre del contexto [IDDD cap. 9; PHP: Modules].
* El segundo nivel identifica el Bounded Context, luego la zona (`domain`, `application`...), luego los módulos del modelo [IDDD cap. 9].
* En aplicación e interfaz, submódulos solo si hay suficientes servicios o recursos para que ayude (IDDD sugiere pensarlo a partir de media docena) [IDDD cap. 9].

## Módulo antes que Bounded Context

Si la terminología es difusa y no está claro que haga falta una frontera de contexto, mantén los conceptos juntos y sepáralos con un módulo, que es una frontera más fina. Los contextos no sustituyen a los módulos; los módulos separan lo poco cohesionado dentro de un mismo lenguaje [IDDD cap. 9].

Y en sentido contrario: un módulo no arregla un lenguaje mezclado. Si un término significa dos cosas, hace falta otro contexto [IDDD cap. 2].

## En TypeScript con @archi-code/ddd

`[Fuera de los libros: convención de @archi-code/ddd]` Los libros piden módulos con nombres del lenguaje ubicuo y desaconsejan agruparlos por tipo de patrón [IDDD cap. 9; PHP: Modules]. El paquete se aparta en `domain/`: cada contexto agrupa sus clases por tipo, y el lenguaje ubicuo vive en el nombre del contexto, en el de cada clase y en las carpetas de `application/`, una por acción de negocio.

* `domain/` de cada contexto: `aggregate/` (raíces y las formas `New<Child>` que recibe `create`), `entity/` (entidades hijas), `value-object/`, `event/` (un fichero por evento, sin unión de eventos), `exception/` (errores de negocio), `repository/` (el repositorio abstracto de cada agregado, `OrderRepository.ts`), `service/` (servicios y puertos de dominio) y `specification/`. Una clase por fichero, con el nombre de la clase en PascalCase (`OrderNotModifiable.ts`).
* `application/`: un módulo por acción de negocio en kebab-case (`place-order/`, `mark-order-paid/`), con su caso de uso, sus tipos de datos y, en un caso de uso por reacción, la copia del evento ajeno que escucha (`mark-order-paid/mark-order-paid-on-payment-captured.ts` + `payment-captured-domain-event.ts`); nunca carpetas `listeners/`, `use-cases/`, `commands/` ni `dtos/`. Un read model es un módulo con su fila, sus puertos, su proyección y una subcarpeta por reacción (`order-summaries/`).
* `infrastructure/` por área técnica (`persistence/`, `messaging/`, `read-model/`, el nombre del puerto que implementa: `coupon/`) e `interfaces/` por protocolo (`http/`).
* Las clases base (`AggregateRoot`, `EventBase`, `Composite`, los tipos de value object, `AggregateRepository`) y los roles de repositorio (`AggregateFinder`, `AggregateSaver`, `AggregateRemover`, que implementa cada repositorio abstracto) no forman un módulo del proyecto: se importan de `@archi-code/ddd/domain` donde se usan.
* Los imports apuntan al fichero que declara cada símbolo, nunca a una carpeta ni a un `index.ts`. Un contexto nunca importa otro; solo `shared-kernel/` se comparte.
* Si dos agregados de un contexto se importan mutuamente, el modelo está enredado: revisa los conceptos antes de mover ficheros.

Ejemplo bueno y malo:

```
contexts/sales/domain/           domain/
  aggregate/                       shared/
    Order.ts                         AggregateRoot.ts
    NewOrderLine.ts                  ValueObject.ts
  entity/                          models/
    OrderLine.ts                     Order.ts        (con OrderId, OrderLine
  value-object/                                       y los eventos dentro)
    OrderId.ts                     utils/
    Sku.ts                           money.ts        (compartido con otros contextos)
  event/
    OrderPaidDomainEvent.ts
  exception/
    OrderNotCancellable.ts
  repository/
    OrderRepository.ts           (abstracta)
(una clase por fichero, del         (reescribe lo que da el paquete y
 paquete, en su contexto)            mezcla contextos)
```
