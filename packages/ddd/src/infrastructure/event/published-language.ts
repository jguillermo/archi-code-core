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
  private readonly contracts = new Map<string, readonly PublishedContract[]>();

  expose(event: EventClass<EventBase>, contract: PublishedContract): this {
    const { eventName } = event;
    if (
      contract.name.trim() === '' ||
      !Number.isSafeInteger(contract.version) ||
      contract.version < 1
    ) {
      throw new InfrastructureException(
        `Event "${eventName}" needs a published name and a version from 1.`,
      );
    }
    const exposed = this.contracts.get(eventName) ?? [];
    if (
      exposed.some(
        (current) => current.name === contract.name && current.version === contract.version,
      )
    ) {
      throw new InfrastructureException(
        `Event "${eventName}" is already exposed as ${contract.name} v${contract.version}.`,
      );
    }
    this.contracts.set(eventName, [...exposed, contract]);
    return this;
  }

  isPublished(eventName: string): boolean {
    return this.contracts.has(eventName);
  }

  translate(event: SerializedEvent): readonly PublishedMessage[] {
    return Object.freeze(
      (this.contracts.get(event.eventName) ?? []).map((contract) =>
        Object.freeze({
          name: contract.name,
          version: contract.version,
          messageId: event.eventId,
          occurredOn: event.occurredOn,
          data: Object.freeze({ ...contract.data(event) }),
        }),
      ),
    );
  }
}
