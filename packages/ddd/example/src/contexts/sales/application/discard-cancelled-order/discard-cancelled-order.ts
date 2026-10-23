import type { AggregateFinder, AggregateRemover } from '../../../../ddd/domain';
import {
  AggregateNotFoundException,
  NotAllowedException,
  UseCase,
  ValueObjectBuilder,
} from '../../../../ddd/application';
import type { Order } from '../../domain/order/order';
import { OrderId } from '../../domain/order/order-id';
import { StaffRole, StaffRoleType } from '../../domain/staff/staff-role';

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
  constructor(private readonly orders: AggregateFinder<Order> & AggregateRemover<Order>) {
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
