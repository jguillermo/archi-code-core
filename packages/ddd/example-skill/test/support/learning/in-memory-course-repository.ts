import type { Criteria, PrimitiveTypes, SearchOptions, SearchResult } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';
import { searchMemory } from '@archi-code/criteria-adapters/memory';
import { Course } from '../../../src/contexts/learning/domain/aggregate/Course';
import { CourseRepository } from '../../../src/contexts/learning/domain/repository/CourseRepository';
import type { CourseId } from '../../../src/contexts/learning/domain/value-object/CourseId';

interface CourseRow {
  version: number;
  primitives: PrimitiveTypes<Course>;
}

export class InMemoryCourseRepository extends CourseRepository {
  private readonly rows = new Map<string, CourseRow>();
  private readonly versions = new WeakMap<Course, number>();

  async findById(id: CourseId): Promise<Course | null> {
    const row = this.rows.get(id.value);
    return row === undefined ? null : this.load(row);
  }

  async search(criteria: Criteria<Course>, options?: SearchOptions): Promise<SearchResult<Course>> {
    const courses = Array.from(this.rows.values(), (row) => this.load(row));
    return searchMemory(courses, criteria, options);
  }

  async save(course: Course): Promise<void> {
    const version = this.checkedVersion(course);
    this.rows.set(course.id.value, {
      version: version + 1,
      primitives: structuredClone(course.toPrimitives()),
    });
    this.versions.set(course, version + 1);
  }

  async remove(course: Course): Promise<void> {
    this.checkedVersion(course);
    this.rows.delete(course.id.value);
  }

  private load(row: CourseRow): Course {
    const course = Course.fromPrimitives(structuredClone(row.primitives));
    this.versions.set(course, row.version);
    return course;
  }

  private checkedVersion(course: Course): number {
    const version = this.versions.get(course) ?? 0;
    if ((this.rows.get(course.id.value)?.version ?? 0) !== version) {
      throw new ConcurrencyException('Course', course.id.value, version);
    }
    return version;
  }
}
