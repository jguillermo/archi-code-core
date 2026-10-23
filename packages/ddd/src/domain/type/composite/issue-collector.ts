import { DomainException, ValidationException } from '../../../exceptions/index';
import type { ValidationIssue } from '../../../exceptions/index';

type Build<Built> = readonly [path: string, build: () => Built];

export class IssueCollector {
  static collectFields(builds: Readonly<Record<string, () => unknown>>): Record<string, unknown> {
    return Object.fromEntries(IssueCollector.collect(Object.entries(builds)));
  }

  static collectItems<Item, Built>(items: readonly Item[], build: (item: Item) => Built): Built[] {
    const builds = items.map((item, index): Build<Built> => [String(index), () => build(item)]);
    return IssueCollector.collect(builds).map(([, built]) => built);
  }

  private static collect<Built>(builds: readonly Build<Built>[]): [string, Built][] {
    const built: [string, Built][] = [];
    const issues: ValidationIssue[] = [];
    for (const [path, build] of builds) {
      try {
        built.push([path, build()]);
      } catch (error) {
        issues.push(...IssueCollector.issuesAt(path, error));
      }
    }
    if (issues.length > 0) {
      throw new ValidationException(issues);
    }
    return built;
  }

  private static issuesAt(path: string, error: unknown): ValidationIssue[] {
    if (error instanceof ValidationException) {
      return error.errors.map((issue) => ({
        field: issue.field === null ? path : `${path}.${issue.field}`,
        code: issue.code,
        message: issue.message,
      }));
    }
    if (error instanceof DomainException) {
      return [{ field: path, code: error.code, message: error.message }];
    }
    throw error;
  }
}
