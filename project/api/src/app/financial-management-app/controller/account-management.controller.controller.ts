import { Body, Controller, Post } from '@nestjs/common';
import { CreateFinancialAccount, CreateFinancialAccountDto } from '@bounded-context/financial-management';

@Controller('account-management')
export class AccountManagementControllerController {
  constructor(private readonly _createFinancialAccount: CreateFinancialAccount) {}

  @Post('create-financial-account')
  public async createFinancialAccount(@Body() dto: CreateFinancialAccountDto) {
    await this._createFinancialAccount.execute(dto);
    return { status: 'success' };
  }
}
