# Delimitar Bounded Contexts

## Definición operativa

Un Bounded Context es una frontera explícita dentro de la cual existe un modelo de dominio. Dentro, cada término del lenguaje ubicuo tiene un significado concreto y el modelo lo refleja con exactitud. Es, ante todo, una frontera **lingüística** [IDDD cap. 2].

No es un artefacto concreto: ni un documento, ni un diagrama, ni un JAR o una DLL, aunque estos se usen para desplegarlo [IDDD cap. 2].

## Prueba lingüística

Para cada término importante del glosario, pregunta a cada función del negocio qué significa. Ejemplos de los libros:

* "Póliza" en suscripción, inspecciones y reclamaciones [Destilado cap. 2].
* "Cuenta" en banca frente a "cuenta" en un contexto literario [IDDD cap. 2].
* Dos contextos bancarios (corriente y ahorro) pueden llamar ambos `Account` a su objeto sin añadir prefijos, porque el contexto ya distingue el matiz [IDDD cap. 2].

Regla derivada: no renombres un concepto para diferenciarlo de otro contexto (`SalesOrder`, `WarehouseOrder`). El nombre lo elige el lenguaje del propio contexto. Si dentro de un mismo código necesitas prefijos para no confundirte, probablemente dos contextos comparten modelo.

## Heurísticas para encontrar límites

De Event Storming, los límites suelen aparecer donde hay [Destilado cap. 7]:
* divisiones departamentales;
* personas de negocio con definiciones en conflicto para el mismo concepto;
* conceptos importantes que no son del Core Domain.

Otras señales `[Fuera de los libros]`:
* Un evento en la línea temporal tras el cual "otro equipo se hace cargo".
* Ritmos de cambio distintos: unas reglas cambian cada campaña y otras cada año.
* Diferentes fuentes de verdad para el mismo dato.

## Tamaño

Tan grande como haga falta para expresar el lenguaje completo, con el número de módulos, agregados, eventos y servicios que el diseño requiere, ni más ni menos [IDDD cap. 2].

* Demasiado pequeño: faltan conceptos vitales y aparecen huecos [IDDD cap. 2].
* Demasiado grande: conceptos ajenos al problema enturbian lo esencial [IDDD cap. 2].

Trampas de tamaño [IDDD cap. 2]:
* Dejar que la arquitectura, el framework o el empaquetado decidan las fronteras.
* Partir contextos para repartir trabajo entre desarrolladores. Eso se resuelve con módulos.
* Miniaturizar: varios "contextos" que en realidad son servicios de un mismo lenguaje pueden reducirse a uno con módulos.

## Qué hay dentro de un contexto

No solo el modelo de dominio. También [IDDD cap. 2; Destilado cap. 2]:
* La interfaz de usuario que muestra el modelo y dispara sus comportamientos (sin meter el dominio en la UI).
* Endpoints REST, SOAP o de mensajería, incluido un Open Host Service.
* Los servicios de aplicación (seguridad, transacciones, orquestación de casos de uso).
* El esquema de base de datos, **si lo diseña el equipo** a partir del modelo. Si el esquema lo impone otro equipo o ya existía, ese esquema queda fuera del contexto.

## Equipo, repositorio y base de datos

* Un equipo asignado por contexto; varios equipos en uno producen un lenguaje divergente [Destilado cap. 2; IDDD cap. 2].
* El equipo posee código y base de datos, y define las interfaces oficiales para usar el contexto [Destilado cap. 2].
* Vernon recomienda un repositorio de código por contexto y separar también el esquema [Destilado cap. 2].

Sobre el repositorio `[Fuera de los libros]`: un monorepo es compatible si cada contexto tiene su carpeta raíz, sus dependencias declaradas y una regla automática que impida importar el dominio de otro contexto (en TypeScript, con `eslint-plugin-boundaries`, `dependency-cruiser` o las restricciones de proyecto de Nx). Sin esa regla automática, el monorepo erosiona las fronteras con el tiempo. Cómo encaja con la estructura de proyecto de tu organización se ve en `ddd-arquitectura`.

## Microservicios

* Vernon los trata como esencialmente equivalentes a Bounded Contexts [Destilado cap. 2].
* Si un microservicio modela un único concepto, varios microservicios forman un mismo contexto lingüístico; se despliegan por separado y eso afecta a cómo interactúan, pero el lenguaje es uno [Destilado cap. 2].

Pauta práctica `[Fuera de los libros]`: empieza con un despliegue por contexto. Separa despliegues dentro de un contexto solo por necesidades medibles (escalado, disponibilidad, ritmo de despliegue), nunca para "hacer microservicios".

## Lista de comprobación de un contexto bien trazado

* Tiene nombre de modelo de negocio, no de tecnología.
* Su glosario no contiene términos con dos significados.
* Un único equipo responsable.
* Su código no importa clases de dominio de otros contextos.
* Su esquema de datos no lo escriben otros equipos.
* Se puede explicar qué problema de negocio resuelve en dos frases.
* Hay un experto de referencia identificado.
