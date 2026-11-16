# Implementar agregados en TypeScript

Código (raíz, entidades hijas, `create`, `fromPrimitives`/`toPrimitives`, orden de los miembros, hora): `ddd-skills/archi-code-ddd/aggregates.md`, apartados Rules y Code. Eventos y errores de negocio: `ddd-skills/archi-code-ddd/events-and-errors.md`. Aquí queda el diseño.

## La base

`AggregateRoot<Id>` de `@archi-code/ddd/domain` da lo que IDDD cap. 10 pide a la raíz (identidad, igualdad por id, eventos registrados) salvo la versión, que recuerda el repositorio `[Fuera de los libros: convención de @archi-code/ddd]`. Los eventos se guardan tal cual: los hechos no cambian [IDDD cap. 8].

IDDD publica desde el agregado con un publicador estático [IDDD cap. 8]; registrar y publicar desde la aplicación evita un singleton en el dominio y, con outbox, entregar cambios no guardados [PHP: Domain Events]. Aquí el caso de uso guarda y luego publica; si un evento no puede perderse, el repositorio escribe agregado y eventos en la misma escritura `[Fuera de los libros: convención de @archi-code/ddd]` (`ddd-skills/archi-code-ddd/repositories.md`).

Orden de construcción [Destilado cap. 5]: raíz → identidad global como value object (en multi-tenant, también el `TenantId`) → atributos para encontrarlo → getters solo si hacen falta, sin setters → comportamiento con nombres del lenguaje. El orden de los miembros de la clase es el de `ddd-skills/archi-code-ddd/aggregates.md` `[Fuera de los libros: convención de @archi-code/ddd]`.

## Order

Diseño del pedido de Ventas; la forma de cada clase es la de `ddd-skills/archi-code-ddd/aggregates.md` (apartado Code) y la de sus value objects, la de `ddd-skills/archi-code-ddd/value-objects.md`.

Estado, todo en value objects:

| Campo | Qué es |
|---|---|
| `id`, `customerId` | `OrderId`; el cliente, otro agregado, solo por identidad (`CustomerId`) |
| `lines` | `OrderLines`, lista de `OrderLine` como **valores**: se reemplazan enteras y nadie las busca por número [IDDD cap. 10] |
| `shippingAddress` | `ShippingAddress` (`Composite` de `Street`, `City`, `Country`) |
| `status` | `OrderStatusType`: pendiente, confirmado, cancelado |
| `stockReservation` | `ReservationReference`, referencia opcional a la reserva de Almacén (`null` sin reserva); otro contexto se referencia con un tipo propio `[Fuera de los libros: convención de @archi-code/ddd]` |
| `paymentAuthorization` | `PaymentAuthorization` o `null`: valor mínimo de Pagos (`paymentId`, `amount: Money`, `expiresAt`) que sabe si cubre un total (`covers(total)`) |
| `createdAt`, `updatedAt` | fechas de creación y cambio |

`Money`, `Quantity`, `OrderLine`, `OrderLines` y `OrderStatusType` tienen su diseño en `ddd-skills/ddd-value-objects-entidades/references/value-objects-ts.md` y su código en `ddd-skills/archi-code-ddd/value-objects.md`.

Comportamiento:

| Método | Lo pide | Qué hace |
|---|---|---|
| `Order.create(id, customerId, lines, shippingAddress)` | el comprador | pendiente, sin reserva ni autorización; registra `OrderCreatedDomainEvent` (`'order.created'`) con líneas y total |
| `addLine(line)` | el comprador | solo en pendiente (si no, `OrderNotModifiable`, `SAL001`); registra `OrderLineAddedDomainEvent` (`'order.line_added'`) con el total nuevo |
| `cancel(requester, reason)` | el comprador | solo el cliente del pedido (si no, `NotTheCustomerOfOrder`, `SAL021`); no si ya está cancelado (`OrderNotCancellable`, `SAL002`); registra `OrderCancelledDomainEvent` (`'order.cancelled'`) con el motivo, la reserva y el pago, para que Almacén libere y Pagos anule sin preguntar |
| `registerStockReservation(reservation)` | un hecho de Almacén | solo en pendiente, si no vuelve sin cambios; guarda la reserva e intenta confirmar |
| `registerPaymentAuthorization(authorization)` | un hecho de Pagos | solo en pendiente; si no cubre el total, registra `OrderPaymentAuthorizationRejectedDomainEvent` (`'order.payment_authorization_rejected'`) y vuelve; si cubre, la guarda e intenta confirmar |
| confirmar (privado) | nadie | con reserva y autorización suficiente pasa a confirmado y registra `OrderConfirmedDomainEvent` (`'order.confirmed'`); no hay comando `confirm` |

* Protege: total = suma de líneas, confirmado solo con reserva y autorización suficiente, líneas solo en pendiente. No contiene el stock ni la pasarela: llegan por identidad o como valor mínimo.
* "Solo el comprador cancela" depende del estado del pedido, así que es `cancel(requester, reason)` en el agregado, no un servicio ni autorización del caso de uso.
* El id lo pasa el caso de uso; el agregado nunca lo genera ni lo calcula `[Fuera de los libros: convención de @archi-code/ddd]`.

### Comandos frente a hechos

Un comando se puede rechazar; un hecho no [Destilado cap. 6]. Si un método de reacción lanzara, el mensaje se reintentaría sin fin [IDDD cap. 10]. Por eso:
* `register…` son idempotentes, no lanzan errores de negocio y vuelven sin cambios si no aplican.
* Si el hecho no encaja, registran un evento de negocio (`OrderPaymentAuthorizationRejectedDomainEvent`) y otra reacción compensa.
* Los errores de negocio quedan para lo que pide un usuario (`cancel`, `addLine`); cómo llegan al protocolo, en `ddd-skills/archi-code-ddd/composition-and-entry-points.md`.

## Dependencias de otros agregados

Busca antes y pasa valores; el repositorio dentro del agregado es la opción menos recomendada [IDDD cap. 10]. La autorización llega de Pagos como hecho: Ventas declara su copia de `PaymentAuthorizedDomainEvent` (`'payment.authorized'`: `paymentId`, `orderId`, `amount`, `expiresAt`) junto a la reacción `RegisterPaymentAuthorizationOnPaymentAuthorized` (`consumer: 'sales.register-payment-authorization-on-payment-authorized'`), que construye `OrderId` y `PaymentAuthorization`, vuelve si falta el pedido, llama a `registerPaymentAuthorization`, guarda y publica `[Fuera de los libros: convención de @archi-code/ddd]`. Código de la copia y de la reacción: `ddd-skills/archi-code-ddd/reactions.md`, apartado Code.

## Concurrencia optimista

* Versión incrementada con cada comando que cambie el agregado [IDDD cap. 10]. Aquí la lleva el repositorio, no el agregado: escribe solo si la versión coincide y, si no, lanza `ConcurrencyException` `[Fuera de los libros: convención de @archi-code/ddd]`. Código: `ddd-skills/archi-code-ddd/repositories.md`, apartado Rules ("Every repository checks the version"). La versión recordada se actualiza solo tras escribir con éxito (en SQL, tras `COMMIT`), y el nombre del agregado en la excepción es literal porque los minificadores renombran clases.
* Partes internas como entidades que el ORM no detecta: otra razón para raíz + valores [IDDD cap. 10]. En documentos, versión comprobada en una sola operación [IDDD cap. 10].

Reintentar solo si el comando es idempotente o se reevalúa sobre el estado recargado; una reacción no reintenta, lo hace el canal `[Fuera de los libros: convención de @archi-code/ddd]`. Reglas y código: `ddd-skills/archi-code-ddd/use-cases.md` ("Concurrency"); ejemplo en `ddd-skills/ddd-repositorios-persistencia/references/transacciones-ts.md`.

## Variante funcional

`[Fuera de los libros como código; la idea está en Destilado cap. 5]` El paquete no la da; con los mismos value objects y eventos, funciones `(estado, …) => [estado, EventBase[]]`, con un estado, un límite de consistencia y eventos como salida; su persistencia es del proyecto (`AggregateRoot` y `PrimitiveTypes` necesitan clases).

## Tests

Unitarios después de los de aceptación [Destilado cap. 5]. Forma de los tests, fábricas en `test/support/`, fechas y test de ida y vuelta (obligatorio en cada agregado): `ddd-skills/archi-code-ddd/tests.md` `[Fuera de los libros: convención de @archi-code/ddd]`.

Casos de `Order` que el diseño exige: autorización insuficiente sin lanzar ni confirmar, confirmación en cualquier orden (reserva antes o después del pago), mensaje duplicado sin eventos, `OrderNotModifiable` tras confirmar, cancelación por otro cliente rechazada.
