import { describe, expect, expectTypeOf, it } from 'vitest';
import * as application from '../../src/application/index';
import type { Clock, EventBus } from '../../src/application/index';
import { EventListener } from '../../src/application/listener/event-listener';
import { ListensTo } from '../../src/application/listener/listens-to';
import { UseCase } from '../../src/application/use-case/use-case';
import type { EventBase } from '../../src/domain/index';

const PUBLIC_API = ['EventListener', 'ListensTo', 'UseCase'];

describe('@archi-code/ddd/application', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(application).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same classes the modules declare', () => {
    expect(application.UseCase).toBe(UseCase);
    expect(application.EventListener).toBe(EventListener);
    expect(application.ListensTo).toBe(ListensTo);
  });

  it('exports no repository contract: they belong to the domain', () => {
    expect(Object.keys(application).filter((name) => name.startsWith('Aggregate'))).toEqual([]);
  });

  it('exports the ports as types', () => {
    expectTypeOf<Clock>().toEqualTypeOf<{ now(): Date }>();
    expectTypeOf<EventBus['publish']>().toEqualTypeOf<
      (events: readonly EventBase[]) => Promise<void>
    >();
  });
});
