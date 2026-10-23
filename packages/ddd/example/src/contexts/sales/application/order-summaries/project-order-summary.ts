import { CreatedAt, UuidType } from '../../../../ddd/domain';
import { UseCase, ValueObjectBuilder } from '../../../../ddd/application';
import { OrderId } from '../../domain/order/order-id';
import type { OrderSummaryChanges } from './order-summary';
import type { OrderSummaryStore } from './order-summary-store';

export interface ProjectOrderSummaryInput {
  eventId: string;
  orderId: string;
  occurredOn: string;
  changes: OrderSummaryChanges;
}

export interface ProjectOrderSummaryCommand {
  eventId: UuidType;
  orderId: OrderId;
  occurredOn: CreatedAt;
  changes: OrderSummaryChanges;
}

export class ProjectOrderSummary extends UseCase<
  ProjectOrderSummaryInput,
  ProjectOrderSummaryCommand,
  void
> {
  constructor(private readonly store: OrderSummaryStore) {
    super();
  }

  protected toCommand(input: ProjectOrderSummaryInput): ProjectOrderSummaryCommand {
    return ValueObjectBuilder.build({
      eventId: () => new UuidType(input.eventId),
      orderId: () => new OrderId(input.orderId),
      occurredOn: () => new CreatedAt(input.occurredOn),
      changes: () => input.changes,
    });
  }

  protected async handle(command: ProjectOrderSummaryCommand): Promise<void> {
    const eventId = command.eventId.toString();
    if (await this.store.hasApplied(eventId)) {
      return;
    }
    const lastEventAt = command.occurredOn.toString();
    const current = (await this.store.find(command.orderId.value)) ?? {
      orderId: command.orderId.value,
      customerId: null,
      status: 'unknown',
      total: null,
      items: 0,
      trackingNumber: null,
      lastEventAt,
    };
    await this.store.save({ ...current, ...command.changes, lastEventAt }, eventId);
  }
}
