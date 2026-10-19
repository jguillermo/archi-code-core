# Implementar una capa anticorrupción en TypeScript

## Estructura

IDDD propone tres piezas [IDDD cap. 3 y cap. 13]:

1. **Interfaz de la capa en el dominio:** un servicio de dominio con nombre del lenguaje local (en IDDD, `MemberService` que proporciona `ProductOwner` y `TeamMember`).
2. **Adaptador:** cliente del sistema remoto; habla su protocolo (en IDDD, `IdentityAccessNotificationAdapter`).
3. **Traductor:** convierte el Published Language remoto en objetos del modelo local (en IDDD, `MemberTranslator`).

El dominio solo ve la interfaz. Adaptador y traductor viven en infraestructura. Así el modelo usa datos de otro contexto para expresar sus propios conceptos sin contaminarse [IDDD cap. 3].

```
contexts/sales/
  domain/
    catalog/ProductPricing.ts          ← interfaz (puerto) con lenguaje de Ventas
    order/...
  infrastructure/
    catalog/
      CatalogHttpProductPricing.ts     ← adaptador: habla HTTP con Catálogo
      CatalogProductTranslator.ts      ← traductor: JSON de Catálogo → conceptos de Ventas
      catalog-schemas.ts               ← esquema del Published Language de Catálogo
```

## Ejemplo: Ventas consulta precios a Catálogo

Catálogo expone un OHS con fichas completas (fotos, descripciones, variantes, tarifas por canal). Ventas solo necesita saber si una referencia se puede vender y a qué precio en el canal web.

### 1. Puerto en el dominio de Ventas

```ts
// contexts/sales/domain/catalog/ProductPricing.ts
import { Sku } from '../shared/Sku';
import { Money } from '../shared/Money';

export interface SellableProduct {
  readonly sku: Sku;
  readonly name: string;
  readonly unitPrice: Money;
}

export interface ProductPricing {
  /** Devuelve null si la referencia no se puede vender ahora en el canal web. */
  priceForSale(sku: Sku): Promise<SellableProduct | null>;
}
```

Fíjate en el nombre: `ProductPricing` y `SellableProduct`, no `CatalogClient` ni `CatalogProductDto`. El dominio pregunta con su lenguaje.

### 2. Esquema del Published Language

```ts
// contexts/sales/infrastructure/catalog/catalog-schemas.ts
import { z } from 'zod';

// Solo lo que Ventas lee. El resto de campos de Catálogo se ignora.
export const CatalogProductV2 = z.object({
  sku: z.string(),
  displayName: z.string(),
  lifecycle: z.enum(['DRAFT', 'ACTIVE', 'DISCONTINUED']),
  channelPrices: z.array(
    z.object({ channel: z.string(), amount: z.string(), currency: z.string() }),
  ),
});
export type CatalogProductV2 = z.infer<typeof CatalogProductV2>;
```

### 3. Traductor

```ts
// contexts/sales/infrastructure/catalog/CatalogProductTranslator.ts
export class CatalogProductTranslator {
  toSellableProduct(remote: CatalogProductV2): SellableProduct | null {
    if (remote.lifecycle !== 'ACTIVE') return null;

    const web = remote.channelPrices.find((p) => p.channel === 'WEB');
    if (!web) return null;

    return {
      sku: Sku.of(remote.sku),
      name: remote.displayName,
      unitPrice: Money.of(web.amount, web.currency),
    };
  }
}
```

La regla "solo se vende lo activo con precio web" es una decisión de traducción. Si se convierte en regla del negocio de Ventas con matices propios, muévela al dominio.

### 4. Adaptador

```ts
// contexts/sales/infrastructure/catalog/CatalogHttpProductPricing.ts
export class CatalogHttpProductPricing implements ProductPricing {
  constructor(
    private readonly http: HttpClient,
    private readonly translator = new CatalogProductTranslator(),
  ) {}

  async priceForSale(sku: Sku): Promise<SellableProduct | null> {
    const response = await this.http.get(`/products/${encodeURIComponent(sku.value)}`, {
      headers: { Accept: 'application/vnd.catalog.product.v2+json' },
      timeoutMs: 800,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new CatalogUnavailable(sku, response.status);

    const parsed = CatalogProductV2.safeParse(response.body);
    if (!parsed.success) throw new CatalogContractViolation(sku, parsed.error);

    return this.translator.toSellableProduct(parsed.data);
  }
}
```

Decisiones visibles:
* Timeout explícito: la red falla y hay latencia [IDDD cap. 13].
* Validación del contrato al entrar: si Catálogo rompe el esquema, el error se detecta en el borde y no dentro del modelo.
* Errores con nombre propio, que la capa de aplicación traduce a una respuesta adecuada.

### 5. Uso desde la capa de aplicación

```ts
export class PlaceOrder {
  constructor(
    private readonly orders: OrderRepository,
    private readonly pricing: ProductPricing,
  ) {}

  async execute(cmd: PlaceOrderCommand): Promise<string> {
    const lines = [];
    for (const item of cmd.items) {
      const product = await this.pricing.priceForSale(Sku.of(item.sku));
      if (!product) throw new ProductNotSellable(item.sku);
      lines.push(OrderLine.of(product.sku, product.name, Quantity.of(item.quantity), product.unitPrice));
    }
    const order = Order.place(OrderId.generate(), CustomerId.of(cmd.customerId), lines);
    await this.orders.save(order);
    return order.id.value;
  }
}
```

El precio se copia en la línea del pedido: Ventas guarda el estado remoto **mínimo** que necesita y deja de depender de Catálogo para ese pedido [IDDD cap. 3].

## ACL con eventos entrantes

Mismo patrón: el consumidor del mensaje es el adaptador, el esquema es el contrato, el traductor produce un comando o una llamada al dominio local.

```ts
export class PaymentGatewayWebhookAdapter {
  async onWebhook(body: unknown): Promise<void> {
    const event = GatewayEvent.parse(body);                  // lenguaje de la pasarela
    switch (event.type) {
      case 'charge.authorized':
        return this.payments.recordAuthorization(            // lenguaje de Pagos
          PaymentId.of(event.metadata.paymentId),
          Money.ofMinorUnits(event.amount, event.currency),
          new Date(event.created * 1000),
        );
      case 'charge.failed':
        return this.payments.recordRejection(PaymentId.of(event.metadata.paymentId), event.failure_code);
      default:
        return; // eventos que este contexto no necesita
    }
  }
}
```

`[Fuera de los libros: convención de @archi-code/ddd]` Con el paquete el adaptador no llama al agregado ni a un servicio de dominio: es un punto de entrada en `interfaces/` que traduce el webhook a la entrada de un caso de uso (`RecordPaymentAuthorization`, `RecordPaymentRejection`) y llama a su `execute(input)`; el caso de uso construye los value objects en `toCommand`, carga el agregado, lo cambia, lo guarda y publica sus eventos.

## Tests de la capa

`[Fuera de los libros]`
* **Traductor:** tests unitarios con respuestas reales anonimizadas del sistema remoto.
* **Adaptador:** tests de contrato contra el esquema publicado o un entorno de pruebas del upstream.
* **Dominio:** usa una implementación en memoria del puerto (`InMemoryProductPricing`); el dominio nunca se prueba contra el sistema remoto.

## Errores frecuentes

* El puerto devuelve el DTO remoto "por comodidad". La capa ya no protege nada.
* El traductor vive en el dominio porque "es lógica". Si conoce el formato remoto, es infraestructura.
* Una única ACL genérica para todos los sistemas externos. Cada relación tiene su traducción.
* Copiar todos los campos remotos "por si acaso" en vez del estado mínimo.
