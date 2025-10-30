import PouchDB from "pouchdb";

export class PDS {
	constructor() {
		const db = new PouchDB("kittens");
	}
}
