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
    catalog/ProductPricing.ts          ← puerto con lenguaje de Ventas (SellableProduct, ProductPricing)
    order/...
  infrastructure/
    catalog/
      CatalogHttpProductPricing.ts     ← adaptador: habla HTTP con Catálogo
      CatalogTranslator.ts             ← traductor: JSON de Catálogo → value objects de Ventas
      CatalogProductV2.ts              ← forma del Published Language de Catálogo que Ventas lee
```

## Ejemplo: Ventas consulta precios a Catálogo

Catálogo expone un OHS con fichas completas (fotos, descripciones, variantes, tarifas por canal). Ventas solo necesita saber si una referencia se puede vender y a qué precio en el canal web.

### 1. Puerto en el dominio de Ventas

```ts
// src/contexts/sales/domain/catalog/ProductPricing.ts
import { Composite, Required, StringType } from '@archi-code/ddd/domain';
import { Money } from '../shared/Money';
import { Sku } from '../order/OrderLine';

export class ProductName extends Required(StringType) {}

export class SellableProduct extends Composite({ sku: Sku, name: ProductName, unitPrice: Money }) {}

export interface ProductPricing {
  priceForSale(sku: Sku): Promise<SellableProduct | null>;
}
```

Fíjate en el nombre: `ProductPricing` y `SellableProduct`, no `CatalogClient` ni `CatalogProductDto`. El dominio pregunta con su lenguaje y recibe value objects ya válidos (`SellableProduct` es un `Composite` de `Sku`, `ProductName` y `Money`); `null` significa que la referencia no se puede vender ahora en el canal web.

### 2. Forma del Published Language

```ts
// src/contexts/sales/infrastructure/catalog/CatalogProductV2.ts
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
// src/contexts/sales/infrastructure/catalog/CatalogTranslator.ts
import { SellableProduct } from '../../domain/catalog/ProductPricing';
import type { CatalogProductV2 } from './CatalogProductV2';

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
// src/contexts/sales/infrastructure/catalog/CatalogHttpProductPricing.ts
import { InfrastructureException } from '@archi-code/ddd/exceptions';
import type { ProductPricing, SellableProduct } from '../../domain/catalog/ProductPricing';
import type { Sku } from '../../domain/order/OrderLine';
import { CatalogTranslator } from './CatalogTranslator';

export class CatalogUnavailable extends InfrastructureException {
  constructor(sku: string, options: { cause?: unknown } = {}) {
    super(`Catalog did not answer for ${sku}`, ['CAT001'], options);
  }
}

export class CatalogContractViolation extends InfrastructureException {
  constructor(sku: string, options: { cause?: unknown } = {}) {
    super(`Catalog answered ${sku} outside its published contract`, ['CAT002'], options);
  }
}

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
* Errores con nombre y código propios (`InfrastructureException` con `CAT001`, `CAT002`). El punto de entrada los traduce con `HttpErrorMapper`, que responde 500 por defecto a cualquier error de infraestructura; para avisar de que Catálogo no está disponible se configura por código: `new HttpErrorMapper({ statusByCode: { CAT001: 503 } })` (con 5xx el cuerpo lleva un mensaje genérico, nunca el del error).

### 5. Uso desde la capa de aplicación

```ts
// src/contexts/sales/application/place-order/PlaceOrder.ts
import { ValueObjects } from '@archi-code/ddd/domain';
import type { AggregateSaver } from '@archi-code/ddd/domain';
import { UseCase } from '@archi-code/ddd/application';
import type { Clock, EventBus, TransactionRunner } from '@archi-code/ddd/application';
import type { ProductPricing } from '../../domain/catalog/ProductPricing';
import { CustomerId } from '../../domain/customer/CustomerId';
import { Order, OrderEvent, OrderId } from '../../domain/order/Order';
import { OrderLine, OrderLines, Quantity, Sku } from '../../domain/order/OrderLine';
import { ShippingAddress } from '../../domain/order/ShippingAddress';
import { ProductNotSellable } from '../../domain/order/ProductNotSellable';

interface PlaceOrderInput {
  customerId: string;
  items: { sku: string; quantity: number }[];
  shippingAddress: { street: string; city: string; country: string };
}

interface PlaceOrderCommand {
  orderId: OrderId;
  customerId: CustomerId;
  items: { sku: Sku; quantity: Quantity }[];
  shippingAddress: ShippingAddress;
}

export class PlaceOrder extends UseCase<PlaceOrderInput, PlaceOrderCommand, string> {
  constructor(
    private readonly orders: AggregateSaver<Order>,
    private readonly pricing: ProductPricing,
    private readonly events: EventBus<OrderEvent>,
    private readonly transactions: TransactionRunner,
    private readonly clock: Clock,
  ) {
    super();
  }

  protected toCommand(input: PlaceOrderInput): PlaceOrderCommand {
    return ValueObjects.build({
      orderId: () => OrderId.generate(),
      customerId: () => new CustomerId(input.customerId),
      items: () =>
        ValueObjects.buildList(input.items, (item) =>
          ValueObjects.build({
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
    return this.transactions.run(async () => {
      const order = Order.place(
        command.orderId,
        command.customerId,
        new OrderLines({ items: lines }),
        command.shippingAddress,
        this.clock,
      );
      await this.orders.save(order);
      await this.events.publish(order.pullDomainEvents());
      return order.id.value;
    });
  }
}
```

El precio se copia en la línea del pedido: Ventas guarda el estado remoto **mínimo** que necesita y deja de depender de Catálogo para ese pedido [IDDD cap. 3]. La consulta a Catálogo va antes de `transactions.run`, para no tener una transacción abierta mientras se espera a la red `[Fuera de los libros]`. `ProductNotSellable` es una `DomainException` de Ventas con código propio (`ORD003`), que `HttpErrorMapper` responde con 422.

## ACL con un webhook entrante

Mismo patrón con un producto externo que llama a este contexto: el punto de entrada es el adaptador, la forma del mensaje es el contrato y la traducción produce la entrada de un caso de uso en el lenguaje local. Vive en `interfaces/` (como cualquier controlador) y solo conoce casos de uso y `HttpErrorMapper` [IDDD cap. 4]. El router ya ha comprobado la firma del emisor y la forma del cuerpo antes de llamarlo `[Fuera de los libros]`.

```ts
// src/contexts/payments/interfaces/http/PaymentGatewayWebhook.ts
import { HttpErrorMapper } from '@archi-code/ddd/infrastructure';
import type { HttpErrorBody } from '@archi-code/ddd/infrastructure';
import type { RecordPaymentAuthorization } from '../../application/record-payment-authorization/RecordPaymentAuthorization';
import type { RecordPaymentRejection } from '../../application/record-payment-rejection/RecordPaymentRejection';

export interface GatewayEvent {
  type: string;
  created: number;
  amount: number;
  currency: string;
  failure_code?: string;
  metadata: { paymentId: string };
}

export class PaymentGatewayWebhook {
  constructor(
    private readonly recordAuthorization: RecordPaymentAuthorization,
    private readonly recordRejection: RecordPaymentRejection,
    private readonly errors: HttpErrorMapper,
  ) {}

  async receive(event: GatewayEvent): Promise<{ status: number; body?: HttpErrorBody }> {
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
      return this.errors.map(error);
    }
  }
}
```

`charge.authorized` es lenguaje de la pasarela; `RecordPaymentAuthorization` es lenguaje de Pagos. Cada tipo de evento que interesa va a un caso de uso distinto, que construye sus value objects en `toCommand` (`PaymentId`, `Money`) y registra un hecho: no lo rechaza y es idempotente, porque la pasarela reintenta. Los tipos que este contexto no necesita se ignoran con 204.

## ACL con eventos de otro contexto

Si el upstream publica eventos (con el mismo paquete o no), el downstream los lee con su propia clase: un `EventBase` con el nombre publicado y solo los campos que usa, nunca la clase del otro contexto importada de su código `[Fuera de los libros: convención de @archi-code/ddd]`. La factoría de `EventRegistry` es el traductor del mensaje, y el listener convierte el evento en la entrada de un caso de uso:

```ts
// src/contexts/sales/application/register-stock-reservation/StockReserved.ts
import { EventBase } from '@archi-code/ddd/domain';
import type { EventMetadata } from '@archi-code/ddd/domain';

export class StockReserved extends EventBase {
  static readonly eventName = 'warehouse.stock.StockReserved';

  constructor(
    reservationId: string,
    readonly orderId: string,
    metadata?: EventMetadata,
  ) {
    super(reservationId, metadata);
  }
}
```

```ts
// src/contexts/sales/application/register-stock-reservation/RegisterStockReservationOnStockReserved.ts
import { EventListener, ListensTo } from '@archi-code/ddd/application';
import { RegisterStockReservation } from './RegisterStockReservation';
import { StockReserved } from './StockReserved';

@ListensTo(StockReserved, { consumer: 'sales.register-stock-reservation-on-stock-reserved' })
export class RegisterStockReservationOnStockReserved extends EventListener<StockReserved> {
  constructor(private readonly registerStockReservation: RegisterStockReservation) {
    super();
  }

  async handle(event: StockReserved): Promise<void> {
    await this.registerStockReservation.execute({
      orderId: event.orderId,
      reservationId: event.aggregateId,
    });
  }
}
```

```ts
// src/contexts/sales/composition.ts (extracto)
import { DomainEventBus, EventRegistry } from '@archi-code/ddd/infrastructure';

const warehouseEvents = new EventRegistry<StockReserved>().register(
  StockReserved,
  (json) => new StockReserved(json.aggregateId, json.orderId as string, json),
);
const warehouseBus = new DomainEventBus<StockReserved>(
  new RabbitMqEventChannel(amqpChannel, 'warehouse.published'),
  warehouseEvents,
);
await warehouseBus.subscribe(
  new RegisterStockReservationOnStockReserved(
    new RegisterStockReservation(orders, salesBus, transactions, clock),
  ),
);
```

`RabbitMqEventChannel` es el canal de broker del proyecto (el de `ddd-skills/archi-code-ddd/patterns.md`), aquí suscrito al exchange donde Almacén publica su Published Language. La factoría pasa `json` como metadatos para conservar el `eventId` con el que se deduplica. Leer `json.orderId as string` no valida nada: el caso de uso construye `OrderId` y `ReservationId` en `toCommand`, y si el mensaje no cumple el contrato lanza una `ValidationException` con cada campo, el listener falla y el canal lo aparta (en RabbitMQ, `nack` a la cola de mensajes muertos). El caso de uso `RegisterStockReservation` y su idempotencia están en `ddd-skills/ddd-context-mapping/references/estilos-integracion.md`.

## Tests de la capa

`[Fuera de los libros]`
* **Traductor:** tests unitarios con respuestas reales anonimizadas del sistema remoto.
* **Adaptador:** tests de contrato contra el esquema publicado o un entorno de pruebas del upstream.
* **Dominio y casos de uso:** usan una implementación en memoria del puerto; nunca se prueban contra el sistema remoto:

```ts
import type { ProductPricing } from '../../src/contexts/sales/domain/catalog/ProductPricing';
import { SellableProduct } from '../../src/contexts/sales/domain/catalog/ProductPricing';
import type { Sku } from '../../src/contexts/sales/domain/order/OrderLine';

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

Con ella, `PlaceOrder` se prueba con `new InMemoryRepository(AggregateMapper.of(Order))`, `new InMemoryTransactionRunner([orders])`, un `DomainEventBus` sobre `InMemoryEventChannel` y `new FixedClock('2026-03-01T09:30:00Z')`, comprobando `channel.sent` y lo guardado.

## Errores frecuentes

* El puerto devuelve el DTO remoto "por comodidad" en vez de value objects. La capa ya no protege nada.
* El traductor vive en el dominio porque "es lógica". Si conoce el formato remoto, es infraestructura.
* Una única ACL genérica para todos los sistemas externos. Cada relación tiene su traducción.
* Copiar todos los campos remotos "por si acaso" en vez del estado mínimo.
* Dejar que una `ValidationException` provocada por datos del sistema remoto salga como si fuera un error del usuario (422): el adaptador la envuelve en su propia `InfrastructureException`.
* Importar la clase de evento del otro contexto para el `@ListensTo`: el downstream declara la suya, con el nombre publicado.
