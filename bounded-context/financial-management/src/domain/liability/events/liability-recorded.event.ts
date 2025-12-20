export class LiabilityRecordedEvent {
  constructor(
    public readonly liabilityId: string,
    public readonly amount: number,
    public readonly date: Date,
  ) {}
}
