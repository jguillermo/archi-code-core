# Planificar el modelado en un proyecto ágil

Todo procede de [Destilado cap. 7] salvo indicación. Vernon usa vocabulario de Scrum pero lo aplica igual a Kanban: "sprint" equivale a iteración o a la cola de trabajo en curso (WIP).

## Lo primero: las personas

El factor que más pesa para triunfar con DDD es tener buenos profesionales, sobre todo desarrolladores. DDD es avanzado y exige práctica incluso a gente muy buena. No hay técnica que lo sustituya.

## Análisis DOFA del proyecto

Debilidades, Oportunidades, Fortalezas y Amenazas (SWOT en inglés). Sirve para ver rápido dónde está el proyecto y, en particular, el modelo de dominio.

1. Dibuja una matriz de cuatro cuadrantes.
2. Un color de nota por cuadrante.
3. Identifica cada elemento y colócalo.
4. Decide acciones para potenciar lo bueno y mitigar lo malo, y llévalas al tablero de tareas.

Se puede repetir en cualquier momento del proyecto.

## Modeling spikes

Investigar el modelo al inicio es casi inevitable: hay que "comprar" conocimiento. Event Storming y los experimentos que lo acompañan forman un modeling spike y abaratan mucho esa compra.

No esperes un modelo perfecto, ni siquiera con Event Storming. El negocio y lo que sabes de él cambian, y el modelo con ellos.

## Deuda de modelo

Si las tareas de modelado tienen tiempo acotado, habrá deuda de modelo en cada iteración: a veces descubrirás que un diseño no encaja tan bien como esperabas y no habrá tiempo de rehacerlo.

Lo peor es ignorarlo. Lo correcto:
1. Anotar el cambio necesario.
2. Llevarlo a la retrospectiva.
3. Convertirlo en tarea de la siguiente planificación.

En Kanban puede haber retrospectivas diarias: no esperes.

Formato de registro `[Fuera de los libros]`:

```markdown
| Fecha | Contexto | Qué no encaja | Por qué se aceptó | Riesgo si no se paga | Tarea |
|---|---|---|---|---|---|
| 15/10/2026 | Ventas | Pedido incluye datos de envío que son de Almacén | Timebox del sprint 12 | Cambios de logística obligan a tocar Ventas | VEN-231 |
```

## Estimación por componentes

Los eventos, comandos y agregados que salen del Event Storming sirven como unidades de estimación. Método:

1. Tabla con una columna de tipo de componente y tres de dificultad: fácil, moderada, compleja.
2. Una fila por tipo de artefacto que se cree en el código: evento, comando, agregado, y también componentes de interfaz, servicios, persistencia, serializadores, etc. Si un artefacto siempre se crea junto a otro (un evento con su serializador), estímalos juntos.
3. Horas o fracciones de hora por celda, incluyendo diseño y pruebas.
4. Por cada elemento de trabajo, cuenta los componentes y su dificultad. Una hoja de cálculo es lo más práctico.
5. Suma: es la estimación de la iteración.
6. Ajusta los valores con lo real al final de cada iteración.

Valores de ejemplo del libro, solo para arrancar y calibrar: evento y comando 0,1 / 0,2 / 0,3 h; agregado 1 / 2 / 3 h. Calibra con tus datos desde la primera iteración.

Vernon cuenta un caso en el que esta estimación técnica quedó muy cerca de la de un equipo de consultores en un proyecto grande, y sostiene una precisión en torno al 20 % a largo plazo, mayor a corto plazo. Tómalo como su experiencia, no como garantía.

Sobre las tareas: no las partas tanto que el tablero se vuelva inmanejable. A menudo conviene agrupar todos los comandos y eventos de un agregado en una sola tarea.

## Timeboxed modeling

Event Storming no siempre da todo el conocimiento necesario para un escenario concreto. Si falta, incluye en la estimación el tiempo de adquirirlo. Ciclo:

1. Event Storming rápido, alrededor de una hora.
2. Con un experto, analiza y refina uno o varios escenarios concretos.
3. Escribe tests de aceptación o especificaciones para cada escenario.
4. Crea los componentes que hacen que pasen, en iteraciones cortas, hasta que hagan lo que espera el experto.
5. Probablemente surjan escenarios nuevos; repite.

Para cuando se alcance el objetivo de negocio o se acabe el tiempo. Si se acaba el tiempo sin terminar, registra deuda de modelo.

## Tiempo con los expertos del dominio

Conseguir su tiempo es uno de los grandes retos. Haz que sea útil, breve y agradable, o los perderás cuando más falta hagan.

| Actividad | Cuánto pedir |
|---|---|
| Event Storming | Sesiones de 2 a 3 horas, posiblemente 3 o 4 días seguidos. Siempre con expertos |
| Análisis y refinamiento de escenarios | Lo necesario, en ciclos de discusión de 10 a 20 minutos |
| Revisión de tests | Tiempo aparte; no esperes que se sienten a mirar cómo se programa. Cada test se debe poder revisar en 1 o 2 minutos |
| Refinar nombres de agregados, comandos y eventos | Breve; la mayoría de dudas debería haberse resuelto en el Event Storming |

## Otras técnicas compatibles

Vernon sugiere tres que encajan con DDD por tener poca ceremonia: especificaciones ejecutables (sin dejar que dominen el proyecto), Impact Mapping de Gojko Adzic para comprobar que se trabaja en el Core Domain, y User Story Mapping de Jeff Patton para decidir en qué funciones invertir.
