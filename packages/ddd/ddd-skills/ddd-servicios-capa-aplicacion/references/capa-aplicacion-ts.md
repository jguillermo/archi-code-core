# Capa de aplicación en TypeScript

## Plantilla de caso de uso

Un caso de uso extiende `UseCase<Input, Command, Output>` de `@archi-code/ddd/application`. `execute(input)` llama a `toCommand(input)` y después a `handle(command)`; no hay que escribir `execute`.

```ts
import { ValueObjects } from '@archi-code/ddd/domain';
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus, TransactionRunner } from '@archi-code/ddd/application';
import { AggregateNotFoundException, NotAllowedException } from '@archi-code/ddd/exceptions';

export interface SalesPermissions {
  canCancelOrders(requester: CustomerId): Promise<boolean>;
}

export interface CancelOrderInput {
  orderId: string;
  requesterId: string;
  reason: string;
}

interface CancelOrderCommand {
  orderId: OrderId;
  requester: CustomerId;
  reason: CancellationReason;
}

export class CancelOrder extends UseCase<CancelOrderInput, CancelOrderCommand, void> {
  private readonly cancellation = new OrderCancellation();

  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus<OrderEvent>,
    private readonly transactions: TransactionRunner,
    private readonly permissions: SalesPermissions,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: CancelOrderInput): CancelOrderCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      requester: () => new CustomerId(input.requesterId),
      reason: () => new CancellationReason(input.reason),
    });
  }

  protected handle(command: CancelOrderCommand): Promise<void> {
    return this.transactions.run(async () => {
      if (!(await this.permissions.canCancelOrders(command.requester))) {
        throw new NotAllowedException(`Customer ${command.requester.value} may not cancel orders`);
      }
      const order = await this.orders.findById(command.orderId);
      if (order === null) {
        throw new AggregateNotFoundException('Order', command.orderId.value);
      }
      this.cancellation.cancel(order, command.requester, command.reason, this.clock);
      await this.orders.save(order);
      await this.events.publish(order.pullDomainEvents());
    });
  }
}
```

Autorizar, cargar, invocar el dominio, guardar y publicar, y ninguna regla de negocio: que solo el cliente del pedido pueda cancelarlo lo comprueba el servicio de dominio `OrderCancellation`, y que no esté ya cancelado, `order.cancel`. Coincide con la forma de IDDD: parámetros, repositorio, comando sobre el agregado [IDDD cap. 4] y con la anatomía de *DDD in PHP* [PHP: Application].

* El caso de uso pide solo los roles de repositorio que usa (`AggregateFinder<Order> & AggregateSaver<Order>`), los puertos `EventBus`, `TransactionRunner` y `Clock` del paquete, y los puertos de aplicación propios (`SalesPermissions`).
* `UseCase` no trae ayudas (`findOrFail`, `saveAndPublish`): todos los pasos se escriben en `handle` `[Fuera de los libros: convención de @archi-code/ddd]`.
* Se guarda antes de publicar, y se publica lo que devuelve `pullDomainEvents()`, dentro de `transactions.run`.

## Entrada

* Primitivos o DTO o comando [PHP: Application, citando a Vernon]. Con el paquete, dos tipos por caso de uso `[Fuera de los libros: convención de @archi-code/ddd]`: el `Input`, plano y de primitivos (se puede serializar y encolar si un día hace falta [PHP: Application]), y el `Command`, de value objects, que construye `toCommand`.
* La conversión a value objects ocurre en `toCommand` con `ValueObjects.build`: si algún campo no es válido lanza una sola `ValidationException` con el `field` y el `code` de cada problema (`ValueObjects.buildList` nombra los elementos de una lista por posición, `lines.1.quantity`), y `handle` no llega a ejecutarse.
* El adaptador de entrada solo comprueba la forma de la petición (que un campo sea texto); las reglas de cada valor son de los value objects.
* Nunca recibas el agregado desde el controlador.

## Salida

IDDD presenta varias opciones [IDDD cap. 14]:

| Opción | Cuándo |
|---|---|
| Devolver un identificador o nada | Comandos (lo normal) |
| DTO construido desde el agregado | El cliente necesita el resultado inmediato |
| Transformador de datos que elige el cliente | Varios clientes con formatos distintos |
| Método sin retorno y puerto de salida | Estilo hexagonal estricto |

Con el paquete, la salida es el tercer parámetro de tipo: `UseCase<PlaceOrderInput, PlaceOrderCommand, string>` devuelve el id (`order.id.value`), `void` nada. Nunca el agregado.

Para pantallas, mejor una consulta de lectura aparte que devuelve un DTO sin pasar por el agregado: una interfaz de aplicación implementada en infraestructura directamente sobre la base de datos (ver `ddd-skills/ddd-repositorios-persistencia/GUIA.md` y `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`).

## Command bus

*DDD in PHP* presenta el bus de comandos (Tactician) para enlazar cada comando con su manejador; los objetos request se parecen ya a comandos [PHP: Application]. El paquete no trae bus de comandos `[Fuera de los libros: convención de @archi-code/ddd]`: el composition root construye cada caso de uso y se lo pasa al punto de entrada, que llama a `execute(input)`. Lo común a todos los casos de uso ya está en `UseCase.execute` (dejar pasar las excepciones del paquete y envolver cualquier otro error en `InternalErrorException` con `cause`), y la transacción es explícita en cada `handle`.

## Eventos en la capa de aplicación

* La aplicación puede registrar suscriptores para guardar y reenviar eventos, dejando el dominio libre de mensajería [IDDD cap. 4]. Con el paquete, los suscriptores son listeners (`EventListener` con `@ListensTo`) que el composition root conecta con `bus.subscribe(listener)`; cada uno ejecuta un solo caso de uso.
* Con outbox, los eventos se guardan en la transacción y la publicación ocurre fuera (`ddd-skills/ddd-eventos-dominio/GUIA.md`). Con el paquete, siempre el caso de uso: `events.publish(order.pullDomainEvents())` dentro de `transactions.run`; el outbox es un `EventChannel` duradero (escribe en la transacción del runner y reparte tras el commit) que se pasa a `DomainEventBus`, sin cambiar los casos de uso `[Fuera de los libros: convención de @archi-code/ddd]`.

## Conflictos de concurrencia

Cada repositorio comprueba la versión del agregado y lanza `ConcurrencyException` (409) si otro lo cambió después de cargarlo. Si el comando es seguro de repetir sobre el nuevo estado, el caso de uso puede reintentarlo [IDDD cap. 10; IDDD apéndice A]: un bucle en `handle` alrededor de todo `transactions.run`, de modo que cada intento es una transacción nueva que vuelve a cargar el agregado; pocos intentos y después se relanza. Si el caso de uso corre dentro de otra transacción (`inTransaction()`), su `run` se une a ella y no reintenta: reintenta quien lo llamó o la reentrega del canal.

```ts
import { ConcurrencyException, DomainException } from '@archi-code/ddd/exceptions';

export interface ProductPricing {
  priceForSale(sku: Sku): Promise<Money | null>;
}

export class ProductNotSellable extends DomainException {
  constructor(sku: string) {
    super(`Product ${sku} is not for sale`, ['ORD003']);
  }
}

const ATTEMPTS = 3;

export class AddOrderLine extends UseCase<AddOrderLineInput, AddOrderLineCommand, void> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly pricing: ProductPricing,
    private readonly events: EventBus<OrderEvent>,
    private readonly transactions: TransactionRunner,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: AddOrderLineInput): AddOrderLineCommand {
    return ValueObjects.build({
      orderId: () => new OrderId(input.orderId),
      sku: () => new Sku(input.sku),
      quantity: () => new Quantity(input.quantity),
    });
  }

  protected async handle({ orderId, sku, quantity }: AddOrderLineCommand): Promise<void> {
    const unitPrice = await this.pricing.priceForSale(sku);
    if (unitPrice === null) {
      throw new ProductNotSellable(sku.value);
    }
    const line = new OrderLine({ sku, quantity, unitPrice });
    const attempts = this.transactions.inTransaction() ? 1 : ATTEMPTS;
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.transactions.run(async () => {
          const order = await this.orders.findById(orderId);
          if (order === null) {
            throw new AggregateNotFoundException('Order', orderId.value);
          }
          order.addLine(line, this.clock);
          await this.orders.save(order);
          await this.events.publish(order.pullDomainEvents());
        });
      } catch (error) {
        if (!(error instanceof ConcurrencyException) || attempt === attempts) {
          throw error;
        }
      }
    }
  }
}
```

`ProductPricing` es un puerto de dominio (la interfaz en `domain/` con value objects, implementada en infraestructura por la capa anticorrupción) y `ProductNotSellable` una regla de dominio. `AddOrderLineInput` (`orderId`, `sku`, `quantity` como primitivos) y `AddOrderLineCommand` (`OrderId`, `Sku`, `Quantity`) siguen el patrón de `CancelOrder`. Nunca se reintenta con el agregado ya cargado ni dentro de la transacción que falló, y un caso de uso nunca se llama a sí mismo ni a otro para reintentar.

## Errores

* El dominio lanza `DomainException` con nombre y código propio (`class OrderCannotBeCancelled extends DomainException`, `super(message, ['ORD002'])`); los value objects y `ValueObjects.build` lanzan `ValidationException`.
* La aplicación añade las suyas: `AggregateNotFoundException('Order', id)` cuando `findById` devuelve `null`, `NotAllowedException(message)` cuando el solicitante no puede ejecutar la acción, `ApplicationException` para otros errores de aplicación. Al traducir otro error, siempre con `{ cause: error }`.
* Los errores se dejan propagar: no se capturan en `handle` para relanzarlos; `execute` deja pasar las excepciones del paquete y envuelve el resto en `InternalErrorException`.
* El punto de entrada los traduce con `HttpErrorMapper` de `@archi-code/ddd/infrastructure`: 404 `AggregateNotFoundException`, 403 `NotAllowedException`, 409 `ConcurrencyException`, 422 `ValidationException` y cualquier otra `DomainException` (regla de negocio), 400 otros errores de aplicación y 500, con mensaje genérico, para lo demás. Los códigos propios se ajustan por código (`new HttpErrorMapper({ ORD001: 409 })`) `[Fuera de los libros: convención de @archi-code/ddd]`.

```ts
import type { HttpErrorMapper } from '@archi-code/ddd/infrastructure';

interface HttpRequest {
  params: { orderId: string };
  auth: { customerId: string };
  body: { reason?: unknown };
}

interface HttpResponse {
  status: number;
  body?: unknown;
}

export class CancelOrderController {
  constructor(
    private readonly cancelOrder: CancelOrder,
    private readonly errors: HttpErrorMapper,
  ) {}

  async cancel(request: HttpRequest): Promise<HttpResponse> {
    try {
      await this.cancelOrder.execute({
        orderId: request.params.orderId,
        requesterId: request.auth.customerId,
        reason: typeof request.body.reason === 'string' ? request.body.reason : '',
      });
      return { status: 204 };
    } catch (error) {
      return this.errors.map(error);
    }
  }
}
```

La identidad del solicitante sale del token (`request.auth`), nunca del cuerpo.

## Tests

Con los adaptadores en memoria del paquete: `InMemoryRepository(AggregateMapper.of(Order))`, `InMemoryTransactionRunner([orders])` (deshace los cambios del repositorio si el trabajo lanza; `committed` y `rolledBack` cuentan los resultados) y `DomainEventBus` sobre `InMemoryEventChannel` (`channel.sent` lista lo publicado). Los puertos propios se sustituyen por objetos simples.

```ts
import { describe, expect, it } from 'vitest';
import { DomainEventBus, EventRegistry } from '@archi-code/ddd/application';
import { NotAllowedException } from '@archi-code/ddd/exceptions';
import {
  AggregateMapper,
  FixedClock,
  InMemoryEventChannel,
  InMemoryRepository,
  InMemoryTransactionRunner,
} from '@archi-code/ddd/infrastructure';

const clock = new FixedClock('2026-03-01T09:30:00Z');

function salesWith(permissions: SalesPermissions) {
  const orders = new InMemoryRepository(AggregateMapper.of(Order));
  const transactions = new InMemoryTransactionRunner([orders]);
  const channel = new InMemoryEventChannel();
  const events = new DomainEventBus<OrderEvent>(channel, new EventRegistry<OrderEvent>());
  const cancelOrder = new CancelOrder(orders, events, transactions, permissions, clock);
  return { orders, transactions, channel, cancelOrder };
}

const everyoneMayCancel: SalesPermissions = { canCancelOrders: async () => true };
const nobodyMayCancel: SalesPermissions = { canCancelOrders: async () => false };

describe('Cancelling an order', () => {
  it('a customer cancels her own pending order', async () => {
    const { orders, channel, cancelOrder } = salesWith(everyoneMayCancel);
    await orders.save(aPendingOrderOf(laura));

    await cancelOrder.execute({ orderId, requesterId: laura, reason: 'Wrong size' });

    expect(channel.sent).toMatchObject([
      { eventName: 'OrderCancelled', aggregateId: orderId, reason: 'Wrong size' },
    ]);
  });

  it('a customer whose account may not cancel orders is refused', async () => {
    const { orders, transactions, channel, cancelOrder } = salesWith(nobodyMayCancel);
    await orders.save(aPendingOrderOf(laura));

    await expect(
      cancelOrder.execute({ orderId, requesterId: laura, reason: 'Wrong size' }),
    ).rejects.toThrow(NotAllowedException);
    expect(channel.sent).toEqual([]);
    expect(transactions.rolledBack).toBe(1);
  });
});
```

`aPendingOrderOf`, `laura` y `orderId` son fábricas y datos de `test/support/` del proyecto; el modelo (`Order`, `CancellationReason`, `OrderCancelled`…) es el de `ddd-skills/ddd-agregados/references/implementacion-ts.md` y `OrderCancellation` el de `ddd-skills/ddd-servicios-capa-aplicacion/references/ejemplo-ecommerce.md`. Estos tests comprueban orquestación. Que un pedido ya cancelado no se pueda cancelar otra vez se prueba en `Order`, y que otro cliente no pueda cancelarlo, en `OrderCancellation`; no aquí.
