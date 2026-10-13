import { resolveObjectURL } from 'buffer';
import { createContext, runInContext } from 'vm';

type Listener = ((event: { data: unknown }) => void) | null;

export class FakeWebWorker {
  static created: FakeWebWorker[] = [];

  onmessage: Listener = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  terminated = false;
  private inbox: ((event: { data: unknown }) => void) | null = null;
  private queue: unknown[] = [];

  constructor(url: string) {
    FakeWebWorker.created.push(this);
    const blob = resolveObjectURL(url);
    if (!blob) {
      throw new Error(`No blob for ${url}`);
    }
    void blob.text().then((source) => this.start(source));
  }

  postMessage(message: unknown): void {
    if (this.inbox) {
      this.deliver(message);
    } else {
      this.queue.push(message);
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  fail(message?: string): void {
    this.onerror?.({ message });
  }

  private start(source: string): void {
    const scope: { onmessage?: Listener; postMessage: (data: unknown) => void } = {
      postMessage: (data: unknown) => setTimeout(() => this.onmessage?.({ data })),
    };
    const context = createContext(
      Object.assign(scope, { TextEncoder, TextDecoder, crypto, console }),
    );
    runInContext('var self = globalThis;', context);
    runInContext(source, context);
    this.inbox = (event) => scope.onmessage?.(event);
    for (const message of this.queue.splice(0)) {
      this.deliver(message);
    }
  }

  private deliver(message: unknown): void {
    setTimeout(() => this.inbox?.({ data: message }));
  }
}
