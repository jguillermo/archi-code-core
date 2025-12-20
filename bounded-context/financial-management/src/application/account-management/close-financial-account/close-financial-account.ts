import { AccountRepository } from '../../../domain/account/account.repository';
import { CloseFinancialAccountDto } from './close-financial-account.dto';
import { AccountId } from '../../../domain/account/types/account-id';
import { AggregateNotFoundException } from '@code-core/domain';

export class CloseFinancialAccount {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(dto: CloseFinancialAccountDto): Promise<void> {
    const accountId = new AccountId(dto.accountId ?? '');

    // Buscar la cuenta por su ID
    const account = await this.accountRepository.findById(accountId.value);
    if (!account) {
      throw new AggregateNotFoundException('Account', accountId.value);
    }

    // // Nivel 2: Validar que no haya transacciones pendientes
    // if (level >= 2) {
    //   const transactions = await this.transactionRepository.findAllByAccount(accountId);
    //   if (transactions.length > 0) {
    //     throw new DomainException('Pending transactions must be resolved before closing the account');
    //   }
    // }
    //
    // // Nivel 3: Registrar evento de cierre
    // if (level >= 3) {
    //   account.recordClosure(userId || 'system');
    // }

    account.close();
    await this.accountRepository.persist(account);
  }
}
