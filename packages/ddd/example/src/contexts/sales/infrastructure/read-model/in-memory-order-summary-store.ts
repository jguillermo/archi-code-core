import type { OrderSummaries } from '../../application/order-summaries/order-summaries';
import type { OrderSummary } from '../../application/order-summaries/order-summary';
import type { OrderSummaryStore } from '../../application/order-summaries/order-summary-store';

export class InMemoryOrderSummaryStore implements OrderSummaryStore, OrderSummaries {
  private readonly summaries = new Map<string, OrderSummary>();
  private readonly appliedEvents = new Set<string>();

  async find(orderId: string): Promise<OrderSummary | null> {
    return this.copy(this.summaries.get(orderId));
  }

  async hasApplied(eventId: string): Promise<boolean> {
    return this.appliedEvents.has(eventId);
  }

  async save(summary: OrderSummary, eventId: string): Promise<void> {
    this.summaries.set(summary.orderId, structuredClone(summary));
    this.appliedEvents.add(eventId);
  }

  async byId(orderId: string): Promise<OrderSummary | null> {
    return this.copy(this.summaries.get(orderId));
  }

  async ofCustomer(customerId: string): Promise<OrderSummary[]> {
    return Array.from(this.summaries.values())
      .filter((summary) => summary.customerId === customerId)
      .map((summary) => structuredClone(summary));
  }

  private copy(summary: OrderSummary | undefined): OrderSummary | null {
    return summary === undefined ? null : structuredClone(summary);
  }
}
