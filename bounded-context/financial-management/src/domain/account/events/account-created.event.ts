import { EventBase, PrimitiveTypes } from '@code-core/domain';
import { AccountTypes } from '../account.types';

export class AccountCreatedEvent extends EventBase {
  public readonly id: string;

  constructor(data: Required<PrimitiveTypes<AccountTypes>>) {
    super();
    this.id = data.id;
  }

  eventName(): string {
    return 'financial-management.account.created';
  }
}
