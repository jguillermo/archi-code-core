# Catálogo de eventos: <Bounded Context>
Mantenido por: <equipo>    Última revisión: <DD/MM/AAAA>

| Evento (pasado) | Agregado | Causa (comando / tiempo / externo) | Datos | Ámbito (interno / publicado vN) | Esquema | Consumidores | Plazo aceptable | Datos personales (sí/no, justificación) |
|---|---|---|---|---|---|---|---|---|

## Política de versionado
* Cambios compatibles: añadir campos opcionales.
* Cambios incompatibles: nueva versión publicada en paralelo durante <periodo>.

## Garantías
* Entrega: al menos una vez. Clave de deduplicación: <eventId / messageId>.
* Orden: <por agregado mediante partición / sin garantía; el consumidor compara versiones>.
