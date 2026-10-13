import type { CryptoResponse } from '../../src/worker/crypto-functions';
import type {
  WorkerFactory,
  WorkerHandle,
  WorkerMessage,
  WorkerRuntime,
} from '../../src/worker/worker-handle';

export class FakeHandle implements WorkerHandle {
  posted: WorkerMessage[] = [];
  alive: boolean[] = [];
  terminated = false;
  private listener: (response: CryptoResponse) => void = () => undefined;
  private failure: (error: Error) => void = () => undefined;

  post(message: WorkerMessage): void {
    this.posted.push(message);
  }

  onMessage(listener: (response: CryptoResponse) => void): void {
    this.listener = listener;
  }

  onFailure(listener: (error: Error) => void): void {
    this.failure = listener;
  }

  keepAlive(active: boolean): void {
    this.alive.push(active);
  }

  terminate(): void {
    this.terminated = true;
  }

  respond(response: CryptoResponse): void {
    this.listener(response);
  }

  fail(error: Error): void {
    this.failure(error);
  }

  requests(): number[] {
    return this.posted.flatMap((message) => ('id' in message ? [message.id] : []));
  }
}

export function fakeFactory(runtime: WorkerRuntime = 'worker-threads') {
  const handles: FakeHandle[] = [];
  const factory: WorkerFactory = {
    runtime,
    create: () => {
      const handle = new FakeHandle();
      handles.push(handle);
      return handle;
    },
  };
  return { handles, factory };
}

export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
