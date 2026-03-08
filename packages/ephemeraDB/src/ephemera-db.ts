export class EphemeraDb<T extends { id: string }> {
  private items: T[] = [];

  findById(id: string): Promise<T | null> {
    return Promise.resolve(this.items.find((entry) => entry.id === id) ?? null);
  }

  persist(item: T): Promise<void> {
    const index = this.items.findIndex((existingItem) => existingItem.id === item.id);
    if (index !== -1) {
      this.items[index] = item;
    } else {
      this.items.push(item);
    }
    return Promise.resolve();
  }

  findAll(): Promise<T[]> {
    return Promise.resolve([...this.items]);
  }

  remove(id: string): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.items.splice(index, 1);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  clear(): Promise<void> {
    this.items = [];
    return Promise.resolve();
  }
}
