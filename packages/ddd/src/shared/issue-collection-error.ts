export interface CollectedIssue {
  readonly field: string | null;
  readonly code: string;
  readonly message: string;
}

export class IssueCollectionError extends Error {
  readonly issues: readonly CollectedIssue[];

  constructor(issues: readonly CollectedIssue[]) {
    super(`${issues.length} issues collected`);
    this.name = 'IssueCollectionError';
    this.issues = Object.freeze([...issues]);
  }
}
