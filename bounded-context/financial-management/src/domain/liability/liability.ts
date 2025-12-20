import { DomainException } from '@code-core/domain';
import { LiabilityDescription } from './types/liability-description';
import { LiabilityId } from './types/liability-id';
import { LiabilityAmount } from './types/liability-amount';
import { LiabilityCreationDate } from './types/liability-creation-date';
import { LiabilityDueDate } from './types/liability-due-date';
import { LiabilityCreditorEntity } from './types/liability-creditor-entity';
import { LiabilityTypes } from './liability.types';

/*
 * Propósito: Maneja los pasivos financieros, como préstamos, cuentas por pagar, y obligaciones fiscales.
 * Este Aggregate asegura que los pasivos sean rastreados y gestionados correctamente.
 * Uso: Este Aggregate se utiliza para garantizar la trazabilidad y manejo adecuado de las obligaciones financieras,
 * así como para calcular métricas clave en los reportes.
 */
export class Liability {
  constructor(
    private readonly id: LiabilityId, // Nivel 1: Identificador único del pasivo
    private readonly description: LiabilityDescription, // Nivel 1: Descripción del pasivo
    private readonly amount: LiabilityAmount, // Nivel 1: Monto total del pasivo
    private readonly creationDate: LiabilityCreationDate, // Nivel 1: Fecha en que se registró el pasivo.
    private readonly dueDate: LiabilityDueDate, // Nivel 2: Fecha de vencimiento (opcional).
    private readonly creditorEntity: LiabilityCreditorEntity, // Nivel 2: Información sobre el acreedor (opcional).
  ) {}

  static create(data: LiabilityTypes): Liability {
    return new Liability(data.id, data.description, data.amount, data.creationDate, data.dueDate, data.creditorEntity);
  }

  /*
   * Verifica si el pasivo está vencido.
   */
  isOverdue(): boolean {
    return this.dueDate.value ? new Date() > this.dueDate.value : false;
  }

  /*
   * Registra un pago parcial o total del pasivo.
   */
  recordPayment(paymentAmount: number): void {
    if (paymentAmount > this.amount.value) {
      throw new DomainException('Payment amount exceeds the total liability amount');
    }
    this.amount.recordPayment(paymentAmount);
  }

  /*
   * Verifica si el pasivo ha sido liquidado en su totalidad.
   */
  isFullyPaid(): boolean {
    return this.amount.value === 0;
  }
}
