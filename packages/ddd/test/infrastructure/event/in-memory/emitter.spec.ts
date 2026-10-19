import { describe, expect, it } from 'vitest';
import { EventDeliveryException } from '../../../../src/exceptions/index';
import { Emitter } from '../../../../src/infrastructure/event/in-memory/emitter';

describe('Emitter: the emittery techniques behind the in-memory channel', () => {
  it('calls the listeners of a name with the data, and only them', async () => {
    const emitter = new Emitter<string>();
    const stock: string[] = [];
    const invoices: string[] = [];
    emitter.on('OrderPlaced', (orderId) => void stock.push(orderId));
    emitter.on('OrderShipped', (orderId) => void invoices.push(orderId));

    await emitter.emitSerial('OrderPlaced', 'ORD-1');
    await emitter.emit('OrderPlaced', 'ORD-2');

    expect(stock).toStrictEqual(['ORD-1', 'ORD-2']);
    expect(invoices).toStrictEqual([]);
  });

  it('adds the same listener once, like a Set', async () => {
    const emitter = new Emitter<string>();
    const calls: string[] = [];
    const reserve = (orderId: string) => void calls.push(orderId);
    emitter.on('OrderPlaced', reserve);
    emitter.on('OrderPlaced', reserve);

    await emitter.emitSerial('OrderPlaced', 'ORD-1');

    expect(calls).toStrictEqual(['ORD-1']);
  });

  it('returns an unsubscribe function that can be called more than once', async () => {
    const emitter = new Emitter<string>();
    const calls: string[] = [];
    const off = emitter.on('OrderPlaced', (orderId) => void calls.push(orderId));

    off();
    off();
    await emitter.emit('OrderPlaced', 'ORD-1');

    expect(calls).toStrictEqual([]);
  });

  it('unsubscribing one listener keeps the others of the same name', async () => {
    const emitter = new Emitter<string>();
    const calls: string[] = [];
    emitter.on('OrderPlaced', (orderId) => void calls.push(orderId));
    const off = emitter.on('OrderPlaced', () => undefined);

    off();
    await emitter.emitSerial('OrderPlaced', 'ORD-1');

    expect(calls).toStrictEqual(['ORD-1']);
  });

  it('resolves an emit without listeners, after a microtask', async () => {
    const emitter = new Emitter<string>();
    const steps: string[] = [];
    const emitting = emitter.emit('OrderPlaced', 'ORD-1').then(() => steps.push('emitted'));
    steps.push('after emit');
    await emitting;
    expect(steps).toStrictEqual(['after emit', 'emitted']);
  });

  it('subscribes again after the last listener of a name left', async () => {
    const emitter = new Emitter<string>();
    const calls: string[] = [];
    emitter.on('OrderPlaced', () => undefined)();
    emitter.on('OrderPlaced', (orderId) => void calls.push(orderId));

    await emitter.emit('OrderPlaced', 'ORD-1');

    expect(calls).toStrictEqual(['ORD-1']);
  });

  it('emit skips a listener removed by an earlier one of the same emit', async () => {
    const emitter = new Emitter<string>();
    const calls: string[] = [];
    let offConfirm: () => void = () => undefined;
    emitter.on('OrderPlaced', () => offConfirm());
    offConfirm = emitter.on('OrderPlaced', (orderId) => void calls.push(orderId));

    await emitter.emit('OrderPlaced', 'ORD-1');

    expect(calls).toStrictEqual([]);
  });

  it('emit settles every listener before reporting the failures', async () => {
    const emitter = new Emitter<string>();
    const calls: string[] = [];
    emitter.on('OrderPlaced', () => {
      throw new Error('warehouse offline');
    });
    emitter.on('OrderPlaced', async (orderId) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      calls.push(orderId);
    });

    await expect(emitter.emit('OrderPlaced', 'ORD-1')).rejects.toThrow(EventDeliveryException);
    expect(calls).toStrictEqual(['ORD-1']);
  });
});
