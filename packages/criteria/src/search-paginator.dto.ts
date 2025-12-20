export class SearchPaginatorDto {
  public readonly page: number;
  public readonly perPage: number;

  constructor(page: number, perPage: number) {
    // Convert numeric strings to numbers.
    this.page = typeof page === 'string' ? Number(page) : page;
    this.perPage = typeof perPage === 'string' ? Number(perPage) : perPage;
    this.validate();
  }

  validate(): void {
    if (!Number.isInteger(this.page) || !Number.isInteger(this.perPage)) {
      throw new Error('SearchPaginatorDto: "page" and "perPage" must be integers');
    }
    if (this.page < 1 || this.perPage < 1) {
      throw new Error('SearchPaginatorDto: "page" and "perPage" must be positive integers');
    }
  }
}
