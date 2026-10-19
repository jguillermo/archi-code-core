# Chuleta de reglas DDD

## Estratégico
* Un Bounded Context es una frontera lingüística; un lenguaje ubicuo por contexto [IDDD cap. 2; Destilado cap. 2].
* El lenguaje lo construye el equipo (expertos y desarrolladores) y vive en el código [IDDD cap. 1].
* Un equipo por contexto; varios equipos en un contexto rompen el lenguaje [Destilado cap. 2; IDDD cap. 2].
* Objetivo: un subdominio por contexto [Destilado cap. 3].
* Core Domain: máxima inversión; genéricos: comprar o subcontratar [Destilado cap. 3].
* No partir contextos por tecnología ni por reparto de tareas; usar módulos [IDDD cap. 2 y cap. 9].
* Mapear el presente antes que el futuro [IDDD cap. 3].
* Destilar el núcleo: Domain Vision Statement y, si se enreda, Segregated Core [IDDD cap. 2; Evans fuera de los libros].
* ACL frente a sistemas heredados y externos; no hablar su lenguaje [Destilado cap. 4].
* Consumidores dependen del esquema publicado, no de clases del productor [Destilado cap. 4; IDDD cap. 13].
* Mensajería: al menos una vez + receptor idempotente [Destilado cap. 4].
* Nada de cadenas de peticiones síncronas bloqueantes entre contextos [Destilado cap. 4].

## Arquitectura
* Dominio libre de tecnología; transacciones en la capa de aplicación [Destilado cap. 2; IDDD cap. 12].
* Hexagonal con inversión de dependencias [IDDD cap. 4].
* Servicios de aplicación finos [IDDD cap. 4 y cap. 14].
* No exponer el modelo directamente por REST [IDDD cap. 4].
* Módulos con nombres del lenguaje, no de patrones [IDDD cap. 9; PHP: Modules].
* CQRS y Event Sourcing solo para mitigar riesgos concretos [IDDD cap. 4].

## Táctico
* Preferir value objects; inmutables, igualdad por valor, sin efectos secundarios [IDDD cap. 6].
* Entidades: identidad estable, comportamiento con nombres del negocio, sin setters públicos [IDDD cap. 5].
* Identidad temprana si hay eventos de creación [IDDD cap. 5].
* El modelo de datos se subordina al de dominio [IDDD cap. 6].
* Agregados: invariantes reales dentro, pequeños, referencias por identidad, consistencia eventual fuera [Destilado cap. 5; IDDD cap. 10].
* Una transacción, un agregado [Destilado cap. 5; IDDD cap. 10].
* Plazos de consistencia los decide negocio [Destilado cap. 5].
* "¿De quién es el trabajo?" para desempatar [IDDD cap. 10].
* No inyectar repositorios en agregados [IDDD cap. 10].
* Eventos en pasado, con lo necesario, sin estado completo [Destilado cap. 6].
* Agregado y evento en la misma transacción; publicar después [Destilado cap. 6; IDDD cap. 8].
* Un repositorio por agregado; no es un DAO [IDDD cap. 12].
* Servicio de dominio solo si la operación no encaja en una entidad o valor; sin estado [IDDD cap. 7].
* Métodos que revelan intención; funciones sin efectos secundarios [IDDD cap. 5 y cap. 6].
* Reglas con nombre del negocio que se combinan: Specification [IDDD cap. 5; PHP: Repositories].
* Un hecho de otro contexto no se rechaza: el agregado lo registra y, si no encaja, emite un evento para compensar [Destilado cap. 6].
