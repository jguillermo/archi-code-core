# Clasificar subdominios y decidir la inversión

## Qué es un subdominio

Una parte del dominio general del negocio; un área de conocimiento bien definida, con uno o más expertos que la entienden a fondo, responsable de resolver una unidad clave del negocio [Destilado cap. 3]. El dominio completo es demasiado grande para concebirlo como un todo, así que solo importan los subdominios que el proyecto necesita [Destilado cap. 3; IDDD cap. 2].

El espacio del problema de un proyecto es su Core Domain más los subdominios que debe usar, y cambia de un proyecto a otro [IDDD cap. 2].

## Los tres tipos

| Tipo | Definición | Inversión | Quién |
|---|---|---|---|
| Core Domain | Lo que distingue a la organización de la competencia; donde debe ser excelente [Destilado cap. 3; IDDD cap. 2] | Máxima: lenguaje ubicuo cuidado, contexto explícito, experimentación | Los mejores desarrolladores y expertos con conocimiento profundo [IDDD cap. 2] |
| De soporte | Modela algo esencial y algo especializado del negocio, pero que no lo distingue. No hay producto que comprar [Destilado cap. 3; IDDD cap. 2] | Media. Desarrollo a medida sin la inversión del núcleo | Equipo propio o subcontratado [Destilado cap. 3] |
| Genérico | Necesario para la solución pero sin nada especial del negocio [IDDD cap. 2] | Baja. No conviene invertir como en el núcleo [Destilado cap. 3] | Producto comprado, subcontratado o equipo sin perfil de élite [Destilado cap. 3] |

Ser de soporte o genérico no significa ser poco importante: el negocio también depende de ellos, solo que no necesita destacar ahí [IDDD cap. 2].

## Preguntas para clasificar

`[Fuera de los libros: batería propia que operativiza las definiciones anteriores]`

1. Si un competidor tuviera exactamente este software, ¿perderíamos ventaja? Sí → candidato a Core.
2. ¿Existe un producto en el mercado que lo resuelva razonablemente? Sí → genérico, salvo que la forma de hacerlo sea la ventaja.
3. ¿Las reglas son propias de nuestro negocio aunque no nos diferencien? Sí → de soporte.
4. ¿Los expertos discuten con pasión sobre cómo debería funcionar? Es una señal de Core.
5. ¿Cambian las reglas con frecuencia por decisiones estratégicas? Señal de Core.
6. ¿Lo describiríamos en la presentación comercial de la empresa? Señal de Core.

Si todo parece Core, no hay foco. Una organización no puede sobresalir en todo [Destilado cap. 2]. Pide a los expertos que elijan.

## Perspectiva relativa

El tipo depende de quién mira. Un servicio de mapas es el Core Domain de la empresa que lo vende, pero para quien lo consume desde su sistema de inventario es genérico y sustituible [IDDD cap. 2]. Clasifica siempre desde la organización que construye.

## Estrategia por tipo

| Tipo | Patrones tácticos | Pruebas | Arquitectura | Alternativas |
|---|---|---|---|---|
| Core | Completos: agregados, value objects, eventos de dominio, tests de aceptación con expertos | Exhaustivas | Hexagonal; CQRS o Event Sourcing solo si el problema lo pide | Nunca comprar ni subcontratar el núcleo `[Fuera de los libros, coherente con Destilado cap. 3]` |
| De soporte | Los necesarios; a veces basta un modelo sencillo | Proporcionadas | Simple | Subcontratar con contrato claro de integración [Destilado cap. 3] |
| Genérico | Ninguno propio; se integra con anticorrupción | De integración | La del producto | Comprar o usar servicio gestionado |

Una consecuencia práctica `[Fuera de los libros]`: no todo el sistema tiene que estar hecho con DDD táctico. Un subdominio de soporte con reglas pobres puede ser un CRUD bien hecho. Lo que no se negocia en ninguno es el límite: el CRUD vive en su contexto y se integra como cualquier otro.

## Errores frecuentes

* Confundir genérico con Core e invertir donde no diferencia [Destilado cap. 3].
* Clasificar por lo difícil técnicamente. Lo complejo técnicamente no es por eso Core; DDD se usa cuando la complejidad está en el negocio [Destilado cap. 2].
* Clasificar sin expertos [IDDD cap. 2].
* Clasificar una vez y no revisar. Los subdominios cambian con los objetivos del negocio [IDDD cap. 2].
