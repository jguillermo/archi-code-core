export class TransactionCompletedEvent {
  constructor(
    public readonly transactionId: string,
    public readonly date: Date,
  ) {}
}
