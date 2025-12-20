export class EphemeraDb<T extends { id: string }> {
  private items: T[] = [];

  findById(id: string): Promise<T | null> {
    return new Promise((resolve) => {
      const item = this.items.find((item) => item.id === id) || null;
      resolve(item);
    });
  }

  persist(item: T): Promise<void> {
    return new Promise((resolve) => {
      const index = this.items.findIndex((existingItem) => existingItem.id === item.id);
      if (index !== -1) {
        this.items[index] = item; // Actualiza el item si ya existe
      } else {
        this.items.push(item); // Agrega un nuevo item si no existe
      }
      resolve();
    });
  }

  findAll(): Promise<T[]> {
    return new Promise((resolve) => {
      resolve([...this.items]); // Devuelve una copia de los items
    });
  }

  remove(id: string): Promise<boolean> {
    return new Promise((resolve) => {
      const index = this.items.findIndex((item) => item.id === id);
      if (index !== -1) {
        this.items.splice(index, 1); // Elimina el item
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  clear(): Promise<void> {
    return new Promise((resolve) => {
      this.items = []; // Limpia todos los items
      resolve();
    });
  }
}
