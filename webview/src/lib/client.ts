import { decode, encode } from "@ipld/dag-cbor";
import { CarReader, DBReader } from "@polka/db/reader";
import { CID } from "multiformats";
import { resolve } from "./identity.js";

export class RepoReader {
	reader: DBReader;
	did: string;

	constructor(reader: DBReader, did: string) {
		this.reader = reader;
		this.did = did;
	}

	static async init(did: string) {
		const doc = await resolve(did);
		const path = doc.target;
		const res = await fetch(path, { cache: "no-store" });
		const file = await res.arrayBuffer();

		const reader = await DBReader.open(
			path,
			new CarReader(new Uint8Array(file)),
		);
		return new RepoReader(reader, did);
	}

	public getRecord(rpath: string) {
		return this.reader.getRecord(rpath);
	}

	public getRecords(nsid: string) {
		return this.reader.getRecords(nsid);
	}

	public allRecords() {
		return this.reader.allRecords();
	}

	public getCommitToVerify() {
		const out: Uint8Array[] = [];
		const root = this.reader.getRoot();
		this.reader.store.readBlock(CID.parse(root), out);
		const decoded = decode(out[0]) as {
			sig: Uint8Array;
			unsigned: Record<string, unknown>;
		};
		const { sig, ...unsignedData } = decoded;
		const bytes = encode(unsignedData);
		return { sig, bytes, decoded: decode(out[0]), root };
	}

	public getDid() {
		return this.did;
	}
}
