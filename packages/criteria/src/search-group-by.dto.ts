export class SearchGroupByDto {
  public readonly fields: string[];

  constructor(groupBy: string | string[]) {
    if (groupBy == null) {
      throw new Error('SearchGroupByDto: groupBy value cannot be null or undefined');
    } else if (typeof groupBy === 'string') {
      this.fields = [groupBy];
    } else if (Array.isArray(groupBy)) {
      if (!groupBy.every((item) => typeof item === 'string')) {
        throw new Error('SearchGroupByDto: All groupBy fields must be strings');
      }
      this.fields = groupBy;
    } else {
      throw new Error('SearchGroupByDto: groupBy must be a string or an array of strings');
    }
  }
}
