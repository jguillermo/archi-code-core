import { IssueCollectionError, IssueCollector } from '../../../shared/index';
import type { CollectedIssue } from '../../../shared/index';
import { DomainException } from '../../exceptions/domain.exception';
import { ValidationException } from '../../exceptions/validation.exception';

export class CompositeIssues {
  static collectFields(builds: Readonly<Record<string, () => unknown>>): Record<string, unknown> {
    return CompositeIssues.validated(() =>
      IssueCollector.collectFields(builds, CompositeIssues.read),
    );
  }

  static collectItems<Item, Built>(
    items: readonly Item[],
    build: (item: Item, index: number) => Built,
  ): Built[] {
    return CompositeIssues.validated(() =>
      IssueCollector.collectItems(items, build, CompositeIssues.read),
    );
  }

  private static validated<Collected>(collect: () => Collected): Collected {
    try {
      return collect();
    } catch (error) {
      if (error instanceof IssueCollectionError) {
        throw new ValidationException(error.issues);
      }
      throw error;
    }
  }

  private static read(error: unknown): readonly CollectedIssue[] | null {
    if (error instanceof ValidationException) {
      return error.errors;
    }
    if (error instanceof DomainException) {
      return [{ field: null, code: error.code, message: error.message }];
    }
    return null;
  }
}
