import { describe } from 'vitest';
import { courseRepositoryContract } from '../../../../support/learning/course-repository-contract';
import { InMemoryCourseRepository } from '../../../../support/learning/in-memory-course-repository';

describe('InMemoryCourseRepository', () =>
  courseRepositoryContract(async () => new InMemoryCourseRepository()));
