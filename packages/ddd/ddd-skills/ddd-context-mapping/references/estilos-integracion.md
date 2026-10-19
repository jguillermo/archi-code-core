# Estilos de integración

## Comparativa

| Estilo | Acoplamiento temporal | Robustez | Cuándo |
|---|---|---|---|
| RPC (SOAP, gRPC, HTTP con procedimientos) | Alto: si el otro cae, fallas | Baja. Parece una llamada local y no lo es [Destilado cap. 4] | Consultas rápidas a servicios muy disponibles; siempre con ACL |
| REST | Alto en peticiones directas | Media. Se apoya en la fiabilidad probada de la web [Destilado cap. 4] | OHS para varios consumidores; consultas de detalle (query-back) |
| Mensajería con eventos | Bajo | La más robusta: elimina gran parte del acoplamiento temporal y obliga a diseñar contando con latencia [Destilado cap. 4] | Notificar hechos, coordinar procesos entre contextos |
| Base de datos o ficheros compartidos | Estructural | Pésima. Evitar [Destilado cap. 4; IDDD cap. 13] | Solo heredados sin alternativa, con ACL |

## Principios de la computación distribuida

IDDD los formula como principios, no como falacias, para subrayar que hay que diseñar contando con ellos [IDDD cap. 13]: la red no es fiable; siempre hay latencia; el ancho de banda no es infinito; la red no es segura; la topología cambia; el conocimiento y las políticas están repartidos entre varios administradores; el transporte tiene coste; la red es heterogénea.

## REST

* El contexto que ofrece REST debe proporcionar un OHS con Published Language; los recursos son el idioma publicado [Destilado cap. 4].
* Recursos **sintéticos**: con la forma que necesita el caso de uso del cliente, no la del agregado. Reflejar los agregados fuerza a todos los clientes a ser Conformist ante cualquier cambio del modelo [Destilado cap. 4].
* Para reducir la dependencia temporal aunque solo haya REST: llama al sistema remoto desde un temporizador o al recibir un mensaje propio, con reintentos y espera creciente, en lugar de hacerlo dentro de la petición del usuario [IDDD cap. 13].

### REST asíncrono (notification log)

Publicar los eventos de dominio como un feed de recursos (al estilo Atom) que los clientes sondean periódicamente. Si el servicio no está disponible, el cliente reintenta más tarde [Destilado cap. 4]. IDDD lo implementa con un log de notificaciones actual y logs archivados navegables; cada cliente es responsable de no consumir duplicados [IDDD cap. 3 y cap. 13].

## Mensajería

* El contexto suscrito reacciona a eventos de dominio publicados por otros, y eso suele crear o modificar un agregado propio [Destilado cap. 4].
* Si el cliente necesita forzar una acción, envía un **mensaje de comando** y recibe el resultado como un evento publicado [Destilado cap. 4].
* **Entrega al menos una vez** en el mecanismo y **receptor idempotente** en el consumidor: deduplicar o reaplicar con el mismo resultado [Destilado cap. 4].
* Las peticiones no deben bloquearse esperando respuesta; siempre habrá algo de latencia y hay que planificarla [Destilado cap. 4].

### Publicar de forma fiable

`[Fuera de los libros como nombre; la idea de guardar eventos en la misma transacción está en IDDD cap. 8]`. Patrón **outbox transaccional**: en la misma transacción que guarda el agregado, se guardan sus eventos en una tabla; un proceso aparte los lee y los publica en el bus, marcándolos como enviados. Evita perder eventos si el bus falla tras confirmar la transacción, o publicar eventos de cambios que luego se revierten. Se desarrolla en `ddd-skills/ddd-eventos-dominio/GUIA.md`.

### Receptor idempotente en TypeScript

```ts
export class StockReservedHandler {
  constructor(
    private readonly processed: ProcessedMessageStore,
    private readonly confirmOrder: ConfirmOrderWhenReady,
  ) {}

  async handle(message: IncomingMessage): Promise<void> {
    if (await this.processed.contains(message.id)) return; // duplicado: se ignora

    const data = StockReservedV1.parse(message.body);       // valida el Published Language
    await this.confirmOrder.stockReserved({
      orderId: data.orderId,
      reservationId: data.reservationId,
    });
    await this.processed.add(message.id);
  }
}
```

Para que sea seguro, `add` y el cambio del agregado deben ir en la misma transacción, o la operación debe ser idempotente por naturaleza (aplicar dos veces "reserva registrada" no cambia nada la segunda vez) `[Fuera de los libros]`.

## Contratos y versionado

* Dos opciones para intercambiar estructuras: distribuir clases e interfaces a todos los sistemas (tipado fuerte, pero recompilaciones y riesgo de usar objetos ajenos como propios) o un contrato basado en estándar, un media type propio que es un Published Language [IDDD cap. 13].
* Con contrato, el consumidor solo lee datos; no tiene acceso a comportamiento del otro modelo, y IDDD lo ve como protección, no como carencia. Los cálculos los hace el productor y los envía como atributos del evento [IDDD cap. 13].
* Los eventos y notificaciones llevan versión. Si se diseñan con cuidado, muchos consumidores pueden leer cualquier versión como si fuera la 1 y no necesitan cambiar [IDDD cap. 13].
* Los value objects estables (identificadores) se pueden incluir en el evento; quedan congelados en la estructura [IDDD cap. 13]. Con el paquete, el payload lleva solo primitivos tomados de los value objects (`orderId: string`), también los identificadores `[Fuera de los libros: convención de @archi-code/ddd]`.

Envoltorio recomendado, basado en la notificación de IDDD:

```json
{
  "notificationId": 1842,
  "typeName": "sales.order.OrderConfirmed",
  "version": 1,
  "occurredOn": "2026-10-18T10:15:00Z",
  "event": { "orderId": "ord-7f3a", "customerId": "cus-91", "total": { "amount": "17.00", "currency": "EUR" } }
}
```

Esquema validado en el adaptador consumidor con Zod `[Fuera de los libros: elección de librería]`:

```ts
import { z } from 'zod';

export const OrderConfirmedV1 = z.object({
  orderId: z.string(),
  customerId: z.string(),
  total: z.object({ amount: z.string(), currency: z.literal('EUR') }),
});
```

## Evento enriquecido o consulta al origen

| | Evento enriquecido | Evento ligero + query-back |
|---|---|---|
| Autonomía del consumidor | Alta | Depende de que el origen responda |
| Previsión de necesidades | Difícil acertar con todo | No hace falta |
| Seguridad | Riesgo de exponer datos de más | El origen controla el acceso en cada consulta |

Hay casos que piden una mezcla [Destilado cap. 4]. En el ejemplo del libro, `PolicyIssued` lleva el identificador de la póliza; el consumidor lo guarda como `issuedPolicyId` para trazabilidad y consulta al origen con `GET` si necesita más [Destilado cap. 4].

Pauta `[Fuera de los libros]`: incluye en el evento lo que el consumidor necesita para decidir y que no cambiará (identificadores, importes cerrados, fechas del hecho); deja fuera datos personales que el consumidor no necesite (minimización de datos) y datos que cambian a menudo.

## Procesos de larga duración

Cuando un proceso implica a varios contextos, se coordina con eventos y un objeto que guarda el estado del proceso, con un rastreador de tiempos para detectar respuestas que no llegan (estados como no completado, completado normalmente o agotado por tiempo) [IDDD cap. 13]. En la práctica actual se llama a esto process manager o saga `[Fuera de los libros como nombres]`. Reglas:

* El estado del proceso es un concepto del dominio con nombre del lenguaje (`ConfirmaciónDePedido`), no un `SagaState` genérico.
* Cada paso tiene un resultado esperado y un plazo.
* Las acciones compensatorias (liberar reserva, anular autorización) son comandos de negocio, no "rollbacks".
* Cuando un recurso remoto aún no existe, modela esa situación como estado. En IDDD, una discusión remota tiene estados de disponibilidad: complemento no contratado, no solicitada, solicitada y lista [IDDD cap. 3].
