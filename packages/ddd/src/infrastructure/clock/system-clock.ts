import type { Clock } from '../../application/index';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
