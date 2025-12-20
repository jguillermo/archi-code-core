import { AccountId } from './types/account-id';
import { AggregateRoot, CreatedAt, DomainException, PrimitiveTypes, UpdatedAt } from '@code-core/domain';
import { AccountName } from './types/account-name';
import { AccountType } from './types/account-type';
import { AccountTypes } from './account.types';
import { AccountCurrency } from './types/account-currency';
import { AccountBalance } from './types/account-balance';
import { AccountFinancialEntity } from './types/account-financial-entity';
import { AccountNumber } from './types/account-number';
import { AccountListTag } from './types/account-list-tag';
import { AccountCreatedEvent } from './events/account-created.event';
import { AccountStatus } from './types/account-status';

/*
 * Propósito: Gestiona las cuentas financieras, ya sean reales (como cuentas bancarias, efectivo)
 * o virtuales (como ingresos simbólicos o categorías de gasto).
 * Uso: Este Aggregate es clave para registrar transacciones, generar reportes financieros, y categorizar el flujo de fondos.
 * También mantiene las invariantes de negocio relacionadas con los saldos.
 */
export class Account extends AggregateRoot {
  constructor(
    private readonly _id: AccountId, // Nivel 1: Identificador único de la cuenta
    private readonly name: AccountName, // Nivel 1: Nombre descriptivo de la cuenta
    private readonly type: AccountType, // Nivel 1: Tipo de cuenta (Real o Virtual)
    private readonly currency: AccountCurrency, // Nivel 1: Moneda en la que opera la cuenta
    private balance: AccountBalance, // Nivel 1: Saldo de la cuenta (Solo para cuentas reales)
    private readonly status: AccountStatus, // Nivel 1: Saldo de la cuenta (Solo para cuentas reales)
    private readonly financialEntity: AccountFinancialEntity, // Nivel 2: Entidad financiera asociada (solo para cuentas bancarias o tarjetas de crédito)
    private readonly number: AccountNumber, // Nivel 2: Número de cuenta (solo para cuentas reales)
    private readonly tags: AccountListTag, // Nivel 3: Etiquetas para clasificar la cuenta (ej: "Proyecto A", "Centro de Costos")
    private readonly creationDate: CreatedAt, // nivel 1: Fecha de creación de la cuenta
    private readonly lastUpdated: UpdatedAt, // nivel 1: Fecha de actualization
  ) {
    super();
    if (this.type.isVirtual()) {
      this.balance = new AccountBalance(0);
    }
  }

  static create(data: AccountTypes): Account {
    const aggregate = new Account(
      data.id,
      data.name,
      data.type,
      data.currency,
      data.balance,
      AccountStatus.active(),
      data.financialEntity,
      data.number,
      data.tags,
      CreatedAt.now(),
      UpdatedAt.now(),
    );
    aggregate.record(new AccountCreatedEvent(aggregate.toJson()));
    return aggregate;
  }

  get id(): AccountId {
    return this._id;
  }

  toJson(): PrimitiveTypes<AccountTypes> {
    return {
      id: this._id.value,
      name: this.name.value,
      type: this.type.value,
      currency: this.currency.value,
      balance: this.balance.value,
      status: this.status.value,
      financialEntity: this.financialEntity.value,
      number: this.number.value,
      tags: this.tags.value,
      creationDate: this.creationDate.value,
      lastUpdated: this.lastUpdated.value,
    };
  }

  /*
   * Método para validar que el saldo sea cero antes de cerrar la cuenta.
   */
  validateZeroBalance(): void {
    if (this.balance.value !== 0) {
      throw new DomainException('Account balance must be zero to close the account');
    }
  }

  /*
   * Incrementa el saldo de una cuenta real.
   */
  addFunds(amount: number): void {
    if (this.type.isReal()) {
      this.balance = this.balance.addFunds(amount);
    } else {
      throw new DomainException('Cannot add funds to a virtual account');
    }
  }

  /*
   * Disminuye el saldo de una cuenta real.
   */
  withdrawFunds(amount: number): void {
    if (this.type.isReal()) {
      this.balance = this.balance.withdrawFunds(amount);
    } else {
      throw new DomainException('Cannot withdraw funds from a virtual account');
    }
  }

  /*
   * Agrega una etiqueta a la cuenta.
   */
  addTag(tag: string): void {
    this.tags.addItem(tag);
  }

  removeTag(tag: string): void {
    this.tags.removeItem(tag);
  }

  /*
   * Método para cerrar la cuenta
   */
  close(): void {
    if (this.status.isClosed()) {
      throw new DomainException('Account is already closed');
    }
    this.validateZeroBalance();
    this.status.toClose();
    this.lastUpdated.setNow();
  }
}
