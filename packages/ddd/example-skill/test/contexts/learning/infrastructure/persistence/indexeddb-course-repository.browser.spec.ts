import { beforeEach, describe } from 'vitest';
import { IndexedDbTable } from '@archi-code/ddd/infrastructure';
import { IndexedDbCourseRepository } from '../../../../../src/contexts/learning/infrastructure/persistence/indexeddb-course-repository';
import { courseRepositoryContract } from '../../../../support/learning/course-repository-contract';

describe('IndexedDbCourseRepository', () => {
  beforeEach(async () => {
    await IndexedDbTable.of('courses').clear();
  });

  courseRepositoryContract(async () => new IndexedDbCourseRepository());
});
