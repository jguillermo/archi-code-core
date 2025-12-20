import { describe, expect, it } from '@jest/globals';
import { EventBase } from '../event/event-base';
import { AggregateRoot } from './aggregate-root';

class TestEventBase extends EventBase {
  eventName(): string {
    return 'event.aggregate';
  }
}

class TestAggregateRoot extends AggregateRoot {
  static create() {
    const aggregate = new TestAggregateRoot();
    aggregate.record(new TestEventBase());
    return aggregate;
  }
}

describe('TestAggregateRoot', () => {
  it('eventName', () => {
    const aggregate = TestAggregateRoot.create();
    const event = aggregate.pullDomainEvents();
    const eventempty = aggregate.pullDomainEvents();

    expect(event.length).toEqual(1);
    expect(eventempty.length).toEqual(0);
    expect(event[0].eventName()).toEqual('event.aggregate');
  });
});
