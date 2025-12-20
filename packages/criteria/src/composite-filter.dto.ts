import { LogicalOperator } from './logical-operator';
import { SearchFilterDto } from './search-filter.dto';

export class CompositeFilterDto {
  constructor(
    public readonly logicalOperator: LogicalOperator,
    public readonly filters: SearchFilterDto[],
  ) {
    this.validate();
  }

  validate(): void {
    if (this.logicalOperator !== 'and' && this.logicalOperator !== 'or') {
      throw new Error('CompositeFilterDto: logicalOperator must be "and" or "or"');
    }
    if (!Array.isArray(this.filters) || this.filters.length === 0) {
      throw new Error('CompositeFilterDto: "filters" must be a non-empty array');
    }
    this.filters.forEach((filter) => {
      if (typeof (filter as any).validate === 'function') {
        (filter as any).validate();
      }
    });
  }
}
