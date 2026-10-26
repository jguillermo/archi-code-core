import {
  AggregateNotFoundException,
  NotAllowedException,
  UseCase,
  ValueObjectBuilder,
} from '../../../../ddd/application';
import type { OrderRepository } from '../../domain/repository/OrderRepository';
import { OrderId } from '../../domain/value-object/OrderId';
import { StaffRole } from '../../domain/value-object/StaffRoleType';
import { StaffRoleType } from '../../domain/value-object/StaffRoleType';

export interface DiscardCancelledOrderInput {
  actorRole: string;
  orderId: string;
}

export interface DiscardCancelledOrderCommand {
  actorRole: StaffRoleType;
  orderId: OrderId;
}

export class DiscardCancelledOrder extends UseCase<
  DiscardCancelledOrderInput,
  DiscardCancelledOrderCommand,
  void
> {
  constructor(private readonly orders: OrderRepository) {
    super();
  }

  protected toCommand(input: DiscardCancelledOrderInput): DiscardCancelledOrderCommand {
    return ValueObjectBuilder.build({
      actorRole: () => new StaffRoleType(input.actorRole as StaffRole),
      orderId: () => new OrderId(input.orderId),
    });
  }

  protected async handle(command: DiscardCancelledOrderCommand): Promise<void> {
    if (command.actorRole.value !== StaffRole.ADMIN) {
      throw new NotAllowedException(`The role ${command.actorRole.value} may not discard orders`);
    }
    const order = await this.orders.findById(command.orderId);
    if (order === null) {
      throw new AggregateNotFoundException('Order', command.orderId.value);
    }
    order.assertDiscardable();
    await this.orders.remove(order);
  }
}
