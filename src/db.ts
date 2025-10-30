import type { Event } from "./schema/index.js";

export class DocumentDB {
	private db: IDBDatabase | null = null;

	constructor(
		private dbName: string = "documentDB",
		private storeName: string = "documents",
	) {}

	async init(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, 1);
			request.onupgradeneeded = (e) => {
				const db = (e.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains(this.storeName)) {
					db.createObjectStore(this.storeName, {
						keyPath: "id",
						autoIncrement: true,
					});
				}
			};
			request.onsuccess = (e) => {
				this.db = (e.target as IDBOpenDBRequest).result;
				resolve();
			};
			request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
		});
	}

	async create(doc: Event): Promise<number> {
		return new Promise((resolve, reject) => {
			if (!this.db) return reject(new Error("DB not initialized"));
			const tx = this.db.transaction(this.storeName, "readwrite");
			const store = tx.objectStore(this.storeName);
			const request = store.add(doc);
			request.onsuccess = (e) =>
				resolve((e.target as IDBRequest).result as number);
			request.onerror = (e) => reject((e.target as IDBRequest).error);
		});
	}

	async read(id: number): Promise<Event | undefined> {
		return new Promise((resolve, reject) => {
			if (!this.db) return reject(new Error("DB not initialized"));
			const tx = this.db.transaction(this.storeName, "readonly");
			const store = tx.objectStore(this.storeName);
			const request = store.get(id);
			request.onsuccess = (e) =>
				resolve((e.target as IDBRequest).result as Event | undefined);
			request.onerror = (e) => reject((e.target as IDBRequest).error);
		});
	}

	async update(doc: Event): Promise<number> {
		return new Promise((resolve, reject) => {
			if (!this.db) return reject(new Error("DB not initialized"));
			const tx = this.db.transaction(this.storeName, "readwrite");
			const store = tx.objectStore(this.storeName);
			const request = store.put(doc);
			request.onsuccess = (e) =>
				resolve((e.target as IDBRequest).result as number);
			request.onerror = (e) => reject((e.target as IDBRequest).error);
		});
	}

	async delete(id: number): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.db) return reject(new Error("DB not initialized"));
			const tx = this.db.transaction(this.storeName, "readwrite");
			const store = tx.objectStore(this.storeName);
			const request = store.delete(id);
			request.onsuccess = () => resolve();
			request.onerror = (e) => reject((e.target as IDBRequest).error);
		});
	}

	async getAll(): Promise<Event[]> {
		return new Promise((resolve, reject) => {
			if (!this.db) return reject(new Error("DB not initialized"));
			const tx = this.db.transaction(this.storeName, "readonly");
			const store = tx.objectStore(this.storeName);
			const request = store.getAll();
			request.onsuccess = (e) =>
				resolve((e.target as IDBRequest).result as Event[]);
			request.onerror = (e) => reject((e.target as IDBRequest).error);
		});
	}
}
