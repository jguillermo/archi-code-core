import { AggregateRepository } from '@archi-code/ddd/domain';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  AggregateSearcher,
  Criteria,
  SearchOptions,
  SearchResult,
} from '@archi-code/ddd/domain';
import type { Course } from '../aggregate/Course';
import type { CourseId } from '../value-object/CourseId';

export abstract class CourseRepository
  extends AggregateRepository<Course>
  implements
    AggregateFinder<Course>,
    AggregateSaver<Course>,
    AggregateRemover<Course>,
    AggregateSearcher<Course>
{
  abstract findById(id: CourseId): Promise<Course | null>;
  abstract save(course: Course): Promise<void>;
  abstract remove(course: Course): Promise<void>;
  abstract search(
    criteria: Criteria<Course>,
    options?: SearchOptions,
  ): Promise<SearchResult<Course>>;
}
