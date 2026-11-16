import { describe } from 'vitest';
import { InMemoryEnrollmentRepository } from '../../../../../src/contexts/enrollments/infrastructure/persistence/in-memory-enrollment-repository';
import { enrollmentRepositoryContract } from '../../../../support/enrollments/enrollment-repository-contract';

describe('InMemoryEnrollmentRepository', () =>
  enrollmentRepositoryContract(async () => new InMemoryEnrollmentRepository()));
