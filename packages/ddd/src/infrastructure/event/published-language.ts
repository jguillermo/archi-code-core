import type { EventBase, EventClass, SerializedEvent } from '../../domain/index';
import { InfrastructureException } from '../../exceptions/index';

export interface PublishedMessage {
  readonly name: string;
  readonly version: number;
  readonly messageId: string;
  readonly occurredOn: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface PublishedContract {
  readonly name: string;
  readonly version: number;
  data(event: SerializedEvent): Record<string, unknown>;
}

export class PublishedLanguage {
  private readonly contracts = new Map<string, PublishedContract>();

  expose(event: EventClass<EventBase>, contract: PublishedContract): this {
    const { eventName } = event;
    if (this.contracts.has(eventName)) {
      throw new InfrastructureException(`Event "${eventName}" is already exposed.`);
    }
    if (
      contract.name.trim() === '' ||
      !Number.isSafeInteger(contract.version) ||
      contract.version < 1
    ) {
      throw new InfrastructureException(
        `Event "${eventName}" needs a published name and a version from 1.`,
      );
    }
    this.contracts.set(eventName, contract);
    return this;
  }

  isPublished(eventName: string): boolean {
    return this.contracts.has(eventName);
  }

  translate(event: SerializedEvent): PublishedMessage | null {
    const contract = this.contracts.get(event.eventName);
    if (contract === undefined) {
      return null;
    }
    return Object.freeze({
      name: contract.name,
      version: contract.version,
      messageId: event.eventId,
      occurredOn: event.occurredOn,
      data: Object.freeze({ ...contract.data(event) }),
    });
  }
}
