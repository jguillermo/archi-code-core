import { SearchFilterDto } from './search-filter.dto';
import { SearchOrderDto } from './search-order.dto';
import { SearchPaginatorDto } from './search-paginator.dto';
import { SearchGroupByDto } from './search-group-by.dto';

export class SearchCriteriaDto {
  constructor(
    public readonly filters?: SearchFilterDto,
    public readonly orders?: SearchOrderDto,
    public readonly paginator?: SearchPaginatorDto,
    public readonly groupBy?: SearchGroupByDto,
  ) {}
}
