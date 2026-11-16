import type { Criteria, PrimitiveTypes, SearchOptions, SearchResult } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';
import { searchMemory } from '@archi-code/criteria-adapters/memory';
import { Enrollment } from '../../domain/aggregate/Enrollment';
import { EnrollmentRepository } from '../../domain/repository/EnrollmentRepository';
import type { EnrollmentId } from '../../domain/value-object/EnrollmentId';

interface EnrollmentRow {
  version: number;
  primitives: PrimitiveTypes<Enrollment>;
}

export class InMemoryEnrollmentRepository extends EnrollmentRepository {
  private readonly rows = new Map<string, EnrollmentRow>();
  private readonly versions = new WeakMap<Enrollment, number>();

  async findById(id: EnrollmentId): Promise<Enrollment | null> {
    const row = this.rows.get(id.value);
    return row === undefined ? null : this.load(row);
  }

  async search(
    criteria: Criteria<Enrollment>,
    options?: SearchOptions,
  ): Promise<SearchResult<Enrollment>> {
    const enrollments = Array.from(this.rows.values(), (row) => this.load(row));
    return searchMemory(enrollments, criteria, options);
  }

  async save(enrollment: Enrollment): Promise<void> {
    const key = enrollment.id.value;
    const version = this.versions.get(enrollment) ?? 0;
    if ((this.rows.get(key)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Enrollment', key, version);
    }
    this.rows.set(key, {
      version: version + 1,
      primitives: structuredClone(enrollment.toPrimitives()),
    });
    this.versions.set(enrollment, version + 1);
  }

  private load(row: EnrollmentRow): Enrollment {
    const enrollment = Enrollment.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(enrollment, row.version);
    return enrollment;
  }
}
