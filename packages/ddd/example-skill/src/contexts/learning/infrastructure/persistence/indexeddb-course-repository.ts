import type { Criteria, PrimitiveTypes, SearchOptions, SearchResult } from '@archi-code/ddd/domain';
import { ConcurrencyException } from '@archi-code/ddd/application';
import { IndexedDbTable } from '@archi-code/ddd/infrastructure';
import { readIndexes, toIndexedDbQuery } from '@archi-code/criteria-adapters/indexeddb';
import type { IndexInfo } from '@archi-code/criteria-adapters/indexeddb';
import { Course } from '../../domain/aggregate/Course';
import { CourseRepository } from '../../domain/repository/CourseRepository';
import type { CourseId } from '../../domain/value-object/CourseId';

type CourseRow = PrimitiveTypes<Course> & { version: number };

export class IndexedDbCourseRepository extends CourseRepository {
  private static readonly courses = IndexedDbTable.of<CourseRow, 'byStatus'>('courses', {
    database: 'learning',
    indexes: { byStatus: { keyPath: 'status' } },
  });
  private readonly versions = new WeakMap<Course, number>();

  async findById(id: CourseId): Promise<Course | null> {
    const row = await IndexedDbCourseRepository.courses.get(id.value);
    return row === null ? null : this.load(row);
  }

  async search(criteria: Criteria<Course>, options?: SearchOptions): Promise<SearchResult<Course>> {
    const table = IndexedDbCourseRepository.courses;
    let indexes: IndexInfo[] = [];
    await table.withStore('readonly', (store) => {
      indexes = readIndexes(store);
      return undefined;
    });
    const query = toIndexedDbQuery(criteria, indexes);
    const index = query.index as 'byStatus' | null;
    if (query.compare === null) {
      const page = await table.find({ ...query, index });
      return this.result(page.items, page.total, options);
    }
    const { items, total } = await table.find({
      ...query,
      index,
      offset: undefined,
      limit: undefined,
    });
    const end = query.limit === null ? undefined : query.offset + query.limit;
    return this.result(items.sort(query.compare).slice(query.offset, end), total, options);
  }

  async save(course: Course): Promise<void> {
    const key = course.id.value;
    const version = this.versions.get(course) ?? 0;
    const table = IndexedDbCourseRepository.courses;
    await IndexedDbTable.transaction([table], 'readwrite', async (tx) => {
      if (((await tx.get(table, key))?.version ?? 0) !== version) {
        throw new ConcurrencyException('Course', key, version);
      }
      await tx.put(table, { ...course.toPrimitives(), version: version + 1 });
    });
    this.versions.set(course, version + 1);
  }

  async remove(course: Course): Promise<void> {
    const key = course.id.value;
    const version = this.versions.get(course) ?? 0;
    const table = IndexedDbCourseRepository.courses;
    await IndexedDbTable.transaction([table], 'readwrite', async (tx) => {
      if (((await tx.get(table, key))?.version ?? 0) !== version) {
        throw new ConcurrencyException('Course', key, version);
      }
      await tx.delete(table, key);
    });
  }

  private load(row: CourseRow): Course {
    const { version, ...primitives } = row;
    const course = Course.fromPrimitives(primitives);
    this.versions.set(course, version);
    return course;
  }

  private result(
    rows: CourseRow[],
    total: number,
    options: SearchOptions | undefined,
  ): SearchResult<Course> {
    const items = rows.map((row) => this.load(row));
    return options?.withTotal === true ? { items, total } : { items };
  }
}
