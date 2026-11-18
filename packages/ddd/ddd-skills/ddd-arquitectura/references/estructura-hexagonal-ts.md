# Estructura hexagonal en TypeScript

## Carpetas

`[Fuera de los libros: convención de @archi-code/ddd]` Traslado de IDDD cap. 9 y PHP: Modules, con `domain/` por tipo de clase.

```
src/
  shop.ts                      ← arranque: abre el canal y arranca cada contexto
  platform/http/http.ts        ← ayudante HTTP con ExceptionClassifier
  contexts/
    shared-kernel/money/       ← solo con Shared Kernel acordado: Money.ts, Cents.ts, MoneyCurrency.ts…
    sales/
      domain/
        aggregate/Order.ts, NewOrderLine.ts
        entity/OrderLine.ts
        value-object/OrderId.ts, OrderStatusType.ts, Sku.ts, ShippingAddress.ts
        event/OrderCreatedDomainEvent.ts
        exception/OrderNotModifiable.ts
        repository/OrderRepository.ts, CouponRepository.ts   (abstract, extends AggregateRepository<…>)
        service/OrderPricing.ts                (solo clases concretas, nunca interfaces)
        specification/FreeShippingEligible.ts
      application/
        place-order/place-order.ts, address-data.ts
        mark-order-paid/mark-order-paid-on-payment-captured.ts, payment-captured-domain-event.ts
        order-summaries/       (read model: fila, store, consulta, proyección, reacciones)
      infrastructure/
        persistence/in-memory-order-repository.ts, mongo-order-repository.ts
        messaging/rabbit-mq-event-channel.ts
      interfaces/http/orders-controller.ts
      composition.ts           ← SalesContext.start / stop
test/
  support/                     (fábricas de datos y dobles)
  contexts/sales/{domain,application,infrastructure}/
```

* PascalCase igual a la clase en `domain/` y `shared-kernel/`; kebab-case en el resto. Imports al fichero que declara, nunca a una carpeta ni a un `index.ts`; `import type` para tipos.
* No se escriben clases base, mappers, publicadores, puerto de hora (`CreatedAt.now()`, `occurredOn` lo pone el bus) ni runner de transacciones.
* El proyecto escribe el repositorio abstracto de cada agregado y un adaptador por agregado y tecnología, cuyo constructor recibe solo su tecnología (la `collection`, el `pool`; IndexedDB: la `IndexedDbDatabase`, de la que saca su tabla con su `IndexedDbSchema`), nunca la clase del agregado ni un mapper, llama a `toPrimitives()`/`fromPrimitives()` y recuerda la versión en un `WeakMap`. El repositorio en memoria es una implementación más [IDDD cap. 12]: en `infrastructure/persistence/` si la aplicación corre en memoria, o en `test/support/` (`ddd-skills/ddd-repositorios-persistencia/references/tests-repositorios.md`). Nada comprueba en ejecución la forma del agregado: la garantiza su test de ida y vuelta.
* Tests de aceptación junto al contexto, en carpeta espejo [Destilado cap. 2].
* Los tipos de entrada (`MoneyData`) viven en la carpeta del caso de uso que los necesita primero; nunca en `domain/` ni compartidos entre contextos.
* Un caso de uso por reacción vive en la carpeta de su acción junto a la copia del evento que escucha, nunca en `listeners/`.

Si el proyecto reserva `src/app/`, los contextos van en `src/app/contexts/` sin crear carpetas raíz nuevas `[Fuera de los libros]`. El logger es el puerto `Logger` del paquete (mensaje estable en snake_case + contexto), recibido por constructor fuera del dominio y con el proveedor elegido en el arranque (el dominio no registra logs, registra eventos o lanza errores); `process.env` solo en el arranque, que pasa `<Context>Settings` tipados; los prompts nunca van en el dominio y un modelo de IA es un adaptador tras un puerto con nombre de negocio `[Fuera de los libros: convención de @archi-code/ddd]`.

El interior se diseña por casos de uso, no por número de clientes; un adaptador de entrada traduce a la API de aplicación [IDDD cap. 4].

## Composition root sin contenedor

```ts
// src/contexts/payments/composition.ts
export class PaymentsContext {
  private constructor(readonly controller: PaymentsController, private readonly subscriptions: Subscription[]) {}

  static async start({ channel, logger }: PaymentsSettings): Promise<PaymentsContext> {
    const bus = new DomainEventBus(channel, PaymentsContext.registry(), logger);
    const payments = new InMemoryPaymentRepository();
    const subscriptions = [await bus.subscribe(new RequestPaymentOnOrderCreated(payments, bus))];
    const controller = new PaymentsController(new ConfirmTransferReceived(payments, bus), logger);
    return new PaymentsContext(controller, subscriptions);
  }

  async stop(): Promise<void> {
    for (const subscription of this.subscriptions.splice(0)) {
      await subscription.unsubscribe();
    }
  }

  private static registry(): EventRegistry {
    return new EventRegistry().register(OrderCreatedDomainEvent, (json) =>
      new OrderCreatedDomainEvent({
        orderId: json.orderId as string,
        total: json.total as MoneyData,
        eventId: json.eventId,
        occurredOn: json.occurredOn,
      }),
    );
  }
}
```

* `registry()` registra cada evento que el contexto escucha; la factoría copia cada campo y conserva `eventId` y `occurredOn` (deduplicación). Solo el composition root llama a `bus.subscribe`, que lee `@ListensTo` y rechaza eventos sin registrar (`UnknownEventException`); guarda cada `Subscription` para `stop()`.
* `shop.ts` abre un canal, arranca cada contexto con él y el mismo logger, y los para en orden inverso. Cambiar a RabbitMQ u outbox cambia solo el canal; con una base de datos real, `start` recibe la conexión en sus `Settings`.
* Sin contenedor: el grafo a mano es más legible y no mete decoradores en el dominio `[Fuera de los libros]`. Con NestJS, sus módulos van en `interfaces/` e `infrastructure/`; el dominio sigue sin decoradores salvo `@Validations`.
* Los tests de aplicación arrancan el contexto sobre `InMemoryEventChannel`, publican el mismo evento dos veces y comprueban `channel.sent` o lo guardado, nunca que se llamó a la reacción.

## Controlador y ayudante de protocolo

`[Fuera de los libros: convención de @archi-code/ddd]` Un ayudante por protocolo, compartido y sin negocio, traduce `ExceptionClassifier.classify(error)`:

```ts
// src/platform/http/http.ts
export class Http {
  private static readonly STATUS: Record<ExceptionKind, number> = {
    [ExceptionKind.NotFound]: 404, [ExceptionKind.NotAllowed]: 403, [ExceptionKind.Conflict]: 409,
    [ExceptionKind.Malformed]: 400, [ExceptionKind.Invalid]: 422, [ExceptionKind.Rejected]: 400,
    [ExceptionKind.Internal]: 500,
  };

  constructor(private readonly logger: Logger) {}

  async respond(action: () => Promise<HttpResponse>): Promise<HttpResponse> {
    try {
      return await action();
    } catch (error) {
      const kind = ExceptionClassifier.classify(error);
      const code = error instanceof DomainException || error instanceof ApplicationException ||
        error instanceof InfrastructureException ? error.code : 'E000';
      if (kind === ExceptionKind.Internal) {
        this.logger.error('http_request_failed', { code, error });
        return { status: 500, body: { code, message: 'Internal server error' } };
      }
      const errors = error instanceof ValidationException ? error.errors : undefined;
      return { status: Http.STATUS[kind], body: { code, message: (error as Error).message, errors } };
    }
  }
}
```

`Http` también da `jsonBody(request)` (el cuerpo si es un objeto JSON, si no `null`), `badRequest(message)` (400) y `unauthenticated()` (401). Cada endpoint del controlador (que recibe los casos de uso, o una interfaz `<Aggregates>UseCases` si son muchos, los puertos de consulta y el `logger` al final) va dentro de `this.http.respond(async () => …)`: sin actor → `unauthenticated()` (401); cuerpo que no es un objeto JSON → `badRequest(...)`; si no, `execute` con el input y 201 `{ id }`, 204 o 200.

* El controlador solo comprueba la forma [IDDD cap. 4]; los valores los valida `toCommand` (422 con todos los campos). El actor sale del token, nunca del body, y va en el input para que el caso de uso autorice. El controlador no captura errores ni elige estados; una consulta lee directamente el puerto del read model (fila que falta → 404).
* Un consumidor de mensajes traduce el mismo `ExceptionKind` a confirmar, descartar o reintentar. Cada 500 se registra una vez (el ayudante), nunca otra vez en el controlador.

## TypeScript `[Fuera de los libros]`

* `strict: true`. `@Validations` y `@ListensTo` funcionan con decoradores estándar (TypeScript 5+ sin `experimentalDecorators`) y con los antiguos (`experimentalDecorators: true`); no necesitan `emitDecoratorMetadata` ni `reflect-metadata`.
* `moduleResolution` `node16`, `nodenext` o `bundler` para los subpaths (`node` usa `typesVersions`).
* `exactOptionalPropertyTypes` y `noUncheckedIndexedAccess` ayudan.
