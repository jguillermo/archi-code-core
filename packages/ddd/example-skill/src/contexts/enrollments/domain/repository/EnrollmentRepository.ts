import { AggregateRepository } from '@archi-code/ddd/domain';
import type {
  AggregateFinder,
  AggregateSaver,
  AggregateSearcher,
  Criteria,
  SearchOptions,
  SearchResult,
} from '@archi-code/ddd/domain';
import type { Enrollment } from '../aggregate/Enrollment';
import type { EnrollmentId } from '../value-object/EnrollmentId';

export abstract class EnrollmentRepository
  extends AggregateRepository<Enrollment>
  implements AggregateFinder<Enrollment>, AggregateSaver<Enrollment>, AggregateSearcher<Enrollment>
{
  abstract findById(id: EnrollmentId): Promise<Enrollment | null>;
  abstract save(enrollment: Enrollment): Promise<void>;
  abstract search(
    criteria: Criteria<Enrollment>,
    options?: SearchOptions,
  ): Promise<SearchResult<Enrollment>>;
}
