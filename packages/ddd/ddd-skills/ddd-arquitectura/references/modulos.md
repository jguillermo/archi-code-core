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

## En TypeScript

`[Fuera de los libros]`
* Un módulo es una carpeta con un `index.ts` que exporta solo su API pública. Lo demás no se importa desde fuera del módulo.
* Un agregado y todo lo que solo él usa viven en el mismo módulo: `Order`, `OrderId`, `OrderLine` (un `Composite`), `OrderStatus`, sus eventos (`OrderPlaced`, `OrderLineAdded`) y sus excepciones de negocio (`OrderNoLongerEditable extends DomainException`).
* Las clases base (`AggregateRoot`, `EventBase`, `Composite`, los tipos de value object) y los roles de repositorio (`AggregateFinder`, `AggregateSaver`, `AggregateRemover`) no forman un módulo del proyecto: se importan de `@archi-code/ddd/domain` donde se usan. `[Fuera de los libros: convención de @archi-code/ddd]`
* En `application/`, un módulo por acción de negocio (`place-order/`, `add-order-line/`); el listener vive en el módulo del caso de uso que ejecuta (`prepare-shipment/PrepareShipmentOnOrderLineAdded.ts`), nunca en una carpeta `listeners/`.
* Si dos módulos se importan mutuamente, el modelo está enredado: revisa los conceptos antes de mover ficheros.

Ejemplo bueno y malo:

```
domain/                      domain/
  order/                       entities/
    Order.ts                     Order.ts
    OrderLine.ts                 Invoice.ts
    events.ts                  valueobjects/
  invoicing/                     Money.ts
    Invoice.ts                   OrderLine.ts
  shared/                      events/
    Money.ts                     OrderPlaced.ts
                               shared/
                                 AggregateRoot.ts
(cuenta la historia)         (cuenta los patrones usados y
                              reescribe lo que da el paquete)
```
