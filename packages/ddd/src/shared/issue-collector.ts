import { IssueCollectionError } from './issue-collection-error';
import type { CollectedIssue } from './issue-collection-error';

type Build<Built> = readonly [path: string, build: () => Built];

export type IssueReader = (error: unknown) => readonly CollectedIssue[] | null;

export class IssueCollector {
  static collectFields(
    builds: Readonly<Record<string, () => unknown>>,
    readIssues: IssueReader,
  ): Record<string, unknown> {
    return Object.fromEntries(IssueCollector.collect(Object.entries(builds), readIssues));
  }

  static collectItems<Item, Built>(
    items: readonly Item[],
    build: (item: Item, index: number) => Built,
    readIssues: IssueReader,
  ): Built[] {
    const builds = items.map(
      (item, index): Build<Built> => [String(index), () => build(item, index)],
    );
    return IssueCollector.collect(builds, readIssues).map(([, built]) => built);
  }

  private static collect<Built>(
    builds: readonly Build<Built>[],
    readIssues: IssueReader,
  ): [string, Built][] {
    const built: [string, Built][] = [];
    const issues: CollectedIssue[] = [];
    for (const [path, build] of builds) {
      try {
        built.push([path, build()]);
      } catch (error) {
        issues.push(...IssueCollector.issuesAt(path, error, readIssues));
      }
    }
    if (issues.length > 0) {
      throw new IssueCollectionError(issues);
    }
    return built;
  }

  private static issuesAt(path: string, error: unknown, readIssues: IssueReader): CollectedIssue[] {
    const issues = readIssues(error);
    if (issues === null) {
      throw error;
    }
    return issues.map((issue) => ({
      field: issue.field === null ? path : `${path}.${issue.field}`,
      code: issue.code,
      message: issue.message,
    }));
  }
}
