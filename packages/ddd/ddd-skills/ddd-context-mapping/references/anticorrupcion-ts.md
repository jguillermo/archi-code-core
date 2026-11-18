# Capa anticorrupción en TypeScript

Tres piezas [IDDD cap. 3 y 13]: **interfaz** con lenguaje local (los libros la ponen en el dominio; aquí es un puerto de aplicación en `application/`, porque no existen puertos de dominio `[Fuera de los libros: convención de @archi-code/ddd]`), **adaptador** que habla el protocolo remoto y **traductor** del Published Language a objetos locales. El dominio no ve ni la interfaz: el caso de uso llama al puerto y le pasa los value objects. El paquete no trae ninguna: se escriben con sus value objects y excepciones `[Fuera de los libros: convención de @archi-code/ddd]`.

```
src/contexts/sales/
  application/place-order/product-pricing.ts ← puerto de aplicación con lenguaje de Ventas
  domain/order/exception/ProductNotSellable.ts
  infrastructure/catalog/
    catalog-http-product-pricing.ts         ← adaptador
    catalog-translator.ts                   ← traductor
    catalog-product-v2.ts                   ← forma del Published Language que se lee
    catalog-unavailable.ts, catalog-contract-violation.ts
```

## Ventas consulta precios a Catálogo

```ts
// application/place-order/product-pricing.ts
export interface ProductPricing {
  priceOf(sku: Sku): Promise<Money | null>;
}

// infrastructure/catalog/catalog-product-v2.ts: solo lo que Ventas lee
export interface CatalogProductV2 {
  sku: string;
  displayName: string;
  lifecycle: 'DRAFT' | 'ACTIVE' | 'DISCONTINUED';
  channelPrices: { channel: string; amountMinor: number; currency: string }[];
}
```

Nombres del lenguaje local (`ProductPricing`, no `CatalogClient`) y value objects ya válidos, nunca el DTO remoto; `null` = no se puede vender ahora. El adaptador comprueba solo la forma; los valores los validan los value objects al construirse.

```ts
// infrastructure/catalog/catalog-translator.ts
export class CatalogTranslator {
  static isProductV2(body: unknown): body is CatalogProductV2 {
    const c = body as Partial<CatalogProductV2> | null;
    return typeof c === 'object' && c !== null && typeof c.sku === 'string' &&
      typeof c.displayName === 'string' && typeof c.lifecycle === 'string' &&
      Array.isArray(c.channelPrices);
  }

  toPrice(remote: CatalogProductV2): Money | null {
    const web = remote.channelPrices.find((price) => price.channel === 'WEB');
    if (remote.lifecycle !== 'ACTIVE' || web === undefined) {
      return null;
    }
    return Money.fromPrimitives({ amount: web.amountMinor, currency: web.currency as Currency });
  }
}
```

```ts
// infrastructure/catalog/catalog-http-product-pricing.ts
export class CatalogHttpProductPricing implements ProductPricing {
  constructor(private readonly http: CatalogHttp, private readonly translator = new CatalogTranslator()) {}

  async priceOf(sku: Sku): Promise<Money | null> {
    let response;
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
      return this.translator.toPrice(body);
    } catch (error) {
      throw new CatalogContractViolation(sku.value, { cause: error });
    }
  }
}
```

`CatalogUnavailable` (`CAT001`) y `CatalogContractViolation` (`CAT002`) extienden `InfrastructureException` (`super(message, ['CAT001'], options)`).

* Timeout explícito: la red falla [IDDD cap. 13].
* El contrato se comprueba en el borde; un valor remoto inválido sale como `CatalogContractViolation` con la `ValidationException` como `cause`, nunca como 422 del usuario.
* El punto de entrada traduce el código (`CAT001` → 503) antes de mirar el tipo; si no, es `ExceptionKind.Internal`. Con 5xx el cuerpo lleva un mensaje genérico, nunca el del error.
* "Solo se vende lo activo con precio web" es una decisión de traducción; si se vuelve regla de negocio de Ventas con matices, va al dominio.

El caso de uso recibe el puerto por constructor, consulta antes de crear (`null` → `ProductNotSellable`, error de negocio de Ventas `SAL006`, `ExceptionKind.Invalid`) y copia el precio en la línea: estado remoto **mínimo** [IDDD cap. 3]. La consulta va antes del `save`, así nunca hay transacción abierta esperando a la red `[Fuera de los libros: convención de @archi-code/ddd]`.

## Webhook entrante

El adaptador es un punto de entrada en `interfaces/` (`PaymentGatewayWebhook`): traduce cada tipo del emisor (`charge.authorized`) al input de un caso de uso con lenguaje local (`RecordPaymentAuthorization`) [IDDD cap. 4] y responde según `ExceptionClassifier.classify(error)`: 5xx lo que merece reintento (`Conflict`, `Internal`, registrado con `logger.error`), 4xx lo demás, 204 los tipos que no interesan `[Fuera de los libros]`. Cada caso de uso registra un hecho (no lo rechaza) y es idempotente, porque la pasarela reintenta. El router ya comprobó firma y forma del cuerpo `[Fuera de los libros]`; el webhook solo conoce casos de uso y `ExceptionClassifier` y traduce él mismo los errores porque hace de ayudante de protocolo de ese emisor; los controladores nunca capturan errores `[Fuera de los libros: convención de @archi-code/ddd]`.

## Eventos de otro contexto

El downstream lee con su propia clase `extends EventBase` (nombre publicado, solo los campos que usa) junto a la reacción, nunca la clase del otro contexto `[Fuera de los libros: convención de @archi-code/ddd]`. Si Almacén es un sistema aparte, el `eventName` es el del contrato (`'warehouse.stock.StockReserved'`); si comparte canal, su evento interno (`'stock_item.reserved'`, en `ddd-skills/ddd-agregados/references/consistencia-eventual.md`). La reacción `RegisterStockReservationOnStockItemReserved` tiene la forma de las de `ddd-skills/archi-code-ddd/reactions.md`: `ValueObjectBuilder.build`, `findById` (vuelve si falta), método de reacción, `save`, `publish`.

En `composition.ts`, la factoría de `EventRegistry` es el traductor: copia cada campo y pasa `eventId` y `occurredOn`; el bus va sobre el canal donde Almacén publica (un `RabbitMqEventChannel` como el de `ddd-skills/archi-code-ddd/composition-and-entry-points.md`, apartado "Another event channel"). Un mensaje fuera de contrato falla en `ValueObjectBuilder.build` y el canal lo aparta (cola de mensajes muertos).

## Tests `[Fuera de los libros]`

* Traductor: unitarios con respuestas reales anonimizadas.
* Adaptador: tests de contrato contra el esquema o el entorno de pruebas del upstream.
* Casos de uso (el dominio no ve el puerto): un `InMemoryProductPricing implements ProductPricing` (en `test/support/` o `infrastructure/catalog/`), con el repositorio en memoria de `ddd-skills/archi-code-ddd/repositories.md`; nunca el sistema remoto.

## Errores frecuentes

* El puerto devuelve el DTO remoto.
* Traductor en el dominio: si conoce el formato remoto, es infraestructura.
* Una ACL genérica para todos los sistemas.
* Copiar todos los campos remotos "por si acaso".
* Dejar salir una `ValidationException` de datos remotos como error del usuario.
* Importar la clase de evento del otro contexto, o un listener que llama a un `UseCase`.
