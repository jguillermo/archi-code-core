import { TransactionId } from './types/transaction-id';
import { TransactionDate } from './types/transaction-date';
import { TransactionAccountId } from './types/transaction-account-id';
import { TransactionAmount } from './types/transaction-amount';
import { TransactionDescription } from './types/transaction-description';
import { TransactionCategory } from './types/transaction-category';
import { TransactionListTag } from './types/transaction-list-tag';
import { TransactionTypes } from './transaction-types';

/*
 * Propósito: Registra los movimientos financieros entre cuentas, como ingresos, gastos, transferencias internas y ajustes contables.
 * Este Aggregate asegura la trazabilidad de todas las operaciones financieras.
 * Uso: Este Aggregate asegura que las transacciones sean registradas de manera consistente
 * y puedan ser usadas para auditorías, reportes financieros, y análisis avanzados.
 */
export class Transaction {
  constructor(
    private readonly id: TransactionId, // Nivel 1: Identificador único de la transacción
    private readonly transactionDate: TransactionDate, // Nivel 1: Fecha en que ocurrió la transacción.
    private readonly fromAccountId: TransactionAccountId, // Nivel 1: Identificador de las cuentas de origen (solo ID para evitar acoplamiento)
    private readonly toAccountId: TransactionAccountId, // Nivel 1:Identificador de las cuentas de destino. (solo ID para evitar acoplamiento)
    private readonly amount: TransactionAmount, // Nivel 1: Monto transferido. (positivo para ingresos, negativo para egresos)
    private readonly description: TransactionDescription, // Nivel 1: Descripción de la transacción
    private readonly category: TransactionCategory, // Nivel 2: Categoría de la transacción (opcional).
    private readonly tags: TransactionListTag, // Nivel 3: Etiquetas para clasificar transacciones (opcional).
  ) {}

  static create(data: TransactionTypes): Transaction {
    return new Transaction(data.id, data.transactionDate, data.fromAccountId, data.toAccountId, data.amount, data.description, data.category, data.tags);
  }
}
