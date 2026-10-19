# Estilos adicionales: cuándo sí y cuándo no

Ninguno es obligatorio. Úsalos cuando mitiguen un riesgo con alta probabilidad de causar fallo si se ignora [IDDD cap. 4]. Destilado los presenta como combinables con puertos y adaptadores según las necesidades [Destilado cap. 2].

## CQRS

**Problema que resuelve:** las pantallas cruzan muchos agregados y consultarlas desde repositorios obliga a juntar varios agregados en DTOs, a crear buscadores especiales o a empobrecer la interfaz para que siga los límites de los agregados [IDDD cap. 4].

**Cómo es:** un modelo de comandos (los agregados, que ejecutan comportamiento) y un modelo de consultas (vistas desnormalizadas) actualizado por suscriptores a eventos [IDDD cap. 4].

**Cuándo no:** si la interfaz no es compleja ni cruza a menudo varios agregados en una vista, CQRS añade complejidad accidental [IDDD cap. 4].

**Paso intermedio** `[Fuera de los libros]`: consultas de lectura que van directas a la base de datos con SQL o vistas, sin pasar por repositorios ni agregados, en la misma base. Ya separa lectura y escritura sin eventos ni consistencia eventual. Suele bastar.

**Si el modelo de consultas es eventualmente consistente**, la interfaz debe asumir lo peor. Opciones de IDDD: mostrar temporalmente los datos enviados en el comando; mostrar la fecha y hora de los datos para que el usuario sepa su antigüedad (técnica con defensores y detractores, a validar con usuarios); notificaciones push; o simplemente avisar de que la petición se procesará [IDDD cap. 4].

Más detalle en `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md`.

## Arquitectura dirigida por eventos

Contextos que se comunican publicando y consumiendo eventos de dominio. Es la base de la integración robusta descrita en `ddd-skills/ddd-context-mapping/GUIA.md` y del diseño de `ddd-skills/ddd-eventos-dominio/GUIA.md`. Dentro de un contexto, los eventos también desacoplan efectos secundarios del caso de uso.

## Event Sourcing

El estado de un agregado se guarda como la secuencia de sus eventos y se reconstruye aplicándolos [Destilado cap. 6; IDDD cap. 4]. Aporta historial completo y auditoría, pero cambia por completo la persistencia y las consultas. Ver `ddd-skills/ddd-event-sourcing-cqrs/GUIA.md` antes de decidir.

## Tabla de decisión

| Situación | Recomendación |
|---|---|
| Pantallas simples que siguen a un agregado | Solo hexagonal |
| Listados y búsquedas que cruzan agregados | Consultas SQL directas de solo lectura |
| Vistas muy distintas del modelo, alto volumen de lectura, otra base para leer | CQRS con read models por eventos |
| Requisito legal o de negocio de historial completo de cambios del agregado | Valorar Event Sourcing en ese agregado |
| Integración entre contextos | Eventos de dominio y mensajería |
