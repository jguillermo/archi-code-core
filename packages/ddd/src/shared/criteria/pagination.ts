export interface OffsetPagination {
  readonly kind: 'offset';
  readonly limit: number | null;
  readonly offset: number;
}

export type Pagination = OffsetPagination;
