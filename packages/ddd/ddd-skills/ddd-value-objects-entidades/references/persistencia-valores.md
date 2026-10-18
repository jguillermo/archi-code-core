# Persistir value objects sin deformar el modelo

## Principio

El modelo de datos se subordina al de dominio. Claves, integridad referencial e índices no deben dictar cómo se modelan los objetos [IDDD cap. 6]. El informe y la analítica, mejor sobre un modelo de datos propio y no sobre las tablas de producción [IDDD cap. 6].

Antes de convertir un valor en entidad "porque tiene tabla", responde [IDDD cap. 6]:
1. ¿Es una cosa del dominio o mide, cuantifica o describe una cosa?
2. ¿Tiene la mayoría de las características de valor?
3. ¿Lo hago entidad solo porque el modelo de datos lo guarda como entidad?
4. ¿El dominio exige identidad única, me importan los ejemplares y su continuidad de cambio?

"Describe, sí, sí, no" → value object.

## Opciones

| Opción | Cuándo | Notas |
|---|---|---|
| Columnas en la fila del padre | Un único value object (`total_amount`, `total_currency`) | La opción por defecto y la más limpia [IDDD cap. 6] |
| Varios valores serializados en una columna (JSON) | Colecciones pequeñas que no se consultan por dentro | Cuidado con el tamaño de columna y la consulta [IDDD cap. 6]. En PostgreSQL, `jsonb` |
| Tabla propia para una colección | Colecciones grandes o que se consultan | La fila tiene clave técnica, pero en el modelo sigue siendo valor [IDDD cap. 6] |
| Tabla de unión | Colecciones referenciadas | Variante de la anterior [IDDD cap. 6] |
| Estado como enum | Tipos estándar | Guarda el código, no un objeto [IDDD cap. 6] |

*DDD in PHP* resume las mismas alternativas (valor embebido, serialización como LOB y mapeo ad hoc con el ORM) [PHP: Value Objects].

## En TypeScript

`[Fuera de los libros]`
* Mapea en un `Mapper` de infraestructura (`OrderMapper.toRow`, `OrderMapper.toDomain`), no con decoradores en las clases de dominio.
* Con Prisma o Drizzle, el esquema es de infraestructura; el mapper convierte filas en value objects con sus factorías, de modo que un dato corrupto falla al cargar en vez de propagarse.
* Al reconstituir, usa las factorías de los value objects (que validan) y `Entity.reconstitute` (que no repite reglas de creación).
