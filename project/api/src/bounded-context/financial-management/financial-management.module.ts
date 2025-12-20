import { Module } from '@nestjs/common';
import { AccountInMemoryRepository } from './infrastructure/repository/AccountInMemoryRepository';
import { AccountRepository, CreateFinancialAccount } from '@bounded-context/financial-management';

@Module({
  imports: [],
  providers: [
    {
      provide: AccountRepository,
      useClass: AccountInMemoryRepository,
    },

    {
      provide: CreateFinancialAccount,
      useFactory: (accountRepository: AccountRepository) => new CreateFinancialAccount(accountRepository),
      inject: [AccountRepository],
    },
  ],
  exports: [CreateFinancialAccount],
})
export class FinancialManagementModule {}
