# Ejemplo completo: tienda online

Ejemplo de referencia para la calidad del entregable. Es un caso inventado y se ha hecho en **modo B** (descubrimiento asistido a partir de una descripción), por eso todo está `por validar` y termina con preguntas para expertos. Las decisiones que no salen de los libros se señalan.

---

# Descubrimiento: venta online de menaje
Modo: B    Estado: hipótesis

## 1. Objetivo de negocio y por qué DDD

La empresa vende menaje de cocina online. Quiere reducir pedidos cancelados por falta de stock tras el pago y poder vender con preventa. Las reglas de reserva de stock y de pago cambian por campaña y generan conflictos entre Ventas y Almacén. Hay complejidad de negocio real en el ciclo del pedido; el catálogo y el registro de clientes son sencillos.

## 2. Personas y expertos por función

| Función | Experto | Para qué |
|---|---|---|
| Ventas online | Responsable de e-commerce | Ciclo del pedido, promociones, preventa |
| Almacén | Jefe de logística | Reserva, preparación y envío |
| Finanzas | Responsable de cobros | Autorización, captura y devolución de pagos |
| Atención al cliente | Coordinadora de soporte | Cancelaciones y reclamaciones |

El Product Owner del proyecto no aparece como experto: conoce el backlog, no las reglas de reserva.

## 3. Línea temporal de eventos

| # | Actor | Comando | Agregado | Evento | Política / proceso | Hotspot | Contexto candidato | Estado |
|---|---|---|---|---|---|---|---|---|
| 1 | Cliente | AñadirAlCarrito | Carrito | ArtículoAñadidoAlCarrito | | ¿Se reserva stock aquí? | Ventas | por validar |
| 2 | Cliente | RealizarPedido | Pedido | PedidoRealizado | Al realizar pedido, solicitar reserva y autorización de pago | | Ventas | por validar |
| 3a | (política) | ReservarStock | ExistenciaDeArtículo | StockReservado | | ¿Reserva parcial permitida? | Almacén | por validar |
| 3b | (política) | AutorizarPago | Pago | PagoAutorizado | | ¿Cuánto dura la autorización? | Pagos | por validar |
| 3c | (externo: pasarela) | | Pago | PagoRechazado | Al rechazarse, cancelar pedido y liberar reserva | | Pagos | por validar |
| 4 | (política) | ConfirmarPedido | Pedido | PedidoConfirmado | Cuando hay stock reservado y pago autorizado | Si llega uno sin el otro, ¿cuánto se espera? | Ventas | por validar |
| 5 | Operario | PrepararExpedición | Expedición | ExpediciónPreparada | | En Almacén nadie dice "pedido": dicen "expedición" | Almacén | por validar |
| 6 | (política) | CapturarPago | Pago | PagoCapturado | Al enviar, capturar el cobro | ¿Se cobra al preparar o al enviar? | Pagos | por validar |
| 7 | Transportista | | Expedición | ExpediciónEnviada | | | Almacén | por validar |
| 8 | (tiempo) | | Pedido | PlazoDePagoVencido | Cancelar pedido y liberar reserva | | Ventas | por validar |
| 9 | Cliente | CancelarPedido | Pedido | PedidoCancelado | Liberar reserva; anular o devolver pago | ¿Se puede cancelar tras preparar? | Ventas | por validar |

El registro de clientes se ha dejado en un único evento `ClienteRegistrado` y no se detalla: es genérico [Destilado cap. 7].

## 4. Hotspots abiertos

| Pregunta | A quién | Impacto si se responde mal |
|---|---|---|
| ¿Se reserva stock al añadir al carrito o al realizar el pedido? | Ventas y Almacén juntos | Stock bloqueado por carritos abandonados o ventas sin stock |
| ¿Se admite reserva parcial? | Almacén | Cambia si el pedido puede dividirse en varias expediciones |
| ¿Cuánto vive una autorización de pago? | Finanzas | Pedidos confirmados que no se pueden cobrar |
| Si llega el pago pero no la reserva, ¿cuánto se espera antes de cancelar? | Ventas | Define la política del paso 4 y su plazo |
| ¿Hasta cuándo se puede cancelar? | Atención al cliente y Almacén | Expediciones preparadas que hay que deshacer |

## 5. Desafiar y unificar

| Concepto | Decisión | Motivo |
|---|---|---|
| Pedido, Línea de pedido, Carrito | En contexto (Ventas) | Núcleo del ciclo de venta |
| Expedición, Bulto | Fuera de contexto (Almacén) | Almacén no habla de pedidos; tiene su propio lenguaje |
| Pago, Autorización, Captura | Fuera de contexto (Pagos) | Lenguaje financiero distinto |
| Usuario, Rol, Contraseña | Fuera de contexto (Identidad) | Genérico. En Ventas se habla de **Cliente** |
| Preventa | En contexto, fuera de alcance | Es del núcleo pero se aborda en la segunda iteración |
| Producto (ficha, fotos, descripción) | Fuera de contexto (Catálogo) | En Ventas solo importan referencia, nombre y precio en el momento de la venta |

Dos sustituciones de lenguaje: `Usuario` pasa a ser `Cliente` en Ventas; `Pedido` pasa a ser `Expedición` en Almacén.

## 6. Contextos y subdominios candidatos

Propuesta para trabajar en `ddd-skills/ddd-subdominios-bounded-contexts/GUIA.md`, no una decisión:

* **Ventas**: candidato a Core Domain (la diferenciación está en preventa y en no vender sin stock).
* **Almacén**: supporting.
* **Pagos**: probablemente generic, resuelto con pasarela externa.
* **Catálogo**: supporting.
* **Identidad**: generic.

## 7. Agregados candidatos

Solo nombres, comandos y eventos. Límites, invariantes y tamaño se deciden en `ddd-skills/ddd-agregados/GUIA.md`.

| Agregado | Comandos | Eventos |
|---|---|---|
| Carrito | AñadirAlCarrito, QuitarDelCarrito | ArtículoAñadidoAlCarrito |
| Pedido | RealizarPedido, ConfirmarPedido, CancelarPedido | PedidoRealizado, PedidoConfirmado, PedidoCancelado, PlazoDePagoVencido |
| ExistenciaDeArtículo | ReservarStock, LiberarReserva | StockReservado, ReservaLiberada |
| Pago | AutorizarPago, CapturarPago | PagoAutorizado, PagoRechazado, PagoCapturado |
| Expedición | PrepararExpedición | ExpediciónPreparada, ExpediciónEnviada |

Observación para la siguiente fase: el paso 4 necesita información de tres agregados de tres contextos. Eso no puede ser una transacción. Apunta a una política reaccionando a eventos con consistencia eventual [Destilado cap. 5].

## 8. Glosario de Ventas (extracto)

Idioma del código en este contexto: inglés, con tabla de traducción `[decisión del equipo]`.

| Término | Definición | En código | Términos descartados |
|---|---|---|---|
| Pedido | Compromiso de compra de un cliente sobre unas líneas con precio cerrado | `Order` | "Venta" (Finanzas la usa para el cobro) |
| Realizar pedido | El cliente convierte su carrito en pedido; el precio queda fijado | `Order.place()` | "Crear pedido" (no dice que fija precio) |
| Confirmar pedido | El pedido tiene pago autorizado y stock reservado; deja de admitir cambios | `Order.confirm()` | "Validar" (ambiguo) |
| Cliente | Persona que compra. No confundir con usuario de la web | `Customer` | "Usuario", "Comprador" |
| Línea de pedido | Referencia, cantidad y precio unitario en el momento de realizar el pedido | `OrderLine` | "Item" |

## 9. Escenario clave

Refinado con las preguntas de quién, qué condiciones y quién se entera.

Versión 1: "Cuando el cliente paga, el pedido se confirma."

Versión 2, tras preguntar qué tiene que ser cierto antes: "El pedido se confirma cuando tiene el pago autorizado **y** el stock reservado."

Versión 3, tras preguntar quién se entera: "... Al confirmarse, deja de admitir cambios en sus líneas y Almacén recibe el aviso para preparar la expedición. Pagos no captura el cobro hasta que la expedición sale."

```gherkin
Escenario: se confirma un pedido con pago autorizado y stock reservado
  Dado el pedido de Laura Gómez con 2 tazas TAZA-350 a 8,50 €
  Y su stock reservado
  Y su pago autorizado por 17,00 €
  Cuando se confirma el pedido
  Entonces el pedido queda confirmado y no admite cambios en sus líneas
  Y se registra el evento PedidoConfirmado
```

El test correspondiente en TypeScript está en `ddd-skills/ddd-descubrimiento-dominio/references/escenarios-y-especificaciones.md`.

## 10. Siguientes pasos y deuda de modelo

* Sesión de 2 h con Ventas y Almacén juntos para los dos primeros hotspots.
* Validar el glosario de Ventas con la responsable de e-commerce.
* Pasar a `ddd-skills/ddd-subdominios-bounded-contexts/GUIA.md` con los contextos candidatos.
* Deuda anotada: el `Carrito` podría no ser un agregado de Ventas sino algo de sesión sin reglas de negocio. Revisar tras resolver el primer hotspot.
