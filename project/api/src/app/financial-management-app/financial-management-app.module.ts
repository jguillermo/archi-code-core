import { Module } from '@nestjs/common';
import { AccountManagementControllerController } from './controller/account-management.controller.controller';
import { FinancialManagementModule } from '../../bounded-context/financial-management/financial-management.module';

@Module({
  controllers: [AccountManagementControllerController],
  imports: [FinancialManagementModule],
})
export class FinancialManagementAppModule {}
