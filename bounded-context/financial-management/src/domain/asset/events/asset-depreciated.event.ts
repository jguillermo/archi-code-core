export class AssetDepreciatedEvent {
  constructor(
    public readonly assetId: string,
    public readonly depreciationAmount: number,
    public readonly date: Date,
  ) {}
}
