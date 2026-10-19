export interface InboxStore {
  markProcessed(consumer: string, eventId: string): Promise<boolean>;
}
