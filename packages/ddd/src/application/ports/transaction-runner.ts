export interface TransactionRunner {
  run<Result>(work: () => Promise<Result>): Promise<Result>;
  inTransaction(): boolean;
}
