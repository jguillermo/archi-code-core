# Escenarios concretos y especificaciones

## Qué es un escenario aquí

No es un caso de uso ni una historia de usuario. Describe cómo funciona el **modelo de dominio**: qué hacen sus componentes, con qué condiciones y con qué consecuencias. Se escribe entre expertos y desarrolladores [Destilado cap. 2].

Un buen escenario contiene, además de sustantivos, verbos, restricciones (lo que debe cumplirse antes) y consecuencias (quién se entera, qué cambia) [Destilado cap. 2].

## Cómo refinarlo

Proceso que muestra Vernon con el escenario de comprometer un elemento del backlog en un sprint [Destilado cap. 2]:

1. Escribe una primera versión, aunque sea imperfecta.
2. Pregunta **quién** ejecuta la acción. Pon nombre propio a personas o cosas solo si eso hace el escenario más concreto; si todos los casos se comportan igual, no hace falta.
3. Pregunta qué tiene que ser **cierto antes**. En el ejemplo del libro aparece un concepto nuevo, el consenso del equipo, que no estaba en la primera versión.
4. Pregunta **quién se entera** y si tiene que enterarse a la vez. En el libro, la respuesta apunta a consistencia eventual entre elemento del backlog y sprint.
5. Reescribe el escenario completo con lo aprendido.

Cada vuelta suele añadir un término al glosario. Si no añade nada, probablemente no se ha desafiado lo suficiente.

## De escenario a especificación

Formato Given/When/Then (Dado/Cuando/Entonces), propio de Specification by Example y BDD [Destilado cap. 2]. Plantilla en `assets/plantilla-escenario.feature`.

```gherkin
Escenario: <acción del lenguaje ubicuo>
  Dado <estado previo con datos realistas>
  Y <otra condición>
  Cuando <comando, con quien lo ejecuta>
  Entonces <estado resultante>
  Y se registra el evento <EventoEnPasado>
```

## Dos formas de verificarlo

Vernon presenta dos y no impone ninguna [Destilado cap. 2 y cap. 7]:

| Forma | Ventaja | Coste |
|---|---|---|
| Especificación ejecutable (Cucumber y similares) | Legible por negocio sin ayuda | Según Vernon, entre un 15 % y un 25 % más de esfuerzo de uso y mantenimiento que los tests con framework unitario; fácil que el mantenimiento se coma al modelo [Destilado cap. 7] |
| Test de aceptación con framework de tests unitarios | Más rápido de escribir | Algo menos legible; se compensa dejando el escenario escrito en un comentario del test [Destilado cap. 2] |

**Recomendación por defecto:** test de aceptación con Vitest o Jest y el escenario en comentario. Cucumber solo si los expertos van a leer y mantener las especificaciones sin ayuda de un desarrollador `[Fuera de los libros: criterio de decisión propio]`.

Ojo: aunque se ejecuten con un framework de tests unitarios, son **tests de aceptación** sobre el modelo, no tests unitarios. Viven con el código del Bounded Context, en su repositorio [Destilado cap. 2].

## Ejemplo en TypeScript

```ts
import { describe, it, expect } from 'vitest';

/*
 * Escenario: se confirma un pedido con pago autorizado y stock reservado.
 * Un pedido realizado solo puede confirmarse cuando tiene el stock reservado
 * y un pago autorizado que cubre su total. Al confirmarse deja de admitir
 * cambios en sus líneas y se notifica a Almacén para preparar la expedición.
 */
describe('Confirmar pedido', () => {
  it('confirma el pedido y registra OrderConfirmed', () => {
    // Dado
    const order = anOrderPlacedBy('Laura Gómez', [line('TAZA-350', 2, '8.50')]);
    order.registerStockReservation(aReservationFor(order));

    // Cuando
    order.confirm(aPaymentAuthorizationFor(order, '17.00'));

    // Entonces
    expect(order.isConfirmed()).toBe(true);
    expect(order.pendingEvents()).toContainEqual(
      expect.objectContaining({ type: 'OrderConfirmed', orderId: order.id.value }),
    );
  });

  it('no confirma sin stock reservado', () => {
    const order = anOrderPlacedBy('Laura Gómez', [line('TAZA-350', 2, '8.50')]);

    expect(() => order.confirm(aPaymentAuthorizationFor(order, '17.00')))
      .toThrow(StockNotReservedForOrder);
  });

  it('no confirma si el importe autorizado no cubre el total', () => {
    const order = anOrderPlacedBy('Laura Gómez', [line('TAZA-350', 2, '8.50')]);
    order.registerStockReservation(aReservationFor(order));

    expect(() => order.confirm(aPaymentAuthorizationFor(order, '10.00')))
      .toThrow(PaymentDoesNotCoverOrderTotal);
  });
});
```

Detalles que importan:
* Las funciones `anOrderPlacedBy`, `line`, `aReservationFor` o `aPaymentAuthorizationFor` son constructores de datos de test con nombres del lenguaje. Mantienen el test legible para el experto.
* El test describe el uso desde el punto de vista del cliente del modelo. Las clases (`Order`, `PaymentAuthorization`) aún no tienen por qué existir: el test las va a diseñar (ver abajo). Cómo llega al pedido la noticia de la reserva, que vive en otro contexto, se decide en `ddd-agregados` y `ddd-eventos-dominio`; aquí solo se fija el comportamiento esperado.
* La excepción tiene nombre de negocio, no `Error('invalid')`.

## Diseñar desde el test

IDDD propone un ciclo test-first que encaja con DDD [IDDD cap. 1]:

1. Escribe un test que muestre cómo un cliente del modelo debería usar el nuevo objeto.
2. Crea el objeto con lo justo para que compile.
3. Refactoriza ambos hasta que el test refleje bien el uso y el objeto tenga firmas de comportamiento adecuadas.
4. Implementa cada comportamiento hasta que pase, eliminando duplicaciones.
5. Enseña el código al equipo, expertos incluidos, para comprobar que usa el lenguaje con su significado actual.

Después se añaden los tests que verifican la corrección desde todos los ángulos prácticos. Se trabaja en rojo-verde: la especificación falla primero y se refina el modelo hasta que pasa [Destilado cap. 2].

## Revisión con expertos

* Los expertos pueden leer un test de aceptación, sobre todo con datos realistas. No subestimes esa capacidad [Destilado cap. 7].
* Objetivo: que un experto entienda y verifique cada test en uno o dos minutos [Destilado cap. 7].
* Sin datos realistas el experto no puede juzgar la implementación [IDDD cap. 1]. Nada de `foo`, `test1` o importes de `100`.
