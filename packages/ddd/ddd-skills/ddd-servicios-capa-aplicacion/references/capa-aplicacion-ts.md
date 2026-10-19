# Capa de aplicación en TypeScript

## Plantilla de caso de uso

```ts
export type CancelOrderCommand = Readonly<{ orderId: string; requestedBy: string; reason: string }>;

export class CancelOrder {
  constructor(
    private readonly orders: OrderRepository,
    private readonly tx: TransactionRunner,
    private readonly access: SalesAccessPolicy,
  ) {}

  async execute(cmd: CancelOrderCommand): Promise<void> {
    await this.tx.run(async () => {
      const order = await this.orders.byId(OrderId.of(cmd.orderId));       // 1. cargar
      if (!order) throw new OrderNotFound(cmd.orderId);
      this.access.assertCanCancel(cmd.requestedBy, order);                   // 2. autorizar
      order.cancel(CancellationReason.of(cmd.reason));                       // 3. invocar el dominio
      await this.orders.save(order);                                         // 4. guardar (+ eventos por outbox)
    });
  }
}
```

Cuatro pasos y ninguna regla de negocio. Coincide con la forma de IDDD: parámetros, repositorio, comando sobre el agregado [IDDD cap. 4] y con la anatomía de *DDD in PHP* [PHP: Application].

## Entrada

* Primitivos o DTO o comando [PHP: Application, citando a Vernon]. En TypeScript, tipos `Readonly` planos; se pueden serializar y encolar si un día hace falta [PHP: Application].
* La conversión a value objects ocurre dentro del caso de uso (o en el adaptador), y los errores de formato salen como errores de dominio con nombre.
* Nunca recibas el agregado desde el controlador.

## Salida

IDDD presenta varias opciones [IDDD cap. 14]:

| Opción | Cuándo |
|---|---|
| Devolver un identificador o nada | Comandos (lo normal) |
| DTO construido desde el agregado | El cliente necesita el resultado inmediato |
| Transformador de datos que elige el cliente | Varios clientes con formatos distintos |
| Método sin retorno y puerto de salida | Estilo hexagonal estricto |

Para pantallas, mejor una consulta de lectura aparte que devuelve un DTO sin pasar por el agregado (ver `ddd-repositorios-persistencia` y `ddd-event-sourcing-cqrs`).

## Command bus

*DDD in PHP* presenta el bus de comandos (Tactician) para enlazar cada comando con su manejador; los objetos request se parecen ya a comandos [PHP: Application]. En TypeScript `[Fuera de los libros]`: útil si quieres middleware común (transacción, log, métricas) para todos los casos de uso; innecesario si tienes pocos. Un mapa `tipo → handler` con un middleware de transacción suele bastar.

## Eventos en la capa de aplicación

* La aplicación puede registrar suscriptores para guardar y reenviar eventos, dejando el dominio libre de mensajería [IDDD cap. 4].
* Con outbox, el repositorio o el caso de uso guarda los eventos en la transacción; la publicación ocurre fuera (`ddd-eventos-dominio`).

## Errores

`[Fuera de los libros]`
* El dominio lanza errores con nombre (`OrderCannotBeCancelled`).
* La aplicación añade los suyos (`OrderNotFound`, `NotAllowed`). Con `@archi-code/ddd` son `AggregateNotFoundException` y `NotAllowedException`, de `@archi-code/ddd/exceptions`, y los lanza el caso de uso: el repositorio devuelve `null` y el dominio no sabe de permisos `[Fuera de los libros: convención de @archi-code/ddd]`.
* El adaptador los traduce a HTTP: 404, 403, 409 (conflicto de versión), 422 (regla de negocio). `HttpErrorMapper` aplica exactamente esa tabla.

## Tests

```ts
it('cancela un pedido pendiente del propio cliente', async () => {
  const orders = new InMemoryOrderRepository();
  const order = aPendingOrderOf('cus-laura');
  await orders.save(order);

  await new CancelOrder(orders, new NoTransaction(), new SalesAccessPolicy())
    .execute({ orderId: order.id.value, requestedBy: 'cus-laura', reason: 'me equivoqué de talla' });

  expect(orders.publishedEvents.map((e) => e.type)).toContain('OrderCancelled');
});
```

Este test comprueba orquestación. Que un pedido enviado no se pueda cancelar se prueba en `Order`, no aquí.
