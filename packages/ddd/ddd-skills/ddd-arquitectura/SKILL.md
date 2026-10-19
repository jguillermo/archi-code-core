# Arquitectura de un Bounded Context

> Guía de la suite DDD de @archi-code/ddd: se lee solo a través del skill `archi-code-ddd` (packages/ddd/SKILL.md), nunca como skill independiente.

**Cuándo usarla.** Úsala siempre que haya que crear o reorganizar la estructura de un proyecto o servicio con DDD, decidir dónde va un fichero o una clase, separar dominio de framework u ORM, montar la inyección de dependencias, configurar límites entre módulos, o cuando el dominio importe Express, Prisma, TypeORM o similares, aunque no se diga "arquitectura hexagonal".

La arquitectura existe para proteger el modelo de dominio. El modelo debe estar libre de tecnología; por eso, por ejemplo, las transacciones las gestionan los servicios de aplicación y no el dominio [Destilado cap. 2]. Y ningún estilo arquitectónico es una colección de herramientas para usar en todas partes: se aplica donde mitiga un riesgo concreto [IDDD cap. 4].

## Convenciones de la suite DDD

* **Trazabilidad.** Cada regla indica su origen: `[Destilado cap. N]`, `[IDDD cap. N]`, `[PHP: capítulo]`. Lo que no sale de esos libros va marcado `[Fuera de los libros]`. Respeta estas marcas al responder.
* **Idioma.** Responde en el idioma de la persona. El código de ejemplo es TypeScript.
* **Honestidad del modelo.** Si faltan datos para decidir, declara los supuestos.

## La arquitectura por defecto: hexagonal

Recomendación de esta suite para cualquier contexto con modelo de dominio: **puertos y adaptadores** con inversión de dependencias. Motivos:

* Con capas tradicionales, la infraestructura queda debajo del dominio y implementar repositorios obliga a romper las reglas o a hacer apaños [IDDD cap. 4].
* Con DIP, módulos de alto y bajo nivel dependen de abstracciones; la infraestructura implementa interfaces definidas por las capas interiores [IDDD cap. 4].
* Hexagonal da simetría: cada cliente o mecanismo de salida tiene su adaptador, y todos llegan al interior por la misma API de aplicación [IDDD cap. 4].
* Muchos equipos que dicen usar capas usan en realidad hexagonal gracias a la inyección de dependencias [IDDD cap. 4].
* *DDD in PHP* la adopta como arquitectura base de sus ejemplos [PHP: Modules; PHP: Appendix Hexagonal].

### Las cuatro zonas y la regla de dependencia

```
interfaces (adaptadores de entrada) ─┐
                                     ├──▶ application ──▶ domain
infrastructure (adaptadores salida) ─┘                     ▲
         └──────────── implementa interfaces de ───────────┘
```

| Zona | Contiene | Puede depender de | Nunca |
|---|---|---|---|
| `domain` | Agregados, entidades, value objects, eventos de dominio, servicios de dominio, **interfaces** de repositorio y de servicios externos | Nada externo (solo la librería estándar). `[Fuera de los libros: convención de @archi-code/ddd]` con el paquete, además `@archi-code/ddd/domain`, `@archi-code/ddd/exceptions` y `@archi-code/validation` | Framework web, ORM, cliente HTTP, `process.env`, logger |
| `application` | Servicios de aplicación (casos de uso), comandos y consultas, DTOs, puertos de salida no de dominio (correo, reloj si se quiere) | `domain` | Express/Fastify, SQL, detalles de mensajería |
| `infrastructure` | Repositorios concretos, ACL, publicador de eventos, clientes HTTP, mensajería | `domain`, `application` | Lógica de negocio |
| `interfaces` | Controladores REST, consumidores de mensajes, CLI, resolvers GraphQL | `application` (y tipos de `domain` solo si es imprescindible) | Lógica de negocio, acceso directo a repositorios |

Responsabilidades de los servicios de aplicación según IDDD: sin lógica de dominio, controlan transacciones y seguridad, pueden enviar notificaciones; son clientes directos del modelo y deben ser **finos**. Si crecen, la lógica de dominio se está escapando y el modelo se vuelve anémico [IDDD cap. 4]. Detalle en `ddd-servicios-capa-aplicacion`.

En la interfaz se valida formato (campo obligatorio, longitud), no conocimiento profundo del negocio, que se queda en el modelo [IDDD cap. 4].

## Flujo de trabajo

1. **Decide si el contexto merece modelo de dominio.** Si es un subdominio genérico o de soporte sin reglas, un CRUD sencillo y bien encapsulado es legítimo (ver `ddd-subdominios-bounded-contexts`). La estructura hexagonal sigue siendo útil, pero sin agregados artificiales.
2. **Crea la estructura de carpetas** con `references/estructura-hexagonal-ts.md`. Si el proyecto ya fija una carpeta raíz para el código (por ejemplo `src/app/`), usa la variante descrita allí.
3. **Nombra los módulos** con el lenguaje ubicuo, nunca por tipo de patrón (`entities/`, `services/`, `valueobjects/`). Guía en `references/modulos.md`.
4. **Monta el composition root**: un único punto donde se instancian adaptadores y se inyectan en los casos de uso. Sin contenedor mágico salvo necesidad.
5. **Automatiza las reglas de dependencia** con `assets/dependency-cruiser.cjs`. Una regla que no se comprueba en CI acaba violándose `[Fuera de los libros]`.
6. **Decide los estilos adicionales** (CQRS, eventos, Event Sourcing) con `references/estilos-adicionales.md`. Por defecto, ninguno.

## REST sin exponer el modelo

Exponer el modelo directamente por REST produce interfaces frágiles: cada cambio del modelo rompe a los clientes. IDDD prefiere separar el modelo de la interfaz: recursos diseñados por casos de uso, construidos a partir de uno o varios agregados [IDDD cap. 4]. En TypeScript: el controlador recibe un DTO, llama al caso de uso, y el caso de uso devuelve un DTO o un read model, nunca el agregado.

## Señales de alarma

* `import` de `express`, `@prisma/client`, `typeorm`, `axios`, `pg`, `kafkajs` o similares dentro de `domain/`.
* Decoradores de ORM (`@Entity`, `@Column`) en clases de dominio. Mezclan el modelo con la persistencia.
* Carpetas `domain/entities`, `domain/services`, `domain/valueobjects`: módulos por tipo de patrón [PHP: Modules].
* Controladores que llaman a repositorios o contienen `if` de negocio.
* Servicios de aplicación de cientos de líneas [IDDD cap. 4].
* Un único `utils/` o `common/` compartido entre contextos con lógica de negocio.
* CQRS o Event Sourcing "porque es la arquitectura moderna", sin un riesgo concreto que mitiguen [IDDD cap. 4].
* Un contexto nuevo creado para separar algo que bastaba con un módulo [IDDD cap. 9].

## Siguiente skill

* Diseñar lo que va dentro de `domain/` → `ddd-value-objects-entidades` y `ddd-agregados`.
* Implementar repositorios en `infrastructure/` → `ddd-repositorios-persistencia`.
* Casos de uso en `application/` → `ddd-servicios-capa-aplicacion`.
* CQRS y Event Sourcing en profundidad → `ddd-event-sourcing-cqrs`.
