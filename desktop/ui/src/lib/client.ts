import { Reader } from "@polka/db/lib/reader";
import { resolve } from "./identity.js";

export class RepoReader {
	reader: Reader;

	constructor(reader: Reader) {
		this.reader = reader;
	}

	static async init(did: string) {
		const doc = await resolve(did);
		const path = doc.target;

		const reader = await Reader.open(path);
		return new RepoReader(reader);
	}

	public getRecord(rpath: string) {
		return this.reader.find(rpath);
	}

	public getRecords(nsid: string) {
		return this.reader.findMany(nsid);
	}

	public allRecords() {
		return this.reader.all();
	}

	public getDid() {
		return this.reader.did;
	}
}
