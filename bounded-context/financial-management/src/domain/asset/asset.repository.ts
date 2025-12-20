import { Asset } from './asset';

export abstract class AssetRepository {
  abstract persist(asset: Asset): void;

  abstract findById(assetId: string): Asset | null;

  abstract findAll(): Asset[];
}
