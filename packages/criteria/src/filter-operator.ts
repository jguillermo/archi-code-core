export enum FilterOperator {
  EQ = 'eq', // Equals
  NE = 'ne', // Not equals
  LT = 'lt', // Less than
  LTE = 'lte', // Less than or equal
  GT = 'gt', // Greater than
  GTE = 'gte', // Greater than or equal
  IN = 'in', // In a set
  NIN = 'nin', // Not in a set
  BETWEEN = 'between', // Between two limits (expects an array [min, max])
  LIKE = 'like', // LIKE search (case sensitive)
  ILIKE = 'ilike', // LIKE search (case insensitive)
  INARRAY = 'inarray', // Checks if a value is contained in an array field
}
