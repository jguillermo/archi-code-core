## Patrones Creacionales


### Resumen

## Patrones Creacionales

1. **Singleton**  
    Garantiza que solo exista una única instancia de una clase para centralizar recursos críticos.  
   **EERP/CRM:** El módulo de configuración o la conexión a la base de datos se implementa como Singleton; se inicializa al inicio del sistema y se consulta desde cualquier parte del código.  
   **Videojuegos:** El gestor de audio o de recursos (por ejemplo, las configuraciones gráficas) se crea una sola vez y se usa globalmente durante la partida.  
   **Ejemplo:** Es como un timbre de edificio: solo hay uno y todos lo usan.

2. **Prototype**  
    Facilita clonar objetos complejos sin depender de su clase concreta, reduciendo la complejidad de inicialización.  
   **EERP/CRM:** Para generar nuevas facturas a partir de una plantilla predefinida, clonándola y luego modificando algunos campos.  
   **Videojuegos:** Se clonan personajes o items (por ejemplo, enemigos o power-ups) a partir de un prototipo base, permitiendo crear muchas instancias rápidamente.  
   **Ejemplo:** Es como hacer fotocopias de una receta y luego adaptarla.

3. **Factory Method**  
    Desacopla la creación de objetos de su uso, permitiendo que cada módulo decida qué objeto instanciar según el contexto.  
   **EERP/CRM:** Un módulo de usuarios puede utilizar un método fábrica para crear diferentes tipos de perfiles (cliente, administrador, vendedor) sin conocer la clase concreta.  
   **Videojuegos:** Al crear distintos edificios o unidades, el método fábrica elige la implementación adecuada según la tecnología o la civilización del juego.  
   **Ejemplo:** Es como en una pastelería, donde el chef decide qué pastel hacer según la ocasión.

4. **Builder**  
    Permite construir objetos complejos paso a paso, separando el proceso de construcción de la representación final.  
   **EERP/CRM:** Ensambla reportes financieros complejos dividiéndolos en secciones (cabecera, detalle, resumen) en el código del generador de informes.  
   **Videojuegos:** Construye personajes o ejércitos configurando atributos (armadura, armas, habilidades) en función de la estrategia; el builder se usa en la capa de inicialización de unidades.  
   **Ejemplo:** Es como armar una hamburguesa personalizada: eliges pan, carne, queso y vegetales por separado.

5. **Abstract Factory**  
    Crea familias de objetos relacionados sin especificar sus clases, garantizando que los componentes sean compatibles.  
   **EERP/CRM:** Una fábrica abstracta genera interfaces y controles (botones, formularios) adaptados a distintos temas o regiones, usados en la capa de presentación.  
   **Videojuegos:** Se usa para crear conjuntos de elementos (personajes, armas, edificios) con estilos coherentes según la ambientación del juego, en la inicialización de la interfaz gráfica.  
   **Ejemplo:** Es como una tienda de muebles que ofrece conjuntos completos que combinan perfectamente.

---

## Patrones Estructurales

6. **Adapter**  
    Permite que módulos con interfaces incompatibles se comuniquen sin modificar su código.  
   **EERP/CRM:** Un adaptador integra un sistema de facturación heredado que utiliza XML con el nuevo módulo de pagos basado en JSON, en la capa de integración.  
   **Videojuegos:** Adapta la salida de un motor de físicas antiguo a un motor gráfico moderno, usado en la capa de comunicación entre sistemas.  
   **Ejemplo:** Es como un adaptador de enchufe: permite usar un dispositivo extranjero en una toma local.

7. **Bridge**  
    Separa la abstracción de la implementación para que ambas puedan evolucionar independientemente.  
   **EERP/CRM:** Separa la lógica de generación de reportes del formato de salida (PDF, Excel, HTML) en el módulo de reportes.  
   **Videojuegos:** Separa la lógica de control de un personaje de su representación gráfica, permitiendo actualizar los gráficos sin cambiar la jugabilidad.  
   **Ejemplo:** Es como un control remoto universal que funciona con distintos televisores.

8. **Composite**  
    Permite manejar estructuras jerárquicas complejas de forma uniforme.  
   **EERP/CRM:** Gestiona la jerarquía de departamentos o menús de navegación en la interfaz del sistema.  
   **Videojuegos:** Organiza el escenario o los menús del juego, donde cada grupo de elementos (submenús o componentes de escenario) se trata de la misma forma.  
   **Ejemplo:** Es como una carpeta en una computadora que contiene subcarpetas y archivos.

9. **Decorator**  
    Añade funcionalidades adicionales a un objeto de forma dinámica sin modificar su estructura original.  
   **EERP/CRM:** Agrega validación o auditoría a servicios existentes sin alterar su implementación, en la capa de servicios.  
   **Videojuegos:** Permite que una unidad adquiera mejoras temporales (por ejemplo, mayor velocidad o defensa) sin cambiar su código base, a través de envoltorios en el motor de juego.  
   **Ejemplo:** Es como decorar un auto: le añades accesorios sin modificar la estructura del vehículo.

10. **Facade**  
     Proporciona una interfaz simplificada a un subsistema complejo, reduciendo la dependencia directa entre módulos.  
    **EERP/CRM:** Un único punto de entrada en la capa de integración que agrupa operaciones de ventas, inventario y contabilidad para generar reportes consolidados.  
    **Videojuegos:** Ofrece un menú central que reúne funciones complejas (configuración, multijugador, estadísticas) sin que el usuario tenga que navegar en cada sistema.  
    **Ejemplo:** Es como un botón "todo en uno" en una casa inteligente que controla varias funciones a la vez.

11. **Flyweight**  
     Optimiza el uso de memoria compartiendo datos comunes entre muchos objetos.  
    **EERP/CRM:** En catálogos de productos, comparte atributos comunes (como categoría o unidad de medida) para evitar duplicación de datos en la capa de datos.  
    **Videojuegos:** Permite que muchos elementos del juego (por ejemplo, enemigos o ítems) compartan modelos o texturas comunes, reduciendo la carga de memoria.  
    **Ejemplo:** Es como un periódico donde muchas copias comparten la misma imagen sin tener que imprimirla en cada ejemplar.

12. **Proxy**  
     Controla el acceso a objetos costosos o remotos, agregando mecanismos de seguridad o caché.  
    **EERP/CRM:** Un proxy en la capa de servicios gestiona el acceso a un sistema de facturación remoto, validando permisos y almacenando resultados en caché.  
    **Videojuegos:** Controla el acceso a servicios en línea (por ejemplo, matchmaking o descargas de contenido), asegurando que solo usuarios autorizados puedan acceder y optimizando las consultas.  
    **Ejemplo:** Es como un portero que revisa la identidad antes de dejar entrar a alguien a un edificio.

---

## Patrones de Comportamiento

13. **Chain of Responsibility**  
    **Qué soluciona:** Permite que una solicitud se procese a través de una cadena de manejadores, eliminando condicionales complejos.  
    **EERP/CRM:** Un proceso de aprobación de órdenes de compra que pasa por validación de datos, aprobación gerencial y verificación de crédito, en la capa de lógica de negocio.  
    **Videojuegos:** Una acción (por ejemplo, construir un edificio) se valida mediante una cadena que verifica recursos, espacio y límites antes de proceder en la lógica del juego.  
    **Ejemplo:** Es como en una oficina donde una solicitud pasa de un empleado a otro hasta ser aprobada.

14. **Command**  
    **Qué soluciona:** Encapsula una solicitud en un objeto, separando la invocación de la ejecución y permitiendo deshacer/rehacer.  
    **EERP/CRM:** Cada transacción (crear, modificar, eliminar registros) se encapsula como un comando en la capa de control, permitiendo encolar operaciones y llevar un historial para auditoría.  
    **Videojuegos:** Cada acción del jugador (mover, atacar, construir) se encapsula en un comando que se registra y puede, en algunos casos, deshacerse, en la lógica de control del juego.  
    **Ejemplo:** Es como un control remoto donde cada botón representa una orden específica.

15. **Iterator**  
    **Qué soluciona:** Ofrece una forma uniforme de recorrer colecciones sin exponer su estructura interna.  
    **EERP/CRM:** Los módulos de reportes usan iteradores para procesar listas de clientes, órdenes o transacciones, sin conocer la estructura interna de la base de datos.  
    **Videojuegos:** El motor de juego recorre una lista de unidades o elementos del escenario para aplicar efectos o actualizar estados en la lógica del juego.  
    **Ejemplo:** Es como revisar una lista de compras, ítem por ítem, sin importar cómo está organizada.

16. **Mediator**  
    **Qué soluciona:** Centraliza la comunicación entre componentes para reducir el acoplamiento.  
    **EERP/CRM:** Un mediador coordina la comunicación entre módulos de ventas, inventario y contabilidad, enviando notificaciones sin que los módulos se conozcan directamente.  
    **Videojuegos:** Un sistema de mediador centraliza la comunicación entre diferentes subsistemas del juego (IA, interfaz, red), coordinando acciones sin acoplarlos directamente.  
    **Ejemplo:** Es como un coordinador que organiza y comunica la información entre distintos grupos en un evento.

17. **Memento**  
    **Qué soluciona:** Captura y permite restaurar el estado interno de un objeto sin exponer sus detalles.  
    **EERP/CRM:** Implementa funciones de deshacer/rehacer en la edición de datos o transacciones, almacenando el estado previo de la información en la capa de control.  
    **Videojuegos:** El juego guarda puntos de control (checkpoints) que permiten restaurar el estado de la partida en caso de error o para simular escenarios.  
    **Ejemplo:** Es como tomar una foto de un momento importante para poder volver a él.

18. **Observer**  
    **Qué soluciona:** Notifica automáticamente a múltiples componentes sobre cambios en un objeto, manteniendo bajo el acoplamiento.  
    **EERP/CRM:** Cuando se actualiza el stock o el precio de un producto, el sistema notifica a módulos de ventas, compras e inventario para mantener la coherencia de datos.  
    **Videojuegos:** Si cambia el estado de una unidad (como la salud o la puntuación), la interfaz y otros sistemas se actualizan automáticamente en la capa de notificación.  
    **Ejemplo:** Es como suscribirse a un noticiero: recibes las actualizaciones automáticamente.

19. **State**  
    **Qué soluciona:** Permite que un objeto cambie su comportamiento según su estado interno, eliminando condicionales dispersos.  
    **EERP/CRM:** Un proceso de una orden (creada, aprobada, enviada, completada) cambia su comportamiento en función de su estado, definido en la capa de dominio.  
    **Videojuegos:** Una unidad cambia de comportamiento (por ejemplo, de patrullar a atacar) según el estado del juego, implementado en el modelo de entidades.  
    **Ejemplo:** Es como un semáforo: cada color (rojo, verde, amarillo) indica una acción diferente.

20. **Strategy**  
    **Qué soluciona:** Permite intercambiar algoritmos en tiempo de ejecución sin modificar el contexto.  
    **EERP/CRM:** Se utilizan diferentes estrategias para calcular impuestos, descuentos o precios, seleccionadas dinámicamente en la capa de lógica de negocio.  
    **Videojuegos:** La IA del juego puede cambiar tácticas de combate o recolección de recursos en función del entorno, mediante estrategias intercambiables en la lógica de comportamiento.  
    **Ejemplo:** Es como elegir la ruta al trabajo según el tráfico o clima.

21. **Template Method**  
    **Qué soluciona:** Define el esqueleto de un proceso en una clase base y permite que las subclases personalicen pasos específicos.  
    **EERP/CRM:** Los procesos de importación/exportación de datos siguen un flujo fijo, pero cada módulo puede ajustar la validación y transformación de datos en la capa de integración.  
    **Videojuegos:** El proceso de construcción de un edificio sigue un flujo estándar (seleccionar ubicación, asignar recursos, construir), pero cada tipo de edificio puede tener variaciones en el tiempo de construcción o efectos, definidos en subclases.  
    **Ejemplo:** Es como seguir una receta: el proceso es fijo, pero cada chef puede ajustar los condimentos.

22. **Visitor**  
    **Qué soluciona:** Separa operaciones adicionales de la estructura de datos, permitiendo agregar nuevas funcionalidades sin modificar las clases base.  
    **EERP/CRM:** Permite recorrer estructuras complejas (como árboles de productos o jerarquías organizativas) para aplicar auditorías o exportaciones en la capa de reportes.  
    **Videojuegos:** Un visitante recorre las entidades del juego (por ejemplo, unidades o edificios) para calcular estadísticas, aplicar mejoras o generar informes de rendimiento, sin alterar la estructura de las clases.  
    **Ejemplo:** Es como un inspector que revisa cada máquina en una fábrica sin tener que saber cómo funciona cada una.


---

### **Patrón de Diseño: Singleton**

#### 📌 **Propósito**

El patrón **Singleton** es un patrón creacional que garantiza que una clase tenga una única instancia en toda la aplicación, proporcionando además un punto de acceso global a dicha instancia.

#### 🚩 **Problema**

Se presentan dos desafíos que el Singleton soluciona:

1. **Asegurar la existencia de una única instancia:**  
   Es crucial en situaciones donde se requiere controlar el acceso a recursos compartidos (como conexiones a bases de datos, archivos o configuraciones). En lugar de crear múltiples instancias, se reutiliza la misma.

2. **Proveer un punto de acceso global:**  
   Aunque similar a una variable global, el Singleton restringe modificaciones externas, evitando que se sobrescriba la instancia existente.

#### 💡 **Solución**

- **Privatizar el constructor:** Impide la creación de instancias adicionales usando `new`.
- **Método estático de acceso:** Un método (por ejemplo, `getInstance()`) que crea la instancia en la primera llamada (inicialización perezosa) y la devuelve en llamadas posteriores.

#### 🗂️ **Estructura**

- Clase Singleton con un método estático de acceso.
- Constructor privado.

#### 📝 **Pseudocódigo**

```pseudocode
class Database {
    private static instance: Database

    private constructor Database() {
        // Inicialización
    }

    public static method getInstance() {
        if (Database.instance == null) then
            acquireThreadLock()  // Para entornos multihilo
                if (Database.instance == null) then
                    Database.instance = new Database()
        return Database.instance
    }

    public method query(sql) {
        // Lógica para ejecutar consultas a la base de datos
    }
}

// Uso en la aplicación
class Application {
    method main() {
        Database foo = Database.getInstance()
        foo.query("SELECT ...")
        Database bar = Database.getInstance()
        bar.query("SELECT ...")
        // Tanto foo como bar hacen referencia a la misma instancia.
    }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
class Singleton {
    private static _instance: Singleton;
    private constructor() { }

    public static get instance(): Singleton {
        if (!Singleton._instance) {
            Singleton._instance = new Singleton();
        }
        return Singleton._instance;
    }

    public someBusinessLogic(): void {
        console.log("Ejecutando lógica de negocio.");
    }
}

// Uso didáctico
function clientCode() {
    const s1 = Singleton.instance;
    const s2 = Singleton.instance;
    console.log(s1 === s2 ? 'Singleton funciona correctamente.' : 'Error en Singleton.');
}

clientCode();
```

#### 🎯 **Aplicabilidad**

- Se utiliza para garantizar una única instancia de una clase (por ejemplo, conexión a base de datos, configuración global).

#### ⚙️ **Cómo implementarlo**

1. Campo estático privado.
2. Método estático público que gestiona la creación.
3. Constructor privado.
4. Reemplazar instanciaciones directas por llamadas a dicho método.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Única instancia garantizada.
- Punto de acceso global.
- Inicialización perezosa.

**Contras:**
- Puede violar el SRP.
- Riesgo de acoplamiento excesivo.
- Problemas en entornos multihilo si no se sincroniza adecuadamente.
- Dificulta pruebas unitarias.

#### 🔗 **Relaciones con otros patrones**

- Facade, Flyweight, Abstract Factory, Builder, Prototype.

---

#### **Uso en ERP:**

En un ERP, el patrón Singleton se utiliza para gestionar de forma centralizada elementos críticos y compartidos, tales como la configuración global del sistema, la conexión a la base de datos y el sistema de logging. Por ejemplo, el módulo de configuración que almacena parámetros del sistema (como las políticas de impuestos, usuarios y permisos) debe ser un Singleton para asegurar la coherencia y evitar la duplicación de datos.

---

### **Patrón de Diseño: Prototype**

#### 📌 **Propósito**

El patrón **Prototype** permite clonar objetos existentes sin depender de sus clases concretas, facilitando la creación de nuevas instancias a partir de prototipos.

#### 🚩 **Problema**

- Duplicar un objeto sin conocer su clase concreta puede ser complicado, especialmente si tiene atributos privados o complejos.

#### 💡 **Solución**

- Se define una interfaz con el método `clonar()` que cada clase implementa para devolver una copia exacta de sí misma.

#### 🗂️ **Estructura**

1. Interfaz Prototype.
2. Clases Concretas que implementan `clonar()`.
3. Cliente que utiliza `clonar()`.

#### 📝 **Pseudocódigo**

```pseudocode
abstract class Shape {
    field x: int, y: int, color: string

    constructor Shape(source: Shape) {
        this.x = source.x; this.y = source.y; this.color = source.color;
    }

    abstract method clone(): Shape
}

class Rectangle extends Shape {
    field width: int, height: int

    constructor Rectangle(source: Rectangle) {
        super(source);
        this.width = source.width; this.height = source.height;
    }

    method clone(): Shape {
        return new Rectangle(this)
    }
}

class Application {
    field shapes: array of Shape

    method businessLogic() {
        foreach (s in shapes) do
            shapesCopy.add(s.clone())
    }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
class Prototype {
    public primitive: any;
    public component: object;
    public circularReference: ComponentWithBackReference;

    public clone(): this {
        const clone = Object.create(this);
        clone.component = Object.create(this.component);
        clone.circularReference = {
            ...this.circularReference,
            prototype: { ...this },
        };
        return clone;
    }
}

class ComponentWithBackReference {
    public prototype: Prototype;
    constructor(prototype: Prototype) {
        this.prototype = prototype;
    }
}

function clientCodePrototype() {
    const p1 = new Prototype();
    p1.primitive = 245;
    p1.component = new Date();
    p1.circularReference = new ComponentWithBackReference(p1);

    const p2 = p1.clone();
    console.log(p1.primitive === p2.primitive ? "Clonación de primitivos OK" : "Error en primitivos");
}

clientCodePrototype();
```

#### 🎯 **Aplicabilidad**

- Ideal para clonar objetos complejos, como plantillas de documentos, órdenes o facturas en un ERP.

#### ⚙️ **Cómo implementarlo**

1. Definir una interfaz o clase abstracta con `clonar()`.
2. Implementar `clonar()` en cada clase.
3. (Opcional) Mantener un registro de prototipos.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Permite clonar sin acoplarse a clases concretas.
- Reduce la duplicación de lógica de inicialización.

**Contras:**
- Puede complicar el manejo de referencias circulares.
- El mecanismo de clonación puede no ser intuitivo.

#### 🔗 **Relaciones con otros patrones**

- Factory Method, Abstract Factory, Memento, Composite, Decorator.

---

#### **Uso en ERP:**

En un ERP, el patrón Prototype es muy útil para crear copias de documentos o transacciones complejas. Por ejemplo, al generar varias facturas a partir de una plantilla base, o al duplicar órdenes de compra que comparten muchos atributos, facilitando la creación de nuevos documentos sin tener que reconfigurar todos sus parámetros.

---

### **Patrón de Diseño: Factory Method**

#### 📌 **Propósito**

El patrón **Factory Method** define una interfaz para crear objetos en una superclase, permitiendo a las subclases decidir qué tipo de objeto crear sin acoplar el Cliente a clases concretas.

#### 🚩 **Problema**

- La creación directa de objetos con `new` puede causar un fuerte acoplamiento y dificultar la extensión del sistema.

#### 💡 **Solución**

- Sustituir la creación directa por un método fábrica que es sobrescrito por las subclases para instanciar productos específicos.

#### 🗂️ **Estructura**

1. Interfaz Producto.
2. Productos Concretos.
3. Clase Creadora (Creator) con un método fábrica.
4. Subclases de Creator que sobrescriben el método fábrica.

#### 📝 **Pseudocódigo**

```pseudocode
interface Button {
    method render()
    method onClick(callback)
}

class WindowsButton implements Button {
    method render() { /* Renderizado para Windows */ }
    method onClick(callback) { /* Eventos nativos de Windows */ }
}

class HTMLButton implements Button {
    method render() { /* Renderizado en HTML */ }
    method onClick(callback) { /* Eventos del navegador */ }
}

abstract class Dialog {
    abstract method createButton(): Button

    method render() {
        const okButton = this.createButton();
        okButton.onClick(this.closeDialog);
        okButton.render();
    }
}

class WindowsDialog extends Dialog {
    method createButton(): Button {
        return new WindowsButton();
    }
}

class WebDialog extends Dialog {
    method createButton(): Button {
        return new HTMLButton();
    }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
abstract class Creator {
    public abstract factoryMethod(): Product;
    public someOperation(): string {
        const product = this.factoryMethod();
        return `Creator: Operación realizada con ${product.operation()}`;
    }
}

interface Product {
    operation(): string;
}

class ConcreteProduct1 implements Product {
    public operation(): string {
        return '{Resultado del ConcreteProduct1}';
    }
}

class ConcreteCreator1 extends Creator {
    public factoryMethod(): Product {
        return new ConcreteProduct1();
    }
}

function clientCode(creator: Creator) {
    console.log(creator.someOperation());
}

clientCode(new ConcreteCreator1());
```

#### 🎯 **Aplicabilidad**

- Útil cuando el tipo de objeto a crear varía según la configuración o el entorno.

#### ⚙️ **Cómo implementarlo**

1. Definir una interfaz común para los productos.
2. Declarar un método fábrica abstracto en el Creator.
3. Sustituir instanciaciones directas por llamadas al método fábrica.
4. Crear subclases de Creator para devolver productos concretos.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Reduce el acoplamiento.
- Facilita la extensión mediante subclases.
- Se adhiere al principio de responsabilidad única.

**Contras:**
- Aumenta la complejidad del diseño en sistemas simples.

#### 🔗 **Relaciones con otros patrones**

- Abstract Factory, Prototype, Template Method.

---

#### **Uso en ERP:**

En un ERP, el patrón Factory Method se utiliza para instanciar componentes o módulos que pueden variar según la región o el tipo de usuario. Por ejemplo, al generar formularios de entrada o botones con estilos diferentes según el perfil del usuario (por ejemplo, ventas vs. contabilidad), el método fábrica permite centralizar y personalizar la creación de estos elementos.

---

### **Patrón de Diseño: Builder**

#### 📌 **Propósito**

El patrón **Builder** facilita la construcción de objetos complejos de forma escalonada, permitiendo obtener distintas representaciones o configuraciones utilizando el mismo proceso de construcción.

#### 🚩 **Problema**

- La creación de objetos con muchos parámetros (constructores telescópicos) puede resultar difícil de mantener y leer.

#### 💡 **Solución**

- Separar el proceso de construcción en pasos definidos, delegando la creación de cada parte a un builder específico.

#### 🗂️ **Estructura**

1. Producto complejo.
2. Interfaz del Builder.
3. Builder Concreto.
4. (Opcional) Director.
5. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
class Car { /* Atributos: motor, asientos, GPS, etc. */ }

interface Builder {
    method reset()
    method setSeats(number)
    method setEngine(type)
    method setGPS(enabled)
}

class CarBuilder implements Builder {
    private car
    method reset() { this.car = new Car() }
    method setSeats(number) { car.seats = number }
    method setEngine(type) { car.engine = type }
    method setGPS(enabled) { car.gps = enabled }
    method getProduct() { return this.car }
}

class Director {
    method constructSportsCar(builder) {
        builder.reset()
        builder.setSeats(2)
        builder.setEngine("V8")
        builder.setGPS(true)
    }
}

director = new Director()
builder = new CarBuilder()
director.constructSportsCar(builder)
car = builder.getProduct()
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface Builder {
    reset(): void;
    producePartA(): void;
    producePartB(): void;
    producePartC(): void;
}

class Product {
    public parts: string[] = [];
    public listParts(): void {
        console.log(`Producto partes: ${this.parts.join(', ')}`);
    }
}

class ConcreteBuilder1 implements Builder {
    private product: Product;
    constructor() { this.reset(); }
    public reset(): void { this.product = new Product(); }
    public producePartA(): void { this.product.parts.push('PartA1'); }
    public producePartB(): void { this.product.parts.push('PartB1'); }
    public producePartC(): void { this.product.parts.push('PartC1'); }
    public getProduct(): Product {
        const result = this.product;
        this.reset();
        return result;
    }
}

class Director {
    private builder: Builder;
    public setBuilder(builder: Builder): void { this.builder = builder; }
    public buildMinimalViableProduct(): void { this.builder.producePartA(); }
    public buildFullFeaturedProduct(): void {
        this.builder.producePartA();
        this.builder.producePartB();
        this.builder.producePartC();
    }
}

function clientCode(director: Director) {
    const builder = new ConcreteBuilder1();
    director.setBuilder(builder);

    console.log('Producto básico estándar:');
    director.buildMinimalViableProduct();
    builder.getProduct().listParts();

    console.log('Producto con todas las características:');
    director.buildFullFeaturedProduct();
    builder.getProduct().listParts();

    console.log('Producto personalizado:');
    builder.producePartA();
    builder.producePartC();
    builder.getProduct().listParts();
}

const director = new Director();
clientCode(director);
```

#### 🎯 **Aplicabilidad**

- Construcción escalonada de objetos complejos.
- Permite diferentes representaciones sin duplicar lógica.

#### ⚙️ **Cómo implementarlo**

1. Definir una interfaz de Builder.
2. Implementar Builders concretos.
3. (Opcional) Utilizar un Director.
4. Permitir al Cliente construir el producto final.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Evita constructores telescópicos.
- Mayor flexibilidad en la construcción.

**Contras:**
- Mayor complejidad y número de clases.

#### 🔗 **Relaciones con otros patrones**

- Factory Method, Abstract Factory, Prototype, Composite.

---

#### **Uso en ERP:**

En un ERP, el patrón Builder es ideal para construir documentos e informes complejos, como reportes financieros o facturas personalizadas. Por ejemplo, un módulo de generación de reportes puede utilizar un builder para ensamblar diversas secciones del informe (cabecera, detalle, resumen) de forma flexible según los parámetros y filtros aplicados por el usuario.

---

### **Patrón de Diseño: Abstract Factory**

#### 📌 **Propósito**

El patrón **Abstract Factory** permite crear familias de objetos relacionados sin especificar sus clases concretas, facilitando la compatibilidad entre ellos.

#### 🚩 **Problema**

- La incompatibilidad entre productos y la necesidad de agregar nuevas familias sin modificar el código cliente.

#### 💡 **Solución**

- Definir interfaces abstractas para cada producto y crear fábricas concretas que produzcan familias de productos coherentes.

#### 🗂️ **Estructura**

1. Producto Abstracto.
2. Productos Concretos.
3. Fábrica Abstracta.
4. Fábricas Concretas.
5. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface GUIFactory {
    method createButton(): Button
    method createCheckbox(): Checkbox
}

class WinFactory implements GUIFactory {
    method createButton(): Button { return new WinButton() }
    method createCheckbox(): Checkbox { return new WinCheckbox() }
}

class MacFactory implements GUIFactory {
    method createButton(): Button { return new MacButton() }
    method createCheckbox(): Checkbox { return new MacCheckbox() }
}

interface Button {
    method paint()
}

class WinButton implements Button {
    method paint() { /* Estilo Windows */ }
}

class MacButton implements Button {
    method paint() { /* Estilo macOS */ }
}

class Application {
    private factory: GUIFactory
    private button: Button
    constructor(factory: GUIFactory) { this.factory = factory }
    method createUI() { this.button = this.factory.createButton() }
    method paint() { this.button.paint() }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface AbstractFactory {
    createProductA(): AbstractProductA;
    createProductB(): AbstractProductB;
}

class ConcreteFactory1 implements AbstractFactory {
    public createProductA(): AbstractProductA { return new ConcreteProductA1(); }
    public createProductB(): AbstractProductB { return new ConcreteProductB1(); }
}

interface AbstractProductA { usefulFunctionA(): string; }
class ConcreteProductA1 implements AbstractProductA {
    public usefulFunctionA(): string { return 'Resultado del producto A1.'; }
}

interface AbstractProductB {
    usefulFunctionB(): string;
    anotherUsefulFunctionB(collaborator: AbstractProductA): string;
}
class ConcreteProductB1 implements AbstractProductB {
    public usefulFunctionB(): string { return 'Resultado del producto B1.'; }
    public anotherUsefulFunctionB(collaborator: AbstractProductA): string {
        return `B1 colaborando con (${collaborator.usefulFunctionA()})`;
    }
}

function clientCode(factory: AbstractFactory) {
    const productA = factory.createProductA();
    const productB = factory.createProductB();
    console.log(productB.usefulFunctionB());
    console.log(productB.anotherUsefulFunctionB(productA));
}

clientCode(new ConcreteFactory1());
```

#### 🎯 **Aplicabilidad**

- Crear familias de componentes (interfaz de usuario, módulos) sin acoplar el sistema a implementaciones específicas.

#### ⚙️ **Cómo implementarlo**

1. Definir interfaces para productos.
2. Implementar productos concretos.
3. Crear una interfaz de fábrica abstracta.
4. Implementar fábricas concretas.
5. Configurar el Cliente para usar las fábricas.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Garantiza la compatibilidad entre productos.
- Facilita la extensión sin modificar el código cliente.

**Contras:**
- Mayor complejidad en sistemas simples.

#### 🔗 **Relaciones con otros patrones**

- Factory Method, Builder, Prototype, Singleton.

---

#### **Uso en ERP:**

En un ERP, el patrón Abstract Factory se utiliza para generar interfaces de usuario o conjuntos de controles que deben mantener una coherencia visual y funcional. Por ejemplo, al soportar distintos temas o versiones regionales, la fábrica abstracta puede crear botones, menús y formularios adaptados a cada estilo, garantizando que todos los componentes de una familia sean compatibles entre sí.

---

## Patrones Estructurales

### **Patrón de Diseño: Adapter**

#### 📌 **Propósito**

El patrón **Adapter** permite que objetos con interfaces incompatibles colaboren, transformando la interfaz de una clase existente para que se adapte a la esperada por el Cliente.

#### 🚩 **Problema**

- Incompatibilidad entre la interfaz esperada y la que ofrece un servicio o componente, especialmente en sistemas legados.

#### 💡 **Solución**

- Crear un Adapter que envuelva al objeto existente y traduzca sus métodos a la interfaz requerida por el Cliente.

#### 🗂️ **Estructura**

1. Cliente.
2. Interfaz del Cliente.
3. Servicio (Adaptee).
4. Adapter.

#### 📝 **Pseudocódigo**

```pseudocode
class RoundHole {
    method fits(peg: RoundPeg) {
        return this.getRadius() >= peg.getRadius()
    }
}

class RoundPeg {
    constructor(radius)
    method getRadius()
}

class SquarePeg {
    constructor(width)
    method getWidth()
}

class SquarePegAdapter extends RoundPeg {
    private peg: SquarePeg
    constructor(peg: SquarePeg) {
        super()
        this.peg = peg
    }
    method getRadius() {
        return peg.getWidth() * Math.sqrt(2) / 2
    }
}

hole = new RoundHole(5)
squarePeg = new SquarePeg(5)
adapter = new SquarePegAdapter(squarePeg)
hole.fits(adapter) // Devuelve verdadero
```

#### Ejemplo Didáctico en TypeScript

```typescript
class Target {
    public request(): string {
        return "Target: Comportamiento por defecto.";
    }
}

class Adaptee {
    public specificRequest(): string {
        return ".eetpadA eht fo roivaheb laicepS";
    }
}

class Adapter extends Target {
    private adaptee: Adaptee;
    constructor(adaptee: Adaptee) {
        super();
        this.adaptee = adaptee;
    }
    public request(): string {
        const result = this.adaptee.specificRequest().split('').reverse().join('');
        return `Adapter: (TRADUCIDO) ${result}`;
    }
}

function clientCodeAdapter(target: Target) {
    console.log(target.request());
}

clientCodeAdapter(new Target());
clientCodeAdapter(new Adapter(new Adaptee()));
```

#### 🎯 **Aplicabilidad**

- Integrar sistemas o módulos con interfaces incompatibles sin modificar el código existente.

#### ⚙️ **Cómo implementarlo**

1. Identificar clases incompatibles.
2. Definir la interfaz esperada por el Cliente.
3. Crear un Adapter que traduzca entre interfaces.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Facilita la integración sin modificar el código original.
- Separa la lógica de conversión de la lógica de negocio.

**Contras:**
- Introduce clases adicionales.
- Puede afectar levemente el rendimiento.

#### 🔗 **Relaciones con otros patrones**

- Bridge, Decorator, Facade, Proxy.

---

#### **Uso en ERP:**

En un ERP, el patrón Adapter se emplea para integrar módulos legados o sistemas externos cuya interfaz no coincide con la nueva plataforma. Por ejemplo, al conectar un sistema de inventario heredado que envía datos en XML con un módulo ERP moderno que espera JSON, el Adapter transforma las llamadas y datos para que ambos puedan comunicarse sin modificar sus implementaciones originales.

---

### **Patrón de Diseño: Bridge**

#### 📌 **Propósito**

El patrón **Bridge** separa la abstracción de su implementación para que ambas puedan evolucionar de forma independiente, evitando la explosión combinatoria de clases.

#### 🚩 **Problema**

- Extensión en dos dimensiones (por ejemplo, formas y colores) genera muchas subclases.

#### 💡 **Solución**

- Utilizar composición para separar la abstracción (por ejemplo, "remoto de control") de la implementación (por ejemplo, "TV", "Radio").

#### 🗂️ **Estructura**

1. Abstracción.
2. Abstracción Refinada.
3. Interfaz de Implementación.
4. Implementaciones Concretas.
5. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface Device {
    method isEnabled()
    method enable()
    method disable()
    method getVolume()
    method setVolume(percent)
    method getChannel()
    method setChannel(channel)
}

class Tv implements Device { /* Lógica para TV */ }
class Radio implements Device { /* Lógica para Radio */ }

class RemoteControl {
    protected device: Device
    constructor(device: Device) { this.device = device }
    method togglePower() {
        if (device.isEnabled()) { device.disable(); }
        else { device.enable(); }
    }
    method volumeUp() { device.setVolume(device.getVolume() + 10); }
}

class AdvancedRemoteControl extends RemoteControl {
    method mute() { device.setVolume(0); }
}

const tv = new Tv();
const remote = new AdvancedRemoteControl(tv);
remote.togglePower();
remote.mute();
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface Device {
    isEnabled(): boolean;
    enable(): void;
    disable(): void;
    getVolume(): number;
    setVolume(volume: number): void;
}

class Tv implements Device {
    private volume: number = 10;
    private enabled: boolean = false;
    isEnabled(): boolean { return this.enabled; }
    enable(): void { this.enabled = true; }
    disable(): void { this.enabled = false; }
    getVolume(): number { return this.volume; }
    setVolume(volume: number): void { this.volume = volume; }
}

class RemoteControl {
    protected device: Device;
    constructor(device: Device) { this.device = device; }
    togglePower(): void {
        this.device.isEnabled() ? this.device.disable() : this.device.enable();
    }
    volumeUp(): void { this.device.setVolume(this.device.getVolume() + 10); }
}

const myTv = new Tv();
const myRemote = new RemoteControl(myTv);
myRemote.togglePower();
console.log(`TV habilitada: ${myTv.isEnabled()}`);
```

#### 🎯 **Aplicabilidad**

- Separar la abstracción de la implementación para permitir su evolución independiente.

#### ⚙️ **Cómo implementarlo**

1. Identificar las dimensiones de variación.
2. Definir interfaces para abstracción e implementación.
3. Utilizar composición para ligar ambas.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Independencia entre abstracción e implementación.
- Mayor flexibilidad y extensibilidad.

**Contras:**
- Mayor complejidad en el diseño.

#### 🔗 **Relaciones con otros patrones**

- Adapter, Strategy, Abstract Factory, Decorator.

---

#### **Uso en ERP:**

En un ERP, Bridge se usa para separar la lógica de negocio de la presentación. Por ejemplo, en la generación de reportes, la abstracción (el reporte) puede variar de la implementación (formato PDF, Excel, HTML) sin alterar el flujo de negocio, permitiendo que se ofrezcan múltiples representaciones del mismo informe.

---

### **Patrón de Diseño: Composite**

#### 📌 **Propósito**

El patrón **Composite** permite componer objetos en estructuras de árbol para tratarlos de manera uniforme, ya sean elementos individuales o compuestos.

#### 🚩 **Problema**

- Manejar estructuras jerárquicas complejas y tratarlas de manera uniforme.

#### 💡 **Solución**

- Definir una interfaz común para hojas y compuestos, de modo que ambos puedan ser tratados de la misma forma.

#### 🗂️ **Estructura**

1. Componente (Interfaz).
2. Hoja.
3. Composite.
4. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface Graphic {
    method move(x, y)
    method draw()
}

class Dot implements Graphic {
    field x, y
    method move(x, y) { this.x += x; this.y += y; }
    method draw() { /* Dibuja un punto */ }
}

class Circle extends Dot {
    field radius
    method draw() { /* Dibuja un círculo */ }
}

class CompoundGraphic implements Graphic {
    field children: array of Graphic
    method add(child: Graphic) { children.add(child); }
    method remove(child: Graphic) { children.remove(child); }
    method move(x, y) { for (child in children) child.move(x, y); }
    method draw() { for (child in children) child.draw(); }
}

class ImageEditor {
    field all: CompoundGraphic
    method load() { /* ... */ }
    method groupSelected(components: array of Graphic) { /* ... */ }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface Graphic {
    move(x: number, y: number): void;
    draw(): void;
}

class Dot implements Graphic {
    constructor(public x: number, public y: number) {}
    move(x: number, y: number): void { this.x += x; this.y += y; }
    draw(): void { console.log(`Dibuja Dot en (${this.x}, ${this.y})`); }
}

class CompoundGraphic implements Graphic {
    private children: Graphic[] = [];
    add(child: Graphic): void { this.children.push(child); }
    move(x: number, y: number): void {
        this.children.forEach(child => child.move(x, y));
    }
    draw(): void { this.children.forEach(child => child.draw()); }
}

const dot1 = new Dot(1, 2);
const dot2 = new Dot(3, 4);
const group = new CompoundGraphic();
group.add(dot1);
group.add(dot2);
group.draw();
```

#### 🎯 **Aplicabilidad**

- Representar jerarquías (menús, árboles de productos) de forma uniforme.

#### ⚙️ **Cómo implementarlo**

1. Crear una interfaz común.
2. Implementar clases Hoja y Composite.
3. El Cliente utiliza la interfaz sin diferenciar entre tipos.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Simplifica el código del Cliente.
- Facilita la extensión y operaciones recursivas.

**Contras:**
- Puede ser complejo definir una interfaz adecuada para todos los componentes.

#### 🔗 **Relaciones con otros patrones**

- Builder, Iterator, Visitor, Decorator, Flyweight.

---

#### **Uso en ERP:**

En un ERP, Composite se utiliza para gestionar estructuras jerárquicas como menús de navegación, jerarquías organizativas o catálogos de productos. Por ejemplo, la estructura de un menú del ERP (con submenús y opciones) se puede implementar con Composite para que el Cliente pueda iterar y renderizar la interfaz de manera uniforme.

---

### **Patrón de Diseño: Decorator**

#### 📌 **Propósito**

El patrón **Decorator** permite añadir dinámicamente funcionalidades adicionales a un objeto sin modificar su estructura básica, encapsulándolo en decoradores que extienden su comportamiento.

#### 🚩 **Problema**

- Ampliar la funcionalidad de un objeto sin crear muchas subclases para cada combinación posible de comportamientos.

#### 💡 **Solución**

- Utilizar composición para envolver el objeto base en uno o más decoradores que implementen la misma interfaz y añadan funcionalidades.

#### 🗂️ **Estructura**

1. Componente (Interfaz).
2. Componente Concreto.
3. Decorador Base.
4. Decoradores Concretos.
5. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface DataSource {
    method writeData(data)
    method readData(): data
}

class FileDataSource implements DataSource {
    method writeData(data) { /* Escribe en archivo */ }
    method readData() { /* Lee del archivo */ }
}

class DataSourceDecorator implements DataSource {
    protected wrappee: DataSource
    constructor(source: DataSource) { this.wrappee = source }
    method writeData(data) { wrappee.writeData(data) }
    method readData() { return wrappee.readData() }
}

class EncryptionDecorator extends DataSourceDecorator {
    method writeData(data) {
        // Encripta datos antes de escribir
        wrappee.writeData(encryptedData)
    }
    method readData() {
        const data = wrappee.readData()
        return decrypt(data)
    }
}

class CompressionDecorator extends DataSourceDecorator {
    method writeData(data) {
        // Comprime datos antes de escribir
        wrappee.writeData(compressedData)
    }
    method readData() {
        const data = wrappee.readData()
        return decompress(data)
    }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface DataSource {
    writeData(data: string): void;
    readData(): string;
}

class FileDataSource implements DataSource {
    private filename: string;
    constructor(filename: string) { this.filename = filename; }
    writeData(data: string): void { console.log(`Escribiendo en ${this.filename}: ${data}`); }
    readData(): string { return "datos leídos"; }
}

class DataSourceDecorator implements DataSource {
    protected wrappee: DataSource;
    constructor(source: DataSource) { this.wrappee = source; }
    writeData(data: string): void { this.wrappee.writeData(data); }
    readData(): string { return this.wrappee.readData(); }
}

class EncryptionDecorator extends DataSourceDecorator {
    writeData(data: string): void {
        const encryptedData = `encrypted(${data})`;
        this.wrappee.writeData(encryptedData);
    }
    readData(): string {
        const data = this.wrappee.readData();
        return `decrypted(${data})`;
    }
}

let source: DataSource = new FileDataSource("datos.txt");
source = new EncryptionDecorator(source);
source.writeData("Información confidencial");
```

#### 🎯 **Aplicabilidad**

- Añadir funcionalidades de forma dinámica sin modificar la clase base.

#### ⚙️ **Cómo implementarlo**

1. Definir la interfaz común.
2. Implementar la clase base.
3. Crear un decorador base.
4. Desarrollar decoradores concretos.
5. Permitir al Cliente combinar decoradores.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Agrega funcionalidades sin modificar la clase original.
- Permite combinaciones flexibles.

**Contras:**
- Puede complicar el seguimiento del flujo.
- El orden de los decoradores es importante.

#### 🔗 **Relaciones con otros patrones**

- Adapter, Composite, Proxy.

---

#### **Uso en ERP:**

En un ERP, el patrón Decorator se utiliza para agregar funcionalidades a módulos existentes sin alterar su código base. Por ejemplo, se puede aplicar para agregar auditoría, validación o registro de transacciones en el módulo de ventas o contabilidad, permitiendo activar o desactivar estas funciones según las necesidades sin modificar la lógica principal.

---

## Patrones de Facade, Flyweight y Proxy

### **Patrón de Diseño: Facade**

#### 📌 **Propósito**

El patrón **Facade** ofrece una interfaz simplificada para un subsistema complejo, ocultando su complejidad interna.

#### 🚩 **Problema**

- Alta complejidad y acoplamiento en subsistemas con muchas clases interdependientes.

#### 💡 **Solución**

- Crear una clase fachada que exponga solo las operaciones esenciales, delegando internamente a los componentes.

#### 🗂️ **Estructura**

1. Fachada.
2. Subsistema.
3. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
class VideoConverter {
    method convert(filename, format): File {
        file = new VideoFile(filename)
        sourceCodec = (new CodecFactory).extract(file)
        if (format == "mp4")
            destinationCodec = new MPEG4CompressionCodec()
        else
            destinationCodec = new OggCompressionCodec()
        buffer = BitrateReader.read(filename, sourceCodec)
        result = BitrateReader.convert(buffer, destinationCodec)
        result = (new AudioMixer()).fix(result)
        return new File(result)
    }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
class VideoConverter {
    public convert(filename: string, format: string): string {
        // Simulación de la conversión
        return `Archivo ${filename} convertido a formato ${format}`;
    }
}

const converter = new VideoConverter();
console.log(converter.convert("video.ogg", "mp4"));
```

#### 🎯 **Aplicabilidad**

- Simplificar el acceso a subsistemas complejos.

#### ⚙️ **Cómo implementarlo**

1. Identificar la complejidad.
2. Crear una interfaz fachada.
3. Delegar a los componentes correspondientes.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Aísla la complejidad.
- Facilita el mantenimiento.

**Contras:**
- Puede concentrar demasiadas responsabilidades.

#### 🔗 **Relaciones con otros patrones**

- Adapter, Abstract Factory, Mediator, Singleton, Proxy.

---

#### **Uso en ERP:**

En un ERP, Facade se utiliza para proporcionar una interfaz única que integre varios módulos complejos (como ventas, inventario, contabilidad). Por ejemplo, un único punto de entrada para generar reportes consolidados que extraigan datos de múltiples subsistemas sin que el usuario tenga que interactuar con cada módulo individualmente.

---

### **Patrón de Diseño: Flyweight**

#### 📌 **Propósito**

El patrón **Flyweight** optimiza el uso de memoria compartiendo partes comunes del estado entre múltiples objetos.

#### 🚩 **Problema**

- Uso excesivo de memoria al crear muchos objetos con datos redundantes.

#### 💡 **Solución**

- Separar el estado en intrínseco (compartido) y extrínseco (específico) y reutilizar instancias compartidas.

#### 🗂️ **Estructura**

1. Flyweight.
2. Contexto.
3. Fábrica de Flyweights.
4. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
class TreeType {
    field name, color, texture
    constructor(name, color, texture)
    method draw(canvas, x, y)
}

class TreeFactory {
    static field treeTypes: collection
    static method getTreeType(name, color, texture):
        if (treeTypes.contains(name, color, texture))
            return treeTypes.get(name, color, texture)
        else {
            type = new TreeType(name, color, texture)
            treeTypes.add(type)
            return type
        }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
class TreeType {
    constructor(public name: string, public color: string, public texture: string) {}
    draw(x: number, y: number): void {
        console.log(`Dibujando ${this.name} en (${x}, ${y}) con color ${this.color}`);
    }
}

class TreeFactory {
    private static treeTypes: { [key: string]: TreeType } = {};
    public static getTreeType(name: string, color: string, texture: string): TreeType {
        const key = `${name}_${color}_${texture}`;
        if (!this.treeTypes[key]) {
            this.treeTypes[key] = new TreeType(name, color, texture);
        }
        return this.treeTypes[key];
    }
}

const treeType = TreeFactory.getTreeType("Pino", "Verde", "Aguja");
treeType.draw(10, 20);
```

#### 🎯 **Aplicabilidad**

- Optimizar el uso de memoria en sistemas con muchos objetos similares.

#### ⚙️ **Cómo implementarlo**

1. Separar estado intrínseco y extrínseco.
2. Implementar la clase Flyweight.
3. Crear una fábrica que gestione instancias.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Reducción significativa del consumo de memoria.
- Mejor rendimiento en sistemas con grandes volúmenes de datos.

**Contras:**
- Complejidad en el manejo del estado extrínseco.

#### 🔗 **Relaciones con otros patrones**

- Composite, Facade, Singleton.

---

#### **Uso en ERP:**

En un ERP, Flyweight se puede aplicar para optimizar la gestión de grandes catálogos de productos, donde muchos artículos comparten atributos comunes (como categoría, unidad de medida, etc.). Esto reduce el consumo de memoria y mejora el rendimiento en la generación de reportes y análisis de inventario.

---

### **Patrón de Diseño: Proxy**

#### 📌 **Propósito**

El patrón **Proxy** proporciona un sustituto o marcador de posición para otro objeto, controlando el acceso y pudiendo ejecutar operaciones adicionales antes o después de delegar la solicitud.

#### 🚩 **Problema**

- Algunos objetos son costosos de inicializar o acceder, o se requiere control de acceso.

#### 💡 **Solución**

- Implementar un Proxy que controle la creación y acceso al objeto real, pudiendo implementar caché, seguridad o inicialización perezosa.

#### 🗂️ **Estructura**

1. Interfaz del Servicio.
2. Objeto Real.
3. Proxy.
4. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface VideoService {
    method listVideos()
    method getVideoInfo(id)
    method downloadVideo(id)
}

class YouTubeService implements VideoService { /* ... */ }

class CachedYouTubeProxy implements VideoService {
    private realService: YouTubeService
    private cache
    constructor(realService: YouTubeService) { this.realService = realService; this.cache = {} }
    method listVideos() {
        if (cache.list is empty)
            cache.list = realService.listVideos()
        return cache.list
    }
    // ...
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface VideoService {
    listVideos(): string[];
    getVideoInfo(id: string): string;
}

class YouTubeService implements VideoService {
    listVideos(): string[] { return ["video1", "video2"]; }
    getVideoInfo(id: string): string { return `Información del ${id}`; }
}

class CachedYouTubeProxy implements VideoService {
    private realService: YouTubeService;
    private cache: { [key: string]: any } = {};
    constructor(realService: YouTubeService) { this.realService = realService; }
    listVideos(): string[] {
        if (!this.cache['list']) {
            this.cache['list'] = this.realService.listVideos();
        }
        return this.cache['list'];
    }
    getVideoInfo(id: string): string {
        if (!this.cache[id]) {
            this.cache[id] = this.realService.getVideoInfo(id);
        }
        return this.cache[id];
    }
}

const proxy = new CachedYouTubeProxy(new YouTubeService());
console.log(proxy.listVideos());
console.log(proxy.getVideoInfo("video1"));
```

#### 🎯 **Aplicabilidad**

- Controlar el acceso a objetos costosos o remotos.
- Implementar caché o inicialización perezosa.

#### ⚙️ **Cómo implementarlo**

1. Definir una interfaz común.
2. Implementar el objeto real.
3. Crear un Proxy con lógica adicional.
4. El Cliente utiliza el Proxy sin distinguirlo.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Controla el acceso y puede optimizar recursos.
- Mejora el rendimiento mediante caché.

**Contras:**
- Añade complejidad adicional.
- Puede complicar la depuración.

#### 🔗 **Relaciones con otros patrones**

- Adapter, Decorator, Facade, Singleton.

---

#### **Uso en ERP:**

En un ERP, el patrón Proxy se utiliza para controlar el acceso a módulos o servicios críticos, como el acceso a bases de datos o servicios de facturación. Por ejemplo, un Proxy puede implementar caché para consultas de inventario o validar permisos de usuario antes de acceder a datos sensibles, mejorando la seguridad y eficiencia del sistema.

---

## Patrones de Comportamiento

### **Patrón de Diseño: Chain of Responsibility**

#### 📌 **Propósito**

Permite pasar solicitudes a lo largo de una cadena de manejadores, donde cada uno decide si la procesa o la pasa al siguiente.

#### 🚩 **Problema**

- Procesos de verificación complejos (autenticación, validación, etc.) que generan código difícil de mantener.

#### 💡 **Solución**

- Dividir la responsabilidad en manejadores independientes y encadenarlos.

#### 🗂️ **Estructura**

1. Manejador (Handler).
2. Manejador Base.
3. Manejadores Concretos.
4. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface Handler {
    method setNext(handler: Handler): Handler
    method handle(request: Request)
}

abstract class AbstractHandler implements Handler {
    private nextHandler: Handler
    method setNext(handler: Handler): Handler {
        this.nextHandler = handler;
        return handler;
    }
    method handle(request: Request) {
        if (this.nextHandler) return this.nextHandler.handle(request);
        return null;
    }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface Handler {
    setNext(handler: Handler): Handler;
    handle(request: string): string;
}

abstract class AbstractHandler implements Handler {
    private nextHandler: Handler | null = null;
    public setNext(handler: Handler): Handler {
        this.nextHandler = handler;
        return handler;
    }
    public handle(request: string): string {
        if (this.nextHandler) return this.nextHandler.handle(request);
        return "Solicitud no atendida.";
    }
}

class AuthHandler extends AbstractHandler {
    public handle(request: string): string {
        if (request === "authenticated") {
            return super.handle(request);
        }
        return "Acceso denegado";
    }
}

const handler1 = new AuthHandler();
handler1.setNext(new AuthHandler()); // Ejemplo simple
console.log(handler1.handle("not_authenticated"));
```

#### 🎯 **Aplicabilidad**

- Procesos de validación y aprobación en cadena.

#### ⚙️ **Cómo implementarlo**

1. Definir una interfaz común para manejadores.
2. Implementar una clase base.
3. Crear manejadores concretos.
4. Encadenar los manejadores.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Desacopla emisor y receptores.
- Fácil de extender.

**Contras:**
- Puede ser difícil rastrear el flujo.

#### 🔗 **Relaciones con otros patrones**

- Command, Mediator, Observer.

---

#### **Uso en ERP:**

En un ERP, Chain of Responsibility se usa para gestionar procesos de aprobación, como la validación de órdenes de compra o facturas, donde la solicitud pasa por distintos niveles (validación de datos, aprobación por gerente, verificación de crédito) antes de completarse.

---

### **Patrón de Diseño: Command**

#### 📌 **Propósito**

Convierte una solicitud en un objeto independiente que encapsula toda la información necesaria para ejecutarla.

#### 🚩 **Problema**

- Creación de numerosas clases para cada acción, generando fuerte acoplamiento entre la interfaz gráfica y la lógica de negocio.

#### 💡 **Solución**

- Encapsular las solicitudes en objetos comando, separando la invocación de la ejecución.

#### 🗂️ **Estructura**

1. Emisor (Invoker).
2. Comando (Interfaz).
3. Comandos Concretos.
4. Receptor.
5. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface Command {
    method execute()
    method undo() // Opcional
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface Command {
    execute(): void;
}

class CopyCommand implements Command {
    constructor(private editor: any) {}
    execute(): void { console.log("Copiando texto"); }
}

class Button {
    constructor(private command: Command) {}
    click(): void { this.command.execute(); }
}

const copyCommand = new CopyCommand({});
const copyButton = new Button(copyCommand);
copyButton.click();
```

#### 🎯 **Aplicabilidad**

- Encapsulación de operaciones, permitiendo deshacer/rehacer y encolar comandos.

#### ⚙️ **Cómo implementarlo**

1. Definir la interfaz de comando.
2. Implementar comandos concretos.
3. Asignar comandos a emisores.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Desacopla invocación y ejecución.
- Facilita la extensión y permite deshacer/rehacer.

**Contras:**
- Aumenta la cantidad de clases.

#### 🔗 **Relaciones con otros patrones**

- Chain of Responsibility, Mediator, Observer, Memento.

---

#### **Uso en ERP:**

En un ERP, Command se utiliza para encapsular transacciones críticas, como la creación, actualización o eliminación de registros en módulos de ventas o contabilidad. Esto permite encolar operaciones, implementar deshacer/rehacer y mantener un historial de cambios para auditoría.

---

### **Patrón de Diseño: Iterator**

#### 📌 **Propósito**

Permite recorrer elementos de una colección sin exponer su estructura interna, ofreciendo un mecanismo uniforme de iteración.

#### 🚩 **Problema**

- Recorrer colecciones complejas sin exponer su implementación interna.

#### 💡 **Solución**

- Extraer la lógica de recorrido en un objeto iterador.

#### 🗂️ **Estructura**

1. Iterador (Interfaz).
2. Iterador Concreto.
3. Colección (Aggregate).
4. Colección Concreta.
5. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface Iterator {
    method hasNext(): boolean
    method next(): Object
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface Iterator<T> {
    hasNext(): boolean;
    next(): T;
}

class ArrayIterator<T> implements Iterator<T> {
    private index = 0;
    constructor(private collection: T[]) {}
    hasNext(): boolean { return this.index < this.collection.length; }
    next(): T { return this.collection[this.index++]; }
}

const numbers = [1, 2, 3, 4];
const iterator = new ArrayIterator(numbers);
while (iterator.hasNext()) {
    console.log(iterator.next());
}
```

#### 🎯 **Aplicabilidad**

- Recorrer estructuras de datos sin acoplar al Cliente a la implementación interna.

#### ⚙️ **Cómo implementarlo**

1. Definir una interfaz iterador.
2. Implementar el iterador concreto.
3. Definir la colección que cree iteradores.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Desacopla al Cliente de la estructura interna.
- Permite múltiples iteradores.

**Contras:**
- Puede ser innecesario para colecciones simples.

#### 🔗 **Relaciones con otros patrones**

- Composite, Factory Method, Memento, Visitor.

---

#### **Uso en ERP:**

En un ERP, Iterator es fundamental para recorrer listas de clientes, órdenes, transacciones o inventarios. Permite que módulos de reportes y análisis procesen grandes volúmenes de datos sin depender de la estructura subyacente.

---

### **Patrón de Diseño: Mediator**

#### 📌 **Propósito**

Reduce las dependencias entre objetos centralizando la comunicación a través de un mediador, facilitando el mantenimiento y la escalabilidad del sistema.

#### 🚩 **Problema**

- Comunicación compleja y acoplada entre múltiples objetos.

#### 💡 **Solución**

- Centralizar la comunicación en un mediador que coordine las interacciones entre componentes (colegas).

#### 🗂️ **Estructura**

1. Mediador (Interfaz).
2. Mediador Concreto.
3. Componentes (Colleagues).
4. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface Mediator {
    method notify(sender: Component, event: string)
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface Mediator {
    notify(sender: string, event: string): void;
}

class ConcreteMediator implements Mediator {
    notify(sender: string, event: string): void {
        console.log(`Mediador notifica: ${sender} ha generado el evento ${event}`);
    }
}

class Component {
    constructor(private mediator: Mediator) {}
    click(): void {
        this.mediator.notify("Component", "click");
    }
}

const mediator = new ConcreteMediator();
const component = new Component(mediator);
component.click();
```

#### 🎯 **Aplicabilidad**

- Coordinar la comunicación entre módulos sin acoplarlos directamente.

#### ⚙️ **Cómo implementarlo**

1. Definir una interfaz de mediador.
2. Implementar un mediador concreto.
3. Modificar componentes para comunicarse a través del mediador.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Centraliza la comunicación.
- Facilita el mantenimiento y la reutilización.

**Contras:**
- El mediador puede convertirse en un "God Object".

#### 🔗 **Relaciones con otros patrones**

- Facade, Observer, Colleague.

---

#### **Uso en ERP:**

En un ERP, Mediator es útil para orquestar la comunicación entre módulos independientes. Por ejemplo, el módulo de ventas puede notificar al de inventario cuando se realiza una venta, sin necesidad de que ambos estén directamente acoplados, facilitando la integración y el mantenimiento del sistema.

---

### **Patrón de Diseño: Memento**

#### 📌 **Propósito**

Permite capturar y almacenar el estado interno de un objeto sin exponer sus detalles, para poder restaurarlo posteriormente.

#### 🚩 **Problema**

- Necesidad de deshacer cambios sin violar la encapsulación.

#### 💡 **Solución**

- El Originador crea un Memento que almacena su estado; el Cuidador guarda el Memento sin conocer su contenido.

#### 🗂️ **Estructura**

1. Originador.
2. Memento.
3. Cuidador.
4. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
class Editor {
    private text, curX, curY, selectionWidth
    method createSnapshot(): Snapshot { return new Snapshot(this, text, curX, curY, selectionWidth); }
}

class Snapshot {
    constructor(editor, text, curX, curY, selectionWidth) { /* ... */ }
    method restore() { editor.setText(text); editor.setCursor(curX, curY); editor.setSelectionWidth(selectionWidth); }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
class Editor {
    private text: string = "";
    setText(text: string): void { this.text = text; }
    createSnapshot(): EditorSnapshot {
        return new EditorSnapshot(this.text);
    }
    restore(snapshot: EditorSnapshot): void { this.text = snapshot.getText(); }
}

class EditorSnapshot {
    constructor(private text: string) {}
    getText(): string { return this.text; }
}

const editor = new Editor();
editor.setText("Estado inicial");
const snapshot = editor.createSnapshot();
editor.setText("Estado modificado");
editor.restore(snapshot);
```

#### 🎯 **Aplicabilidad**

- Funciones de deshacer/rehacer y recuperación en aplicaciones críticas.

#### ⚙️ **Cómo implementarlo**

1. Identificar el estado a guardar.
2. Implementar métodos para crear y restaurar Mementos.
3. Utilizar un Cuidador para gestionar el historial.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Preserva la encapsulación.
- Facilita la reversión de cambios.

**Contras:**
- Consumo de memoria en múltiples Mementos.
- Complejidad en la gestión del historial.

#### 🔗 **Relaciones con otros patrones**

- Command, Iterator, Prototype.

---

#### **Uso en ERP:**

En un ERP, Memento se puede usar para implementar funciones de deshacer/rehacer en la edición de transacciones, órdenes de compra o configuraciones del sistema. Por ejemplo, un usuario puede revertir cambios en una factura o en la configuración de un módulo sin perder datos importantes, garantizando la integridad del sistema.

---

### **Patrón de Diseño: Observer**

#### 📌 **Propósito**

Define un mecanismo de suscripción para notificar a varios objetos sobre cambios en el objeto observado, manteniendo un bajo acoplamiento.

#### 🚩 **Problema**

- Verificar continuamente si ocurre un evento puede ser ineficiente y generar acoplamientos fuertes.

#### 💡 **Solución**

- El Notificador mantiene una lista de Suscriptores y los notifica automáticamente cuando ocurre un evento.

#### 🗂️ **Estructura**

1. Notificador.
2. Suscriptor.
3. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface EventListener {
    method update(data)
}

class EventManager {
    private listeners: map of event types to listeners
    method subscribe(eventType, listener) { /* ... */ }
    method notify(eventType, data) { /* ... */ }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface EventListener {
    update(data: string): void;
}

class EventManager {
    private listeners: EventListener[] = [];
    subscribe(listener: EventListener): void { this.listeners.push(listener); }
    notify(data: string): void { this.listeners.forEach(listener => listener.update(data)); }
}

class LoggingListener implements EventListener {
    update(data: string): void { console.log(`Log: ${data}`); }
}

const manager = new EventManager();
manager.subscribe(new LoggingListener());
manager.notify("Evento de prueba");
```

#### 🎯 **Aplicabilidad**

- Notificar cambios en objetos críticos.

#### ⚙️ **Cómo implementarlo**

1. Definir la interfaz del Suscriptor.
2. Implementar el Notificador con métodos de suscripción y notificación.
3. Registrar Suscriptores en el Cliente.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Facilita la extensión sin acoplar el sistema.
- Permite suscripciones dinámicas.

**Contras:**
- Depuración más compleja en sistemas muy dinámicos.

#### 🔗 **Relaciones con otros patrones**

- Mediator, Chain of Responsibility, Command.

---

#### **Uso en ERP:**

En un ERP, Observer se aplica para notificar a módulos (como inventario, ventas y contabilidad) sobre cambios en datos críticos. Por ejemplo, cuando se actualiza el stock de un producto, todos los módulos relacionados se actualizan automáticamente, garantizando coherencia en todo el sistema.

---

### **Patrón de Diseño: State**

#### 📌 **Propósito**

Permite que un objeto altere su comportamiento cuando su estado interno cambia, dando la impresión de que cambia de clase en tiempo de ejecución.

#### 🚩 **Problema**

- Uso de condicionales para manejar múltiples estados hace el código difícil de mantener.

#### 💡 **Solución**

- Separar cada estado en clases específicas, y hacer que el Contexto delegue en el estado actual.

#### 🗂️ **Estructura**

1. Contexto.
2. Estado (Interfaz).
3. Estados Concretos.

#### 📝 **Pseudocódigo**

```pseudocode
interface State {
    method handle()
}

class ReadyState implements State { method handle() { print("Reproductor preparado."); } }
class PlayingState implements State { method handle() { print("Reproduciendo música."); } }
class PausedState implements State { method handle() { print("Reproducción en pausa."); } }

class AudioPlayer {
    private state: State = new ReadyState();
    method changeState(state: State) { this.state = state; }
    method pressButton() { this.state.handle(); }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface State {
    handle(): void;
}

class ReadyState implements State {
    handle(): void { console.log("Reproductor preparado."); }
}

class PlayingState implements State {
    handle(): void { console.log("Reproduciendo música."); }
}

class AudioPlayer {
    private state: State = new ReadyState();
    changeState(state: State): void { this.state = state; }
    pressButton(): void { this.state.handle(); }
}

const player = new AudioPlayer();
player.pressButton();
player.changeState(new PlayingState());
player.pressButton();
```

#### 🎯 **Aplicabilidad**

- Procesos con múltiples estados (por ejemplo, ciclo de vida de una orden).

#### ⚙️ **Cómo implementarlo**

1. Definir una interfaz de Estado.
2. Crear clases para cada estado.
3. Delegar el comportamiento en el Contexto.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Elimina condicionales complejos.
- Facilita la extensión y mantenimiento.

**Contras:**
- Puede generar muchas clases en sistemas simples.

#### 🔗 **Relaciones con otros patrones**

- Strategy, Bridge, Memento, Observer.

---

#### **Uso en ERP:**

En un ERP, State es útil para modelar el ciclo de vida de documentos y procesos. Por ejemplo, el estado de una orden (creada, aprobada, enviada, completada) se puede gestionar mediante el patrón State, permitiendo que el sistema ejecute comportamientos distintos en cada fase sin recurrir a múltiples condicionales.

---

### **Patrón de Diseño: Strategy**

#### 📌 **Propósito**

El patrón **Strategy** define una familia de algoritmos encapsulados en clases separadas, permitiendo intercambiarlos en tiempo de ejecución según la necesidad.

#### 🚩 **Problema**

- Algoritmos rígidos con condicionales excesivos dificultan la extensión y mantenimiento.

#### 💡 **Solución**

- Encapsular cada algoritmo en una estrategia concreta y permitir que el Contexto seleccione la adecuada.

#### 🗂️ **Estructura**

1. Contexto.
2. Estrategia (Interfaz).
3. Estrategias Concretas.
4. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface Strategy {
    method execute(a, b)
}

class ConcreteStrategyAdd implements Strategy { method execute(a, b) { return a + b; } }
class ConcreteStrategySubtract implements Strategy { method execute(a, b) { return a - b; } }
class ConcreteStrategyMultiply implements Strategy { method execute(a, b) { return a * b; } }

class Context {
    private strategy: Strategy;
    method setStrategy(strategy: Strategy) { this.strategy = strategy; }
    method executeStrategy(a, b) { return strategy.execute(a, b); }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface Strategy {
    execute(a: number, b: number): number;
}

class AddStrategy implements Strategy {
    execute(a: number, b: number): number { return a + b; }
}

class Context {
    private strategy!: Strategy;
    setStrategy(strategy: Strategy): void { this.strategy = strategy; }
    executeStrategy(a: number, b: number): number { return this.strategy.execute(a, b); }
}

const context = new Context();
context.setStrategy(new AddStrategy());
console.log(context.executeStrategy(5, 3)); // 8
```

#### 🎯 **Aplicabilidad**

- Permite cambiar algoritmos en tiempo de ejecución sin modificar el Contexto.

#### ⚙️ **Cómo implementarlo**

1. Definir la interfaz de estrategia.
2. Implementar estrategias concretas.
3. Permitir al Contexto cambiar la estrategia.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Alta flexibilidad.
- Promueve la reutilización de algoritmos.

**Contras:**
- Mayor complejidad por el número de clases.

#### 🔗 **Relaciones con otros patrones**

- State, Command, Template Method, Bridge.

---

#### **Uso en ERP:**

En un ERP, Strategy se utiliza para adaptar algoritmos de cálculo en función de diferentes normativas y condiciones, por ejemplo, estrategias de cálculo de impuestos, descuentos o precios. Esto permite que el sistema se adapte fácilmente a diferentes países o políticas comerciales sin alterar la lógica central.

---

### **Patrón de Diseño: Template Method**

#### 📌 **Propósito**

El patrón **Template Method** define el esqueleto de un algoritmo en una clase base, permitiendo que las subclases redefinan ciertos pasos sin cambiar la estructura general.

#### 🚩 **Problema**

- Duplicación de código y uso excesivo de condicionales para seleccionar variantes de un algoritmo.

#### 💡 **Solución**

- La clase base define el flujo general (método plantilla) y delega pasos variables a métodos abstractos o ganchos.

#### 🗂️ **Estructura**

1. Clase Abstracta.
2. Clases Concretas.
3. Ganchos (Hooks).

#### 📝 **Pseudocódigo**

```pseudocode
abstract class DataMiner {
    method mine() {
        openFile()
        extractData()
        processData()
        closeFile()
    }
    abstract method openFile()
    abstract method extractData()
    abstract method processData()
    method closeFile() { print("Cerrando archivo."); }
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
abstract class DataMiner {
    mine(): void {
        this.openFile();
        this.extractData();
        this.processData();
        this.closeFile();
    }
    abstract openFile(): void;
    abstract extractData(): void;
    abstract processData(): void;
    closeFile(): void { console.log("Cerrando archivo."); }
}

class PDFDataMiner extends DataMiner {
    openFile(): void { console.log("Abriendo archivo PDF"); }
    extractData(): void { console.log("Extrayendo datos del PDF"); }
    processData(): void { console.log("Procesando datos del PDF"); }
}

const miner = new PDFDataMiner();
miner.mine();
```

#### 🎯 **Aplicabilidad**

- Permite que las subclases personalicen partes específicas de un algoritmo sin alterar su estructura global.

#### ⚙️ **Cómo implementarlo**

1. Definir el método plantilla en una clase base.
2. Declarar métodos abstractos para los pasos variables.
3. Implementar subclases concretas.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Elimina duplicación de código.
- Facilita la extensión.

**Contras:**
- Menor flexibilidad en pasos definidos.

#### 🔗 **Relaciones con otros patrones**

- Factory Method, Strategy, Hook Methods.

---

#### **Uso en ERP:**

En un ERP, Template Method se utiliza para definir flujos de trabajo estándar que luego pueden ser personalizados. Por ejemplo, la generación de informes o la importación de datos sigue una estructura fija, pero permite que cada módulo (ventas, compras, inventario) implemente los pasos específicos para su tipo de datos.

---

### **Patrón de Diseño: Visitor**

#### 📌 **Propósito**

El patrón **Visitor** separa algoritmos de los objetos sobre los que operan, permitiendo añadir nuevas operaciones a estructuras complejas sin modificar las clases de los elementos.

#### 🚩 **Problema**

- Agregar nuevas operaciones en estructuras complejas requiere modificar todas las clases de elementos.

#### 💡 **Solución**

- Crear Visitors que implementen las operaciones y que los elementos acepten el Visitor a través de doble despacho.

#### 🗂️ **Estructura**

1. Visitor (Interfaz).
2. Concrete Visitor.
3. Element (Interfaz).
4. Concrete Element.
5. Cliente.

#### 📝 **Pseudocódigo**

```pseudocode
interface Visitor {
    method visitCity(City city)
    method visitIndustry(Industry industry)
    method visitTouristSite(TouristSite site)
}
```

#### Ejemplo Didáctico en TypeScript

```typescript
interface Visitor {
    visitCity(city: City): void;
    visitIndustry(industry: Industry): void;
}

interface Place {
    accept(visitor: Visitor): void;
}

class City implements Place {
    accept(visitor: Visitor): void { visitor.visitCity(this); }
}

class ExportToXMLVisitor implements Visitor {
    visitCity(city: City): void { console.log("Exportando ciudad a XML"); }
    visitIndustry(industry: Industry): void { console.log("Exportando industria a XML"); }
}

const places: Place[] = [new City()];
const visitor = new ExportToXMLVisitor();
places.forEach(place => place.accept(visitor));
```

#### 🎯 **Aplicabilidad**

- Añadir operaciones a estructuras complejas sin modificar sus clases.

#### ⚙️ **Cómo implementarlo**

1. Definir la interfaz Visitor.
2. Asegurar que cada elemento implemente `accept()`.
3. Implementar Visitors concretos.

#### ✅ **Pros y ❌ Contras**

**Pros:**
- Facilita la adición de nuevas operaciones.
- Se adhiere al principio de abierto/cerrado.

**Contras:**
- Requiere actualizar todos los Visitors al agregar nuevos elementos.

#### 🔗 **Relaciones con otros patrones**

- Composite, Iterator, Command, Double Dispatch.

---

#### **Uso en ERP:**

En un ERP, Visitor se emplea para recorrer estructuras jerárquicas (como árboles de categorías de productos o estructuras organizativas) y aplicar operaciones como exportación, auditoría o transformación de datos sin modificar la estructura de los objetos.

---

#### **Uso General en ERP para Todos los Patrones:**

En un entorno ERP, estos patrones se aplican de manera estratégica para mejorar la escalabilidad, mantenibilidad y flexibilidad del sistema. Algunos casos reales incluyen:

- **Gestión de Configuraciones y Conexiones (Singleton):**  
  Para centralizar la configuración del sistema, conexiones a bases de datos y servicios de seguridad.

- **Generación y Clonado de Documentos (Prototype, Builder, Template Method):**  
  Para crear y modificar facturas, órdenes de compra y reportes sin duplicar la lógica.

- **Integración de Módulos y Sistemas Legados (Abstract Factory, Adapter, Facade):**  
  Para unificar la comunicación entre módulos (ventas, inventario, contabilidad) y sistemas externos.

- **Optimización y Manejo de Recursos (Flyweight, Proxy):**  
  Para gestionar grandes volúmenes de datos (catálogos, transacciones) y controlar el acceso a recursos críticos.

- **Flujos de Trabajo y Procesos de Aprobación (Chain of Responsibility, State, Strategy):**  
  Para gestionar procesos de validación y aprobación de órdenes o transacciones a través de múltiples niveles.

- **Interacción y Comunicación entre Módulos (Mediator, Observer, Command):**  
  Para coordinar la comunicación entre módulos independientes y responder a eventos en tiempo real.

