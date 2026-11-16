# Persistir value objects

El modelo de datos se subordina al de dominio: claves, integridad referencial e índices no dictan el modelo; la analítica, mejor sobre su propio modelo [IDDD cap. 6]. ¿Entidad "porque tiene tabla"? Si describe, tiene características de valor y no exige identidad → value object [IDDD cap. 6].

| Opción [IDDD cap. 6; PHP: Value Objects] | Cuándo |
|---|---|
| Columnas en la fila del padre | Un valor; por defecto |
| JSON en una columna | Colecciones pequeñas que no se consultan (`jsonb`); cuidado con tamaño y consulta |
| Tabla propia o de unión | Colecciones grandes o consultadas; en el modelo sigue siendo valor |
| Código del enum | Estados |

## Con @archi-code/ddd

`[Fuera de los libros: convención de @archi-code/ddd]` Sin mappers ni decoradores de ORM: el agregado se convierte a sí mismo y el repositorio guarda sus primitivos con la versión al lado. Código: `ddd-skills/archi-code-ddd/repositories.md` y, para la conversión, `ddd-skills/archi-code-ddd/aggregates.md`.

* Los primitivos ya dan la forma: valor simple → su valor, `Composite` → objeto, lista → lista, estado → su opción del enum.
* Un almacén de documentos guarda los primitivos tal cual; con tablas, el repositorio los reparte en columnas en infraestructura, partiendo de `toPrimitives()`.
* Al cargar, cada value object vuelve a validar: un dato corrupto falla al cargar, sin repetir reglas de creación ni registrar eventos. Un test de ida y vuelta del agregado prueba que no se pierde ningún campo.
* Con `pg`, el parámetro `jsonb` se pasa con `JSON.stringify`. Con Prisma o Drizzle el esquema es de infraestructura. Versión y consulta condicionada: `ddd-skills/ddd-repositorios-persistencia/GUIA.md`.
