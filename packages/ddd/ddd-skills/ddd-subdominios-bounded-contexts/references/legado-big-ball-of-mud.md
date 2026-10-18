# Sistemas heredados y Big Ball of Mud

## Qué es

Un sistema en el que varios modelos que debieron diseñarse por separado se fusionaron en un embrollo sin límites explícitos. Suele venir de hacer demasiadas cosas, con demasiadas personas, en el lugar equivocado [Destilado cap. 2 y cap. 3]. Síntomas: lenguaje fragmentado, conceptos que se filtran entre módulos, tests lentos que acaban saltándose, varios equipos trabajando en el mismo sistema [Destilado cap. 2].

## No puedes cambiar el mundo

En una empresa con historia los subdominios no estarán alineados 1:1 con los contextos. No puedes arreglar todo el software mal diseñado; puedes hacer bien tu proyecto e integrarte con lo demás [IDDD cap. 2].

## Técnica: subdominios lógicos

Analiza el sistema heredado como si dentro hubiera varios subdominios, aunque el código no los separe [Destilado cap. 3; IDDD cap. 2]:

1. Dibuja el sistema como un único contexto grande.
2. Marca con líneas discontinuas los subdominios lógicos que conviven dentro (en el ejemplo de Destilado: cuentas, órdenes, catálogo, cumplimiento y despachos).
3. Para cada uno, anota su lenguaje aunque esté implícito en el código.
4. Clasifícalos (Core, soporte, genérico) desde el punto de vista del proyecto actual.
5. Sitúa en el mismo dibujo el nuevo Core Domain y señala de qué subdominios lógicos depende.
6. Decide cuáles importan al proyecto y cuáles se dejan como están.

Un ERP es un buen ejemplo: técnicamente es un contexto, pero sus módulos (inventario, compras) se tratan como subdominios distintos para el análisis [IDDD cap. 2].

## Inventario del código existente

`[Fuera de los libros: procedimiento propio para aplicar la técnica a un repositorio]`

| Señal en el código | Qué suele indicar |
|---|---|
| Clases con muchos campos opcionales usados por grupos distintos de pantallas | Varios modelos fusionados en una entidad |
| Columnas con prefijos por departamento (`billing_`, `shipping_`) | Subdominios lógicos dentro de una tabla |
| Flags de tipo que cambian el comportamiento (`if (order.type === 'B2B')`) | Dos lenguajes en un mismo concepto |
| Servicios `XxxManager` o `XxxHelper` con cientos de métodos | Ausencia de modelo; lógica de varios subdominios |
| Tablas escritas por varios módulos o aplicaciones | Integración por base de datos compartida |

Procedimiento: lista las entidades principales, para cada una agrupa sus campos y métodos según qué parte del negocio los usa, y nombra cada grupo con el lenguaje de esa parte. Cada grupo es un candidato a subdominio lógico.

## Qué hacer después

* Para integrarte con el sistema heredado sin contaminar el nuevo modelo: Anticorruption Layer, en `ddd-context-mapping`.
* Para migrar el sistema por partes: `ddd-auditoria-refactorizacion`.
* No intentes rediseñar todo el sistema heredado a la vez. Empieza por el subdominio lógico que más dolor causa al Core Domain `[Fuera de los libros]`.
