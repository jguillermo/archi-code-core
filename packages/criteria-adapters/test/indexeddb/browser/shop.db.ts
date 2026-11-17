import { IndexedDbDatabase } from '@archi-code/ddd/infrastructure';

export class ShopDb extends IndexedDbDatabase {
  constructor() {
    super({ name: 'shop' });
  }
}
