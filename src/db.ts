import PouchDB from "pouchdb-browser";
import type { PolkaEvent } from "../@types";

const db = new PouchDB("polka_db");

export async function getEntry(id: string) {
	return db.get(id);
}

export async function addEntry(entry: PolkaEvent) {
	db.put(entry);
}

export async function deleteEntry(id: string) {
	const doc = await getEntry(id);
	db.remove(doc);
}
