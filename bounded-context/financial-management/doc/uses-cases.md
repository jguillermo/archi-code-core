### **Gestión de Cuentas (Reales y Virtuales)**

Account Management (Real and Virtual)

#### 1. **CreateFinancialAccount** DONE

- **Propósito**: Crea una nueva cuenta (real o virtual) con su información inicial.
- **Aggregates Involucrados**: `Account`.
- **Datos del DTO**:
  - `accountName`: Nombre de la cuenta.
  - `accountType`: Real o virtual.
  - `currency`: Moneda de la cuenta.
  - `initialBalance`: Saldo inicial (opcional para cuentas reales).
  - `tags`: Etiquetas asociadas (opcional, Nivel 3).
- **Nivel**: 1.

---

#### 2. **CloseFinancialAccount**

- **Propósito**: Cierra una cuenta tras validar que no tenga saldo ni transacciones pendientes.
- **Aggregates Involucrados**: `Account`, `Transaction`.
- **Datos del DTO**:
  - `accountId`: Identificador de la cuenta a cerrar.
- **Nivel**: 1.

---

#### 3. **CategorizeAccounts**

- **Propósito**: Clasifica cuentas según etiquetas, categorías o tipos.
- **Aggregates Involucrados**: `Account`.
- **Datos del DTO**:
  - `accountId`: Identificador de la cuenta.
  - `categories`: Lista de categorías a asignar.
  - `tags`: Lista de etiquetas a asignar (opcional, Nivel 3).
- **Nivel**: 2.

---

#### 4. **UpdateFinancialAccountDetails**

- **Propósito**: Actualiza información clave de una cuenta.
- **Aggregates Involucrados**: `Account`.
- **Datos del DTO**:
  - `accountId`: Identificador de la cuenta.
  - `accountName`: Nuevo nombre de la cuenta (opcional).
  - `financialEntity`: Nueva entidad financiera asociada (opcional).
  - `tags`: Nuevas etiquetas (opcional, Nivel 3).
- **Nivel**: 2.

---

#### 5. **MergeFinancialAccounts**

- **Propósito**: Fusiona varias cuentas en una sola, consolidando saldos y transacciones.
- **Aggregates Involucrados**: `Account`, `Transaction`.
- **Datos del DTO**:
  - `sourceAccountIds`: Lista de IDs de las cuentas origen.
  - `destinationAccountId`: ID de la cuenta destino.
- **Nivel**: 3.

---

### **Gestión de Activos**

Asset Management

#### 6. **RegisterNewAsset**

- **Propósito**: Registra un nuevo activo con sus detalles iniciales.
- **Aggregates Involucrados**: `Asset`.
- **Datos del DTO**:
  - `assetName`: Nombre del activo.
  - `acquisitionDate`: Fecha de adquisición.
  - `acquisitionValue`: Valor inicial.
  - `usefulLife`: Vida útil estimada.
  - `depreciationMethod`: Método de depreciación (lineal, saldo decreciente).
  - `residualValue`: Valor residual.
  - `associatedCosts`: Lista de costos asociados (opcional).
- **Nivel**: 1.

---

#### 7. **UpdateAssetInformation**

- **Propósito**: Modifica los detalles de un activo existente.
- **Aggregates Involucrados**: `Asset`.
- **Datos del DTO**:
  - `assetId`: Identificador del activo.
  - `usefulLife`: Nueva vida útil (opcional).
  - `residualValue`: Nuevo valor residual (opcional).
  - `associatedCosts`: Nuevos costos asociados (opcional).
- **Nivel**: 2.

---

#### 8. **CalculateAssetDepreciation**

- **Propósito**: Calcula la depreciación anual de activos registrados.
- **Aggregates Involucrados**: `Asset`.
- **Datos del DTO**:
  - `assetIds`: Lista de identificadores de activos (opcional, para procesar activos específicos).
- **Nivel**: 2.

---

#### 9. **RecordAssetDepreciation**

- **Propósito**: Registra los ajustes contables relacionados con la depreciación.
- **Aggregates Involucrados**: `Asset`, `Transaction`.
- **Datos del DTO**:
  - `assetIds`: Lista de identificadores de activos.
- **Nivel**: 3.

---

#### 10. **AnalyzeAssetExpenses**

- **Propósito**: Analiza los costos asociados a activos registrados.
- **Aggregates Involucrados**: `Asset`.
- **Datos del DTO**:
  - `filters`: Filtros opcionales para el análisis (por tipo de costo, rango de fechas, etc.).
- **Nivel**: 3.

---

### **Gestión de Pasivos**

Liability Management

#### 11. **AddNewLiability**

- **Propósito**: Registra un nuevo pasivo financiero.
- **Aggregates Involucrados**: `Liability`.
- **Datos del DTO**:
  - `description`: Descripción del pasivo.
  - `amount`: Monto total del pasivo.
  - `dueDate`: Fecha de vencimiento.
  - `creditorEntity`: Entidad acreedora.
- **Nivel**: 1.

---

#### 12. **UpdateLiabilityDetails**

- **Propósito**: Modifica información de un pasivo.
- **Aggregates Involucrados**: `Liability`.
- **Datos del DTO**:
  - `liabilityId`: Identificador del pasivo.
  - `amount`: Nuevo monto (opcional).
  - `dueDate`: Nueva fecha de vencimiento (opcional).
- **Nivel**: 2.

---

#### 13. **ProcessLiabilityPayment**

- **Propósito**: Registra un pago parcial o total realizado para un pasivo.
- **Aggregates Involucrados**: `Liability`, `Transaction`.
- **Datos del DTO**:
  - `liabilityId`: Identificador del pasivo.
  - `amount`: Monto pagado.
- **Nivel**: 1.

---

#### 14. **GenerateLiabilityPaymentPlan**

- **Propósito**: Crea un plan de pagos para pasivos según prioridades.
- **Aggregates Involucrados**: `Liability`.
- **Datos del DTO**:
  - `prioritizationRules`: Reglas para priorizar pagos (opcional).
- **Nivel**: 2.

---

#### 15. **EvaluateLiabilityStatus**

- **Propósito**: Proporciona un resumen del estado actual de los pasivos.
- **Aggregates Involucrados**: `Liability`.
- **Datos del DTO**:
  - `filters`: Filtros opcionales para análisis (por vencimiento, estado, etc.).
- **Nivel**: 2.

---

### **Gestión de Transacciones**

Transaction Management

#### 16. **LogFinancialTransaction**

- **Propósito**: Registra una nueva transacción financiera.
- **Aggregates Involucrados**: `Transaction`, `Account`.
- **Datos del DTO**:
  - `fromAccountId`: Cuenta de origen.
  - `toAccountId`: Cuenta de destino.
  - `amount`: Monto.
  - `description`: Descripción.
  - `category`: Categoría de la transacción.
  - `tags`: Etiquetas asociadas (opcional).
- **Nivel**: 1.

---

#### 17. **InitiateFundsTransfer**

- **Propósito**: Transfiere fondos entre cuentas.
- **Aggregates Involucrados**: `Account`, `Transaction`.
- **Datos del DTO**:
  - `fromAccountId`: Cuenta origen.
  - `toAccountId`: Cuenta destino.
  - `amount`: Monto.
- **Nivel**: 1.

---

#### 18. **AssignTransactionCategory**

- **Propósito**: Asigna categorías a una transacción existente.
- **Aggregates Involucrados**: `Transaction`.
- **Datos del DTO**:
  - `transactionId`: Identificador de la transacción.
  - `category`: Nueva categoría.
- **Nivel**: 2.

### **Reportes Financieros**

Financial Reporting

#### 19. **GenerateFinancialBalanceSheet**

- **Propósito**: Genera un balance general consolidado que incluye activos, pasivos y patrimonio neto.
- **Aggregates Involucrados**: `Account`, `Asset`, `Liability`.
- **Datos del DTO**:
  - `asOfDate`: Fecha de corte para el balance.
  - `filters`: Filtros opcionales, como etiquetas o categorías.
- **Nivel**: 1.

---

#### 20. **GenerateProfitAndLossStatement**

- **Propósito**: Genera un estado de resultados con ingresos, gastos y utilidad neta en un período específico.
- **Aggregates Involucrados**: `Transaction`, `Account`.
- **Datos del DTO**:
  - `startDate`: Fecha de inicio del período.
  - `endDate`: Fecha de fin del período.
  - `filters`: Filtros opcionales, como etiquetas o categorías.
- **Nivel**: 2.

---

#### 21. **GenerateCashFlowAnalysis**

- **Propósito**: Detalla el flujo de efectivo entrante y saliente, clasificándolo por categorías o períodos.
- **Aggregates Involucrados**: `Transaction`, `Account`.
- **Datos del DTO**:
  - `startDate`: Fecha de inicio del análisis.
  - `endDate`: Fecha de fin del análisis.
  - `groupBy`: Parámetro opcional para agrupar datos (categorías, períodos).
- **Nivel**: 2.

---

#### 22. **AnalyzeTransactionsByCategory**

- **Propósito**: Proporciona un análisis financiero basado en categorías específicas de transacciones.
- **Aggregates Involucrados**: `Transaction`.
- **Datos del DTO**:
  - `category`: Categoría a analizar.
  - `startDate`: Fecha de inicio del análisis.
  - `endDate`: Fecha de fin del análisis.
- **Nivel**: 2.

---

#### 23. **EvaluateTaggedTransactions**

- **Propósito**: Genera un análisis detallado de transacciones agrupadas por etiquetas relevantes.
- **Aggregates Involucrados**: `Transaction`.
- **Datos del DTO**:
  - `tags`: Lista de etiquetas a analizar.
  - `startDate`: Fecha de inicio del análisis.
  - `endDate`: Fecha de fin del análisis.
- **Nivel**: 3.

---

#### 24. **CreateCustomFinancialReport**

- **Propósito**: Permite generar reportes financieros personalizados combinando categorías, etiquetas y períodos específicos.
- **Aggregates Involucrados**: `Transaction`, `Account`, `Asset`, `Liability`.
- **Datos del DTO**:
  - `parameters`: Configuración personalizada para el reporte (categorías, etiquetas, fechas, agrupaciones).
- **Nivel**: 3.

---

### **Integraciones y Configuración**

Integrations and Configuration

#### 25. **SetCurrencyExchangeRates**

- **Propósito**: Configura las tasas de cambio para la conversión de monedas en cuentas y transacciones.
- **Aggregates Involucrados**: `Account`, `Transaction`.
- **Datos del DTO**:
  - `currencyPairs`: Lista de pares de monedas (ej. USD/EUR).
  - `rates`: Tasas de conversión para cada par.
  - `effectiveDate`: Fecha de vigencia de las tasas.
- **Nivel**: 2.

---

#### 26. **DefineTagsAndCategories**

- **Propósito**: Configura y actualiza las etiquetas y categorías disponibles en el sistema financiero.
- **Aggregates Involucrados**: `Account`, `Transaction`.
- **Datos del DTO**:
  - `categories`: Lista de nuevas categorías a definir o actualizar.
  - `tags`: Lista de nuevas etiquetas a definir o actualizar.
- **Nivel**: 2.

---

### **Niveles Detallados de los Casos de Uso**

| Nivel | Descripción                                                                                  |
| ----- | -------------------------------------------------------------------------------------------- |
| **1** | Funcionalidades esenciales del sistema, como creación de cuentas, registro de transacciones. |
| **2** | Funcionalidades intermedias, como análisis por categorías, conciliaciones o planes.          |
| **3** | Funcionalidades avanzadas, como reportes personalizados y análisis detallados por etiquetas. |
