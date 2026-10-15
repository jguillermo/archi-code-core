import { CriteriaError } from './criteria-error';
import { CriteriaInput, CriteriaNodes, inputToNodes, paginationOf } from './criteria-input';
import { CriteriaJson, decodeCriteria, encodeCriteria } from './criteria-json';
import { decodeUrlText, encodeUrlText } from './criteria-url';
import { FilterNode } from './filter-node';
import { freezeFilter, freezeOrder, freezePagination } from './freeze-nodes';
import { normalizeOrderBy } from './normalize-order';
import { normalizeWhere } from './normalize-where';
import { OrderBy, OrderNode } from './order';
import { Pagination } from './pagination';
import { Where } from './where';

export interface CriteriaChecker<T> {
  check(criteria: Criteria<T>): Criteria<T>;
}

function andChildren(node: FilterNode): readonly FilterNode[] {
  return node.kind === 'and' ? node.filters : [node];
}

export class Criteria<T> {
  declare private readonly entity?: (entity: T) => T;

  private constructor(
    readonly filter: FilterNode | null,
    readonly order: readonly OrderNode[],
    readonly pagination: Pagination | null,
  ) {
    Object.freeze(this);
  }

  static create<T>(input: CriteriaInput<T> = {}): Criteria<T> {
    return Criteria.fromNodes<T>(inputToNodes(input));
  }

  static fromNodes<T>(nodes: CriteriaNodes): Criteria<T> {
    return new Criteria<T>(
      nodes.filter == null ? null : freezeFilter(nodes.filter),
      freezeOrder(nodes.order ?? []),
      freezePagination(nodes.pagination),
    );
  }

  static fromJSON<T>(json: unknown, schema?: CriteriaChecker<T>): Criteria<T> {
    const criteria = Criteria.fromNodes<T>(decodeCriteria(json));
    return schema === undefined ? criteria : schema.check(criteria);
  }

  static fromUrl<T>(text: string, schema?: CriteriaChecker<T>): Criteria<T> {
    return Criteria.fromJSON<T>(decodeUrlText(text), schema);
  }

  and(where: Where<T>): Criteria<T> {
    const added = normalizeWhere(where);
    if (added === null) {
      return this;
    }
    const filter: FilterNode =
      this.filter === null
        ? added
        : { kind: 'and', filters: [...andChildren(this.filter), ...andChildren(added)] };
    return this.with({ filter });
  }

  orderBy(orderBy: OrderBy<T>): Criteria<T> {
    return this.with({ order: normalizeOrderBy(orderBy) });
  }

  paginate(pagination: { readonly limit?: number; readonly offset?: number }): Criteria<T> {
    return this.with({ pagination: paginationOf(pagination.limit, pagination.offset) });
  }

  page(page: number, perPage: number): Criteria<T> {
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(perPage) || perPage < 1) {
      throw new CriteriaError('INVALID_PAGINATION', '"page" and "perPage" must be integers from 1');
    }
    return this.paginate({ limit: perPage, offset: (page - 1) * perPage });
  }

  equals(other: Criteria<T>): boolean {
    return this.toUrl() === other.toUrl();
  }

  toJSON(): CriteriaJson {
    return encodeCriteria(this.filter, this.order, this.pagination);
  }

  toUrl(): string {
    return encodeUrlText(this.toJSON());
  }

  private with(nodes: CriteriaNodes): Criteria<T> {
    return Criteria.fromNodes<T>({
      filter: this.filter,
      order: this.order,
      pagination: this.pagination,
      ...nodes,
    });
  }
}
