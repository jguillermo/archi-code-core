import type { Clock } from '../../application/index';
import { CreatedAt } from '../../domain/index';

export class FixedClock implements Clock {
  private current: Date;

  constructor(at: Date | string) {
    this.current = new CreatedAt(at as Date).value;
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(at: Date | string): void {
    this.current = new CreatedAt(at as Date).value;
  }

  advance(milliseconds: number): void {
    this.current = new CreatedAt(new Date(this.current.getTime() + milliseconds)).value;
  }
}
