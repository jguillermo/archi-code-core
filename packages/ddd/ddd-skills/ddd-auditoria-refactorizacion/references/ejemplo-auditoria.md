# Ejemplo: auditoría de un backend de pedidos (Express + Prisma)

Caso inventado para mostrar el nivel esperado del informe.

## Contexto

API monolítica en TypeScript con Express y Prisma. Unos 180 ficheros. Un equipo. Duele: cambios en promociones rompen la facturación; pedidos confirmados sin stock en campañas.

## Escaneo

```
[alta ] controlador-escribe-en-bd: 37
[alta ] varios-agregados-en-una-transaccion: 9
[media] servicio-grande: 3   (OrderService ~52 métodos, 1.900 líneas)
[baja ] clase-con-nombre-generico: 6
Aviso: no se ha encontrado ninguna carpeta 'domain'.
```

No hay carpeta de dominio: el modelo son los tipos de Prisma. La prueba de anemia da dos "sí" [IDDD cap. 1].

## Hallazgos principales

| # | Hallazgo | Evidencia | Severidad |
|---|---|---|---|
| 1 | Confirmación de pedido y descuento de stock en la misma transacción que la factura; bloqueos en campañas | `services/OrderService.ts:812` | Crítica |
| 2 | "Product" significa ficha de catálogo, existencia de almacén y concepto facturable a la vez | `prisma/schema.prisma`, 41 campos | Alta |
| 3 | Reglas de promociones repartidas entre 3 routers y `OrderService` | `routes/cart.ts:40`, `routes/orders.ts:118` | Alta |
| 4 | Importes en `number` con redondeos distintos en checkout y factura | 24 apariciones | Media |

## Plan

* **Fase 0 (2 semanas):** tests de caracterización del checkout y la facturación; mapa de contexto actual.
* **Fase 1 (4 semanas):** contexto nuevo de Ventas con `Order`, `Money` y promociones, detrás de una ACL sobre las tablas actuales de producto; el router de checkout usa el contexto nuevo.
* **Fase 2 (3 semanas):** separar la reserva de stock en una política por eventos con outbox; la factura reacciona a `OrderConfirmed`.
* **Deuda aceptada:** facturación sigue en el monolito (subdominio genérico, candidato a sustituir por el ERP).
