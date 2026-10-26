# Implementar una capa anticorrupción en TypeScript

## Estructura

IDDD propone tres piezas [IDDD cap. 3 y cap. 13]:

1. **Interfaz de la capa en el dominio:** un servicio de dominio con nombre del lenguaje local (en IDDD, `MemberService` que proporciona `ProductOwner` y `TeamMember`).
2. **Adaptador:** cliente del sistema remoto; habla su protocolo (en IDDD, `IdentityAccessNotificationAdapter`).
3. **Traductor:** convierte el Published Language remoto en objetos del modelo local (en IDDD, `MemberTranslator`).

El dominio solo ve la interfaz. Adaptador y traductor viven en infraestructura. Así el modelo usa datos de otro contexto para expresar sus propios conceptos sin contaminarse [IDDD cap. 3].

`@archi-code/ddd` no trae ninguna de las tres piezas: se escriben en el proyecto con sus value objects, sus excepciones y sus puertos `[Fuera de los libros: convención de @archi-code/ddd]`.

```
src/contexts/sales/
  domain/
    service/ProductPricing.ts             ← puerto con lenguaje de Ventas
    value-object/SellableProduct.ts       ← lo que el puerto devuelve (y ProductName.ts, Sku.ts…)
    exception/ProductNotSellable.ts
  infrastructure/
    catalog/
      catalog-http-product-pricing.ts     ← adaptador: habla HTTP con Catálogo
      catalog-translator.ts               ← traductor: JSON de Catálogo → value objects de Ventas
      catalog-product-v2.ts               ← forma del Published Language de Catálogo que Ventas lee
      catalog-unavailable.ts, catalog-contract-violation.ts
```

Las carpetas siguen la convención del paquete: el dominio se reparte por tipo de clase (ficheros en PascalCase) y el resto en kebab-case, un fichero por clase (ver `ddd-skills/archi-code-ddd/where-each-class-goes.md`) `[Fuera de los libros: convención de @archi-code/ddd]`.

## Ejemplo: Ventas consulta precios a Catálogo

Catálogo expone un OHS con fichas completas (fotos, descripciones, variantes, tarifas por canal). Ventas solo necesita saber si una referencia se puede vender y a qué precio en el canal web.

### 1. Puerto en el dominio de Ventas

```ts
// src/contexts/sales/domain/value-object/SellableProduct.ts
import { Composite } from '@archi-code/ddd/domain';
import { Money } from '../../../shared-kernel/money/Money';
import { ProductName } from './ProductName';
import { Sku } from './Sku';

export class SellableProduct extends Composite({ sku: Sku, name: ProductName, unitPrice: Money }) {}
```

```ts
// src/contexts/sales/domain/service/ProductPricing.ts
import type { SellableProduct } from '../value-object/SellableProduct';
import type { Sku } from '../value-object/Sku';

export interface ProductPricing {
  priceForSale(sku: Sku): Promise<SellableProduct | null>;
}
```

`ProductName` es un `Required(StringType)` en su propio fichero.

Fíjate en el nombre: `ProductPricing` y `SellableProduct`, no `CatalogClient` ni `CatalogProductDto`. El dominio pregunta con su lenguaje y recibe value objects ya válidos (`SellableProduct` es un `Composite` de `Sku`, `ProductName` y `Money`); `null` significa que la referencia no se puede vender ahora en el canal web.

### 2. Forma del Published Language

```ts
// src/contexts/sales/infrastructure/catalog/catalog-product-v2.ts
export interface CatalogProductV2 {
  sku: string;
  displayName: string;
  lifecycle: 'DRAFT' | 'ACTIVE' | 'DISCONTINUED';
  channelPrices: { channel: string; amountMinor: number; currency: string }[];
}
```

Solo lo que Ventas lee; el resto de campos de Catálogo se ignora. El adaptador comprueba solo la forma; los valores los validan los value objects al construirse (`Sku`, `Money`). Si prefieres validar con JSON Schema, cualquier validador sirve en este punto `[Fuera de los libros: elección de librería]`.

### 3. Traductor

```ts
// src/contexts/sales/infrastructure/catalog/catalog-translator.ts
import { SellableProduct } from '../../domain/value-object/SellableProduct';
import type { CatalogProductV2 } from './catalog-product-v2';

export class CatalogTranslator {
  static isProductV2(body: unknown): body is CatalogProductV2 {
    const candidate = body as Partial<CatalogProductV2> | null;
    return (
      typeof candidate === 'object' &&
      candidate !== null &&
      typeof candidate.sku === 'string' &&
      typeof candidate.displayName === 'string' &&
      typeof candidate.lifecycle === 'string' &&
      Array.isArray(candidate.channelPrices)
    );
  }

  toSellableProduct(remote: CatalogProductV2): SellableProduct | null {
    if (remote.lifecycle !== 'ACTIVE') {
      return null;
    }
    const web = remote.channelPrices.find((price) => price.channel === 'WEB');
    if (web === undefined) {
      return null;
    }
    return SellableProduct.fromPrimitives({
      sku: remote.sku,
      name: remote.displayName,
      unitPrice: { amount: web.amountMinor, currency: web.currency },
    });
  }
}
```

La regla "solo se vende lo activo con precio web" es una decisión de traducción. Si se convierte en regla del negocio de Ventas con matices propios, muévela al dominio. `SellableProduct.fromPrimitives` construye cada value object y, si Catálogo envía un valor que el modelo de Ventas no acepta, lanza una `ValidationException` con todos los campos afectados.

### 4. Adaptador

```ts
// src/contexts/sales/infrastructure/catalog/catalog-unavailable.ts
import { InfrastructureException } from '@archi-code/ddd/infrastructure';

export class CatalogUnavailable extends InfrastructureException {
  constructor(sku: string, options: { cause?: unknown } = {}) {
    super(`Catalog did not answer for ${sku}`, ['CAT001'], options);
  }
}
```

```ts
// src/contexts/sales/infrastructure/catalog/catalog-contract-violation.ts
import { InfrastructureException } from '@archi-code/ddd/infrastructure';

export class CatalogContractViolation extends InfrastructureException {
  constructor(sku: string, options: { cause?: unknown } = {}) {
    super(`Catalog answered ${sku} outside its published contract`, ['CAT002'], options);
  }
}
```

```ts
// src/contexts/sales/infrastructure/catalog/catalog-http-product-pricing.ts
import type { ProductPricing } from '../../domain/service/ProductPricing';
import type { SellableProduct } from '../../domain/value-object/SellableProduct';
import type { Sku } from '../../domain/value-object/Sku';
import { CatalogContractViolation } from './catalog-contract-violation';
import { CatalogTranslator } from './catalog-translator';
import { CatalogUnavailable } from './catalog-unavailable';

export interface CatalogHttp {
  get(
    path: string,
    options: { headers: Record<string, string>; signal: AbortSignal },
  ): Promise<{ status: number; ok: boolean; json(): Promise<unknown> }>;
}

export class CatalogHttpProductPricing implements ProductPricing {
  constructor(
    private readonly http: CatalogHttp,
    private readonly translator = new CatalogTranslator(),
  ) {}

  async priceForSale(sku: Sku): Promise<SellableProduct | null> {
    let response: Awaited<ReturnType<CatalogHttp['get']>>;
    try {
      response = await this.http.get(`/products/${encodeURIComponent(sku.value)}`, {
        headers: { Accept: 'application/vnd.catalog.product.v2+json' },
        signal: AbortSignal.timeout(800),
      });
    } catch (error) {
      throw new CatalogUnavailable(sku.value, { cause: error });
    }
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new CatalogUnavailable(sku.value);
    }
    const body = await response.json();
    if (!CatalogTranslator.isProductV2(body)) {
      throw new CatalogContractViolation(sku.value);
    }
    try {
      return this.translator.toSellableProduct(body);
    } catch (error) {
      throw new CatalogContractViolation(sku.value, { cause: error });
    }
  }
}
```

Decisiones visibles:
* Timeout explícito: la red falla y hay latencia [IDDD cap. 13].
* Validación del contrato al entrar: si Catálogo rompe el esquema, el error se detecta en el borde y no dentro del modelo. Un valor inválido de Catálogo no llega al usuario como `ValidationException` de Ventas: el adaptador la envuelve en `CatalogContractViolation` con la original como `cause`.
* Errores con nombre y código propios (`InfrastructureException` con `CAT001`, `CAT002`). `ExceptionClassifier.classify(error)` clasifica cualquier error de infraestructura como `ExceptionKind.Internal` (500 en HTTP); para avisar de que Catálogo no está disponible, el punto de entrada traduce su código (`CAT001` → 503) antes de mirar el tipo (con 5xx el cuerpo lleva un mensaje genérico, nunca el del error).

### 5. Uso desde la capa de aplicación

```ts
// src/contexts/sales/application/place-order/place-order.ts
import type { AggregateSaver } from '@archi-code/ddd/domain';
import { UseCase, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import { Order } from '../../domain/aggregate/Order';
import { ProductNotSellable } from '../../domain/exception/ProductNotSellable';
import type { ProductPricing } from '../../domain/service/ProductPricing';
import { CustomerId } from '../../domain/value-object/CustomerId';
import { OrderId } from '../../domain/value-object/OrderId';
import { OrderLine } from '../../domain/value-object/OrderLine';
import { OrderLines } from '../../domain/value-object/OrderLines';
import { Quantity } from '../../domain/value-object/Quantity';
import { ShippingAddress } from '../../domain/value-object/ShippingAddress';
import { Sku } from '../../domain/value-object/Sku';
import type { AddressData } from './address-data';

export interface PlaceOrderInput {
  customerId: string;
  items: { sku: string; quantity: number }[];
  shippingAddress: AddressData;
}

export interface PlaceOrderCommand {
  customerId: CustomerId;
  items: { sku: Sku; quantity: Quantity }[];
  shippingAddress: ShippingAddress;
}

export class PlaceOrder extends UseCase<PlaceOrderInput, PlaceOrderCommand, string> {
  constructor(
    private readonly orders: AggregateSaver<Order>,
    private readonly pricing: ProductPricing,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: PlaceOrderInput): PlaceOrderCommand {
    return ValueObjectBuilder.build({
      customerId: () => new CustomerId(input.customerId),
      items: () =>
        ValueObjectBuilder.buildList(input.items, (item) =>
          ValueObjectBuilder.build({
            sku: () => new Sku(item.sku),
            quantity: () => new Quantity(item.quantity),
          }),
        ),
      shippingAddress: () => ShippingAddress.fromPrimitives(input.shippingAddress),
    });
  }

  protected async handle(command: PlaceOrderCommand): Promise<string> {
    const lines: OrderLine[] = [];
    for (const item of command.items) {
      const product = await this.pricing.priceForSale(item.sku);
      if (product === null) {
        throw new ProductNotSellable(item.sku.value);
      }
      lines.push(
        new OrderLine({ sku: product.sku, quantity: item.quantity, unitPrice: product.unitPrice }),
      );
    }
    const order = Order.create(
      OrderId.generate(),
      command.customerId,
      new OrderLines({ items: lines }),
      command.shippingAddress,
      this.clock,
    );
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
    return order.id.value;
  }
}
```

`AddressData` (`{ street: string; city: string; country: string }`) es un tipo de datos de la aplicación, en `application/place-order/address-data.ts`, junto al caso de uso que lo necesita primero.

El precio se copia en la línea del pedido: Ventas guarda el estado remoto **mínimo** que necesita y deja de depender de Catálogo para ese pedido [IDDD cap. 3]. La consulta a Catálogo va antes de crear y guardar el pedido; como la transacción solo existe dentro del `save` del repositorio, nunca queda una abierta mientras se espera a la red `[Fuera de los libros: convención de @archi-code/ddd]`. `ProductNotSellable` es un error de negocio de Ventas (`domain/exception/ProductNotSellable.ts`, sin sufijo `Exception`) con código propio (`SAL006`), que `ExceptionClassifier` clasifica como `ExceptionKind.Invalid` (422 en HTTP).

## ACL con un webhook entrante

Mismo patrón con un producto externo que llama a este contexto: el punto de entrada es el adaptador, la forma del mensaje es el contrato y la traducción produce la entrada de un caso de uso en el lenguaje local. Vive en `interfaces/` (como cualquier controlador) y solo conoce casos de uso y `ExceptionClassifier` de `@archi-code/ddd/infrastructure` [IDDD cap. 4]. Traduce cada `ExceptionKind` a lo que entiende el emisor: lo que merece reintento (un conflicto, un error interno) responde 5xx para que la pasarela vuelva a enviarlo, y lo que no cambiaría al reintentar responde 4xx `[Fuera de los libros]`. El router ya ha comprobado la firma del emisor y la forma del cuerpo antes de llamarlo `[Fuera de los libros]`.

```ts
// src/contexts/payments/interfaces/http/payment-gateway-webhook.ts
import { ExceptionClassifier, ExceptionKind } from '@archi-code/ddd/infrastructure';
import type { Logger } from '@archi-code/ddd/application';
import type { RecordPaymentAuthorization } from '../../application/record-payment-authorization/record-payment-authorization';
import type { RecordPaymentRejection } from '../../application/record-payment-rejection/record-payment-rejection';

export interface GatewayEvent {
  type: string;
  created: number;
  amount: number;
  currency: string;
  failure_code?: string;
  metadata: { paymentId: string };
}

function statusOf(kind: ExceptionKind): number {
  switch (kind) {
    case ExceptionKind.Conflict:
    case ExceptionKind.Internal:
      return 503;
    case ExceptionKind.NotFound:
      return 404;
    default:
      return 422;
  }
}

export class PaymentGatewayWebhook {
  constructor(
    private readonly recordAuthorization: RecordPaymentAuthorization,
    private readonly recordRejection: RecordPaymentRejection,
    private readonly logger: Logger,
  ) {}

  async receive(event: GatewayEvent): Promise<{ status: number }> {
    try {
      switch (event.type) {
        case 'charge.authorized':
          await this.recordAuthorization.execute({
            paymentId: event.metadata.paymentId,
            amount: { amount: event.amount, currency: event.currency },
            authorizedAt: new Date(event.created * 1000).toISOString(),
          });
          break;
        case 'charge.failed':
          await this.recordRejection.execute({
            paymentId: event.metadata.paymentId,
            reason: event.failure_code ?? 'unknown',
          });
          break;
      }
      return { status: 204 };
    } catch (error) {
      const kind = ExceptionClassifier.classify(error);
      if (kind === ExceptionKind.Internal) {
        this.logger.error('payment_webhook_failed', { type: event.type, error });
      }
      return { status: statusOf(kind) };
    }
  }
}
```

`charge.authorized` es lenguaje de la pasarela; `RecordPaymentAuthorization` es lenguaje de Pagos. Cada tipo de evento que interesa va a un caso de uso distinto, que construye sus value objects en `toCommand` (`PaymentId`, `Money`) y registra un hecho: no lo rechaza y es idempotente, porque la pasarela reintenta. Los tipos que este contexto no necesita se ignoran con 204. Este punto de entrada traduce los errores él mismo porque la pasarela entiende los estados de otra forma (reintenta con 5xx): hace de ayudante de protocolo para ese emisor, como `Http` lo hace para los controladores, que nunca capturan errores `[Fuera de los libros: convención de @archi-code/ddd]`.

## ACL con eventos de otro contexto

Si el upstream publica eventos (con el mismo paquete o no), el downstream los lee con su propia clase: un `EventBase` con el nombre publicado y solo los campos que usa, nunca la clase del otro contexto importada de su código, junto al caso de uso por reacción que lo escucha `[Fuera de los libros: convención de @archi-code/ddd]`. Aquí Almacén es un sistema aparte que publica su Published Language en su propio exchange, así que el `eventName` es el del contrato (`'warehouse.stock.StockReserved'`); si Almacén compartiera el canal del sistema, el evento sería su evento interno (`'stock_item.reserved'`, como en `ddd-skills/ddd-agregados/references/consistencia-eventual.md`). La factoría de `EventRegistry` es el traductor del mensaje y el caso de uso por reacción, una sola clase sin `UseCase` detrás, construye los value objects y llama al agregado:

```ts
// src/contexts/sales/application/register-stock-reservation/stock-reserved-domain-event.ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class StockReservedDomainEvent extends EventBase {
  static readonly eventName = 'warehouse.stock.StockReserved';

  readonly reservationId: string;
  readonly orderId: string;

  constructor({
    reservationId,
    orderId,
    eventId,
    occurredOn,
    clock,
  }: { reservationId: string; orderId: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.reservationId = reservationId;
    this.orderId = orderId;
  }
}
```

```ts
// src/contexts/sales/application/register-stock-reservation/register-stock-reservation-on-stock-reserved.ts
import type { AggregateFinder, AggregateSaver } from '@archi-code/ddd/domain';
import { EventListener, ListensTo, ValueObjectBuilder } from '@archi-code/ddd/application';
import type { Clock, EventBus } from '@archi-code/ddd/application';
import type { Order } from '../../domain/aggregate/Order';
import { OrderId } from '../../domain/value-object/OrderId';
import { ReservationReference } from '../../domain/value-object/ReservationReference';
import { StockReservedDomainEvent } from './stock-reserved-domain-event';

@ListensTo(StockReservedDomainEvent, {
  consumer: 'sales.register-stock-reservation-on-stock-reserved',
})
export class RegisterStockReservationOnStockReserved extends EventListener<StockReservedDomainEvent> {
  constructor(
    private readonly orders: AggregateFinder<Order> & AggregateSaver<Order>,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    super();
  }

  async handle(event: StockReservedDomainEvent): Promise<void> {
    const { orderId, reservation } = ValueObjectBuilder.build({
      orderId: () => new OrderId(event.orderId),
      reservation: () => new ReservationReference(event.reservationId),
    });
    const order = await this.orders.findById(orderId);
    if (order === null) {
      return;
    }
    order.registerStockReservation(reservation, this.clock);
    await this.orders.save(order);
    await this.events.publish(order.pullDomainEvents());
  }
}
```

```ts
// src/contexts/sales/composition.ts (extracto de SalesContext.start)
import { DomainEventBus, EventRegistry } from '@archi-code/ddd/infrastructure';

const warehouseEvents = new EventRegistry().register(
  StockReservedDomainEvent,
  (json) =>
    new StockReservedDomainEvent({
      reservationId: json.reservationId as string,
      orderId: json.orderId as string,
      eventId: json.eventId,
      occurredOn: json.occurredOn,
    }),
);
const warehouseBus = new DomainEventBus(
  new RabbitMqEventChannel(amqpChannel, 'warehouse.published'),
  warehouseEvents,
  logger,
);
subscriptions.push(
  await warehouseBus.subscribe(new RegisterStockReservationOnStockReserved(orders, salesBus, clock)),
);
```

`RabbitMqEventChannel` es el canal de broker del proyecto (el de `ddd-skills/archi-code-ddd/patterns.md`), aquí suscrito al exchange donde Almacén publica su Published Language. La factoría pasa `eventId` y `occurredOn` para conservar el identificador con el que se deduplica. Leer `json.orderId as string` no valida nada: el caso de uso por reacción construye `OrderId` y `ReservationReference` con `ValueObjectBuilder.build`, y si el mensaje no cumple el contrato lanza una `ValidationException` con cada campo, la reacción falla y el canal lo aparta (en RabbitMQ, `nack` a la cola de mensajes muertos). Su idempotencia se explica en `ddd-skills/ddd-context-mapping/references/estilos-integracion.md`.

## Tests de la capa

`[Fuera de los libros]`
* **Traductor:** tests unitarios con respuestas reales anonimizadas del sistema remoto.
* **Adaptador:** tests de contrato contra el esquema publicado o un entorno de pruebas del upstream.
* **Dominio y casos de uso:** usan una implementación en memoria del puerto; nunca se prueban contra el sistema remoto:

```ts
import type { ProductPricing } from '../../src/contexts/sales/domain/service/ProductPricing';
import type { SellableProduct } from '../../src/contexts/sales/domain/value-object/SellableProduct';
import type { Sku } from '../../src/contexts/sales/domain/value-object/Sku';

export class InMemoryProductPricing implements ProductPricing {
  private readonly products = new Map<string, SellableProduct>();

  add(product: SellableProduct): this {
    this.products.set(product.sku.value, product);
    return this;
  }

  async priceForSale(sku: Sku): Promise<SellableProduct | null> {
    return this.products.get(sku.value) ?? null;
  }
}
```

El adaptador en memoria vive en `test/support/in-memory-product-pricing.ts` como doble de test, o en `infrastructure/catalog/in-memory-product-pricing.ts` si la aplicación corre en memoria. Con él, `PlaceOrder` se prueba con `new InMemoryOrderRepository()` (el repositorio en memoria del proyecto, en `infrastructure/persistence/` o en `test/support/`, como en `ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`), un `DomainEventBus` sobre `InMemoryEventChannel` y `new FixedClock('2026-03-01T09:30:00Z')`, comprobando `channel.sent` y lo guardado.

## Errores frecuentes

* El puerto devuelve el DTO remoto "por comodidad" en vez de value objects. La capa ya no protege nada.
* El traductor vive en el dominio porque "es lógica". Si conoce el formato remoto, es infraestructura.
* Una única ACL genérica para todos los sistemas externos. Cada relación tiene su traducción.
* Copiar todos los campos remotos "por si acaso" en vez del estado mínimo.
* Dejar que una `ValidationException` provocada por datos del sistema remoto salga como si fuera un error del usuario (422): el adaptador la envuelve en su propia `InfrastructureException`.
* Importar la clase de evento del otro contexto para el `@ListensTo`: el downstream declara la suya, con el nombre publicado, junto al caso de uso por reacción que la escucha.
* Un listener que llama a un `UseCase` para cada evento externo: el caso de uso por reacción es la propia clase con `@ListensTo`.
