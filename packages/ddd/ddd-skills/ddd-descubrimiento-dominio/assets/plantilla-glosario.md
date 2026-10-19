# Glosario del lenguaje ubicuo: <Bounded Context>

Idioma de los identificadores en código: <idioma del negocio | inglés con tabla de traducción>
Expertos que lo validan: <nombres>    Última revisión: <DD/MM/AAAA>

Reglas: un término, un significado dentro de este contexto; un término, un único identificador en código; los verbos del negocio son comportamientos, no setters.

## Conceptos

| Término | Tipo | Definición (en una o dos frases, con palabras del negocio) | En código | Términos descartados y por qué | Estado |
|---|---|---|---|---|---|
| | Concepto / Acción / Evento / Regla | | | | por validar / validado |

Tipos:
* Concepto: algo que el negocio identifica o describe (candidato a entidad o value object).
* Acción: verbo del negocio (candidato a método de un agregado o a comando).
* Evento: algo que ha ocurrido y le importa al negocio (en pasado).
* Regla: condición que siempre debe cumplirse (candidata a invariante).

## Términos que significan otra cosa en otros contextos

| Término | Aquí significa | En <otro contexto> significa |
|---|---|---|
| | | |

## Fuera de contexto (no usar aquí)

| Término | Pertenece a | Cómo se obtiene si hace falta |
|---|---|---|
| | | Integración vía <contexto> (ver ddd-skills/ddd-context-mapping/GUIA.md) |
