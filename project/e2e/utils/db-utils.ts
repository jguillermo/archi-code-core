import { Document, Filter, MongoClient } from 'mongodb';

export class DbUtils {
  private static client: MongoClient | null = null;
  private static readonly uri = 'mongodb://localhost:27017';
  private static readonly dbName = 'misa';

  /**
   * Obtiene el cliente de MongoDB, reutilizando la conexión si ya existe.
   * Intenta hacer ping para asegurarse de que la conexión está activa.
   */
  static async getClient(): Promise<MongoClient> {
    if (!DbUtils.client) {
      console.log('[DbUtils] No existing Mongo client. Creating and connecting...');
      DbUtils.client = new MongoClient(DbUtils.uri);
      await DbUtils.client.connect();
      console.log('[DbUtils] MongoDB connection established.');
    } else {
      try {
        await DbUtils.client.db().command({ ping: 1 });
        console.log('[DbUtils] Reusing existing MongoDB connection.');
      } catch (error) {
        console.warn('[DbUtils] MongoDB connection lost. Reconnecting...');
        DbUtils.client = new MongoClient(DbUtils.uri);
        await DbUtils.client.connect();
        console.log('[DbUtils] MongoDB reconnection successful.');
      }
    }
    return DbUtils.client;
  }

  /**
   * Elimina todos los documentos de una colección.
   * @param collectionName Nombre de la colección a limpiar.
   */
  static async cleanCollection(collectionName: string): Promise<void> {
    const db = (await DbUtils.getClient()).db(DbUtils.dbName);
    await db.collection(collectionName).deleteMany({});
  }

  /**
   * Elimina documentos que coincidan con un filtro.
   * @param collectionName Nombre de la colección.
   * @param filter Filtro para seleccionar documentos a eliminar.
   */
  static async deleteByFilter(collectionName: string, filter: Filter<Document>): Promise<void> {
    const db = (await DbUtils.getClient()).db(DbUtils.dbName);
    await db.collection(collectionName).deleteMany(filter);
  }

  /**
   * Inserta uno o varios documentos en una colección.
   * @param collectionName Nombre de la colección.
   * @param documents Documento o array de documentos a insertar.
   */
  static async insertDocuments(collectionName: string, documents: Document | Document[]): Promise<void> {
    const db = (await DbUtils.getClient()).db(DbUtils.dbName);
    const collection = db.collection(collectionName);
    if (Array.isArray(documents)) {
      await collection.insertMany(documents);
    } else {
      await collection.insertOne(documents);
    }
  }

  /**
   * Cuenta el número de documentos en una colección que cumplan un filtro.
   * @param collectionName Nombre de la colección.
   * @param filter Filtro opcional para contar.
   */
  static async countDocuments(collectionName: string, filter: Filter<Document> = {}): Promise<number> {
    const db = (await DbUtils.getClient()).db(DbUtils.dbName);
    return db.collection(collectionName).countDocuments(filter);
  }

  /**
   * Encuentra documentos que cumplan un filtro en una colección.
   * @param collectionName Nombre de la colección.
   * @param filter Filtro opcional para búsqueda.
   */
  static async findDocuments(collectionName: string, filter: Filter<Document> = {}): Promise<Document[]> {
    const db = (await DbUtils.getClient()).db(DbUtils.dbName);
    return db.collection(collectionName).find(filter).toArray();
  }

  /**
   * Cierra la conexión actual de MongoDB.
   */
  static async closeConnection(): Promise<void> {
    if (DbUtils.client) {
      console.log('[DbUtils] Closing MongoDB connection...');
      await DbUtils.client.close();
      DbUtils.client = null;
      console.log('[DbUtils] MongoDB connection closed.');
    } else {
      console.log('[DbUtils] No MongoDB connection to close.');
    }
  }
}
