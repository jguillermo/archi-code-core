import { SimpleFilterDto } from './simple-filter.dto';
import { CompositeFilterDto } from './composite-filter.dto';

export type SearchFilterDto = SimpleFilterDto | CompositeFilterDto;
