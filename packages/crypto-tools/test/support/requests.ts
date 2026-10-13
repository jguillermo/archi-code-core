import type { CryptoFunctionName, CryptoResponse } from '../../src/worker/crypto-functions';
import type { WorkerHandle } from '../../src/worker/worker-handle';

export function requester(handle: WorkerHandle) {
  const waiting = new Map<number, (response: CryptoResponse) => void>();
  let nextId = 1;
  handle.onMessage((response) => waiting.get(response.id)?.(response));
  return (fn: CryptoFunctionName, ...args: unknown[]) =>
    new Promise<CryptoResponse>((resolve) => {
      const id = nextId++;
      waiting.set(id, resolve);
      handle.post({ id, fn, args });
    });
}
