import { SortablePath } from './path';

export type SortDirection = 'asc' | 'desc';

export type OrderItem<T> = Readonly<Partial<Record<SortablePath<T>, SortDirection>>>;

export type OrderBy<T> = OrderItem<T> | readonly OrderItem<T>[];

export interface OrderNode {
  readonly field: string;
  readonly direction: SortDirection;
}
