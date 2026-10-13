import type {
  CryptoFunctionName,
  CryptoResponse,
  WorkerNotice,
} from '../../src/worker/crypto-functions';
import type { WorkerHandle } from '../../src/worker/worker-handle';

export function requester(handle: WorkerHandle, notices: WorkerNotice[] = []) {
  const waiting = new Map<number, (response: CryptoResponse) => void>();
  let nextId = 1;
  handle.onMessage((reply) => {
    if ('type' in reply) {
      notices.push(reply);
    } else {
      waiting.get(reply.id)?.(reply);
    }
  });
  return (fn: CryptoFunctionName, ...args: unknown[]) =>
    new Promise<CryptoResponse>((resolve) => {
      const id = nextId++;
      waiting.set(id, resolve);
      handle.post({ id, fn, args });
    });
}
