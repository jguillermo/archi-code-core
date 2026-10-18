# Destilación del Core Domain

Clasificar subdominios dice **dónde** invertir. La destilación dice **cómo mantener visible y limpio** el núcleo una vez que el código crece. Son patrones de Evans. IDDD aplica y cita algunos (Segregated Core, Responsibility Layers); el resto no está en las fuentes del proyecto y se marca `[Fuera de los libros: Evans, Domain-Driven Design, 2003]`.

Contenido: 1. Domain Vision Statement · 2. Highlighted Core · 3. Generic Subdomains · 4. Cohesive Mechanisms · 5. Segregated Core · 6. Abstract Core · 7. Responsibility Layers · 8. Cuándo aplicar cada uno

## 1. Domain Vision Statement

`[Fuera de los libros: Evans 2003]`

Una página (o menos) que describe el Core Domain y el valor que aporta: qué lo distingue y qué no es núcleo. Se escribe pronto y se revisa cuando cambia la comprensión. Sirve para que equipo, negocio y dirección tomen decisiones con el mismo criterio. Encaja con la primera pregunta de IDDD para el espacio del problema: nombre y visión del Core Domain [IDDD cap. 2].

Plantilla:

```markdown
# Visión del dominio: <Core Domain>

<Nombre> permite a <quién> <hacer qué> mejor que <alternativa>, porque <qué conocimiento o regla diferencial>.

Lo que lo hace diferente:
* <capacidad diferencial 1>
* <capacidad diferencial 2>

Lo que NO es núcleo (se compra, se integra o se hace simple):
* <área genérica o de soporte>

Medimos el éxito por: <indicador de negocio>
```

Ejemplo (tienda online de los ejemplos de la suite):

> El contexto de Ventas permite vender en preventa y en campaña sin romper promesas al cliente: ningún pedido se confirma sin stock reservado y pago autorizado, y la fecha de entrega de una preventa es fiable. Lo diferencial son las reglas de reserva por campaña y la gestión de preventas. No son núcleo: catálogo, cobro (pasarela), facturación (ERP) e identidad. Medimos el éxito por la tasa de pedidos cancelados tras el pago.

Señal de alarma: si la visión describe funcionalidades genéricas ("gestiona usuarios, pedidos y facturas"), no hay foco.

## 2. Highlighted Core

`[Fuera de los libros: Evans 2003]`

Hacer visible qué parte del modelo es el núcleo, para que nadie lo trate como un módulo más. Dos formas:

* **Documento de destilación:** tres a siete páginas como máximo con los elementos esenciales del núcleo y cómo colaboran. No es documentación completa; es un mapa del corazón del modelo.
* **Núcleo marcado en el código:** los módulos del núcleo identificados de forma que el equipo los vea al trabajar.

En TypeScript `[Fuera de los libros]`:
* Un `README.md` en la carpeta del módulo núcleo con la visión y las invariantes principales.
* Revisión obligatoria por la persona responsable del modelo para cambios en esas carpetas (por ejemplo con `CODEOWNERS` en el repositorio).
* Umbral de cobertura de tests más exigente para esas carpetas.

## 3. Generic Subdomains

Ya tratado en `clasificacion-subdominios.md`: lo genérico se separa en módulos o contextos propios para que no ensucie el núcleo, y se compra o se resuelve con un modelo simple [Destilado cap. 3; IDDD cap. 2]. Evans añade una advertencia útil: una solución genérica hecha en casa tiende a crecer hasta convertirse en un proyecto; conviene limitar su alcance `[Fuera de los libros: Evans 2003]`.

## 4. Cohesive Mechanisms

`[Fuera de los libros: Evans 2003]`

Cuando el núcleo necesita un algoritmo o cálculo complejo que no es conocimiento de negocio en sí (resolver un grafo, optimizar rutas, un motor de reglas), se extrae a un mecanismo con una interfaz que revela intención. El núcleo dice **qué** quiere; el mecanismo sabe **cómo**.

```ts
// Núcleo: lenguaje del negocio
export interface DeliveryWindowPlanner {
  earliestFeasibleWindow(order: OrderLines, warehouse: WarehouseId, from: Date): DeliveryWindow;
}
// Mecanismo cohesivo (puede vivir en un módulo aparte o en infraestructura):
// implementa el cálculo con un algoritmo de planificación sin conocer pedidos ni promociones.
```

Diferencia con un servicio de dominio: el servicio expresa una operación del negocio; el mecanismo encapsula una técnica que podría servir a otros dominios.

## 5. Segregated Core

Cuando un contexto grande y crítico tiene lo esencial tapado por mucha funcionalidad de soporte, se reestructura para separar el núcleo de lo que lo apoya, dentro del mismo contexto [IDDD cap. 2, citando a Evans].

Caso de IDDD: el equipo de Colaboración tenía seguridad y permisos mezclados con el modelo. Como paso intermedio movió todas las clases de seguridad a módulos separados y obligó a los servicios de aplicación a resolver seguridad y traducción **antes** de llamar al núcleo. Así el núcleo quedó solo con conceptos de colaboración. Fue el paso previo a extraer un contexto de Identidad y Acceso independiente [IDDD cap. 2].

Procedimiento:
1. Busca exhaustivamente los conceptos que no son del lenguaje del núcleo (ver "Desafiar y unificar" en `ddd-descubrimiento-dominio`).
2. Muévelos a módulos propios dentro del contexto.
3. Haz que los servicios de aplicación resuelvan esos conceptos y pasen al núcleo solo lo que habla su lenguaje (un `Author`, no un `User` con permisos).
4. Si los módulos separados tienen su propio lenguaje y otros los necesitan, extráelos a un contexto propio.

Coste: semanas de trabajo no planificado en el caso de IDDD. Compensa cuando el núcleo se está volviendo frágil por la mezcla [IDDD cap. 2].

## 6. Abstract Core

`[Fuera de los libros: Evans 2003]`

En modelos muy grandes, extraer a un módulo propio las abstracciones e interfaces más fundamentales del núcleo, con las implementaciones especializadas en otros módulos. Es raro necesitarlo en proyectos medianos; considéralo solo si el núcleo tiene muchas variantes de un mismo concepto.

## 7. Responsibility Layers

Estructura a gran escala que divide un modelo grande en capas de responsabilidad (por ejemplo, potencial, operación, políticas, decisión). IDDD la descarta para el caso de Colaboración porque está pensada para modelos grandes del Core Domain, no para conceptos que ni siquiera pertenecen al núcleo [IDDD cap. 2]. Úsala solo en Core Domains de gran tamaño y con experiencia previa `[detalle de las capas: Evans 2003, fuera de los libros]`.

## 8. Cuándo aplicar cada uno

| Situación | Patrón |
|---|---|
| Proyecto que empieza o equipo sin foco | Domain Vision Statement |
| El núcleo existe pero nadie sabe cuál es en el código | Highlighted Core |
| Algoritmos complejos que ensucian el modelo | Cohesive Mechanisms |
| Contexto crítico con el núcleo enterrado en funcionalidad de soporte | Segregated Core (paso previo a separar contextos) |
| Modelo enorme con muchas variantes | Abstract Core, Responsibility Layers |
