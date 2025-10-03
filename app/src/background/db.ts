import PouchDB from 'pouchdb-browser';
import { PolkaEvent } from './crypto.js';

export class EventDatabase {
  private db: PouchDB.Database<PolkaEvent>;

  constructor(dbName: string = 'polka-events') {
    this.db = new PouchDB<PolkaEvent>(dbName);
  }

  /**
   * Store an event in the database
   */
  async storeEvent(event: PolkaEvent): Promise<void> {
    try {
      await this.db.put({
        _id: event.id,
        ...event
      } as any);
    } catch (error: any) {
      if (error.status === 409) {
        // Document already exists, update it
        const existing = await this.db.get(event.id);
        await this.db.put({
          _id: event.id,
          _rev: existing._rev,
          ...event
        } as any);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get an event by ID
   */
  async getEvent(id: string): Promise<PolkaEvent | null> {
    try {
      const doc = await this.db.get(id);
      const { _id, _rev, ...event } = doc as any;
      return event as PolkaEvent;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all events
   */
  async getAllEvents(): Promise<PolkaEvent[]> {
    const result = await this.db.allDocs({ include_docs: true });
    return result.rows
      .filter(row => row.doc)
      .map(row => {
        const { _id, _rev, ...event } = row.doc as any;
        return event as PolkaEvent;
      });
  }

  /**
   * Get events by type
   */
  async getEventsByType(eventType: string): Promise<PolkaEvent[]> {
    const allEvents = await this.getAllEvents();
    return allEvents.filter(event => event.event === eventType);
  }

  /**
   * Get events by public key
   */
  async getEventsByPublicKey(publicKey: string): Promise<PolkaEvent[]> {
    const allEvents = await this.getAllEvents();
    return allEvents.filter(event => event.publickey === publicKey);
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<void> {
    try {
      const doc = await this.db.get(id);
      await this.db.remove(doc);
    } catch (error: any) {
      if (error.status === 404) {
        return; // Already deleted
      }
      throw error;
    }
  }

  /**
   * Get database info
   */
  async getInfo(): Promise<any> {
    return await this.db.info();
  }

  /**
   * Destroy the database (use with caution)
   */
  async destroy(): Promise<void> {
    await this.db.destroy();
  }
}

// Singleton instance
let dbInstance: EventDatabase | null = null;

export function getDatabase(): EventDatabase {
  if (!dbInstance) {
    dbInstance = new EventDatabase();
  }
  return dbInstance;
}
