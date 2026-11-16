# Probar repositorios

## Repositorio en memoria

Un mapa id → agregado [IDDD cap. 12] que guarda copias y comprueba versiones para no mentir `[Fuera de los libros]`. Lo escribe el proyecto, uno por agregado, en `infrastructure/persistence/` o `test/support/` `[Fuera de los libros: convención de @archi-code/ddd]`. Código y reglas: `ddd-skills/archi-code-ddd/repositories.md`, apartado Code (`InMemoryOrderRepository`). Lo que esa guía no dice:

* Claves `id.value` (`IdType`/`UuidType` guardan en minúsculas).
* Cada `save`/`remove` es atómico: no hay transacción que abrir ni estado que restaurar en los tests.
* No comprueba que la conversión esté completa: lo prueba el spec del agregado.
* `findAll()` solo si los tests lo necesitan (un repositorio real no lo tiene); como doble de test puede añadir ayudas técnicas, nunca consultas de negocio; ningún caso de uso las ve `[Fuera de los libros: convención de @archi-code/ddd]`.
* No guarda eventos: los tests los leen de `channel.sent` del `InMemoryEventChannel`.

## Suite de contrato compartida

Una suite de contrato por repositorio recibe una fábrica de `OrderRepository` y se ejecuta contra el doble y cada adaptador real `[Fuera de los libros]`. Así el doble no puede apartarse del contrato. Código: `ddd-skills/archi-code-ddd/tests.md`, apartado Code (`orderRepositoryContract`). Además de sus casos, el contrato comprueba que olvida un agregado borrado.

El adaptador real se prueba contra la base de verdad (Testcontainers, `mongodb-memory-server`, IndexedDB del navegador) `[herramienta fuera de los libros]`, con una colección o tabla nueva por fábrica: sin la implementación de producción no sabes si funciona [IDDD cap. 12]. Su atomicidad (varias tablas, outbox) se prueba ahí, no en los tests de la aplicación. El test de ida y vuelta de los primitivos es del agregado (`ddd-skills/ddd-agregados/GUIA.md`).
