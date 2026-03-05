import { FilterOperator } from './filter-operator';

export class SimpleFilterDto {
  public readonly value: string | number | (string | number)[];

  constructor(
    public readonly field: string,
    public readonly operator: FilterOperator,
    value: string | number | (string | number)[],
  ) {
    // Convert numeric values for comparison operators.
    const numericOperators = [
      FilterOperator.LT,
      FilterOperator.LTE,
      FilterOperator.GT,
      FilterOperator.GTE,
      FilterOperator.BETWEEN,
    ];
    if (numericOperators.includes(operator)) {
      if (Array.isArray(value)) {
        this.value = value.map((v) => {
          const num = Number(v);
          if (isNaN(num)) {
            throw new Error(`SimpleFilterDto: Value "${v}" must be a number`);
          }
          return num;
        });
      } else {
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`SimpleFilterDto: Value "${value}" must be a number`);
        }
        this.value = num;
      }
    } else {
      this.value = value;
    }
    this.validate();
  }

  validate(): void {
    if (!this.field || typeof this.field !== 'string') {
      throw new Error('SimpleFilterDto: "field" must be a non-empty string');
    }
    if (!Object.values(FilterOperator).includes(this.operator)) {
      throw new Error(`SimpleFilterDto: Invalid operator "${this.operator}"`);
    }
    if (this.value === undefined) {
      throw new Error('SimpleFilterDto: "value" is required');
    }
  }
}
