import { Reader } from "@polka/db/reader";
import { resolve } from "./identity.js";

async function openReader(did: string): Promise<Reader> {
	const doc = await resolve(did);
	return Reader.open(doc.target);
}

export async function getRecord(did: string, rpath: string) {
	const reader = await openReader(did);
	return reader.find(rpath);
}

export async function getRecords(did: string, nsid: string) {
	const reader = await openReader(did);
	return reader.findMany(nsid);
}
export async function walkMST(did: string, prefix: string) {
	const reader = await openReader(did);
	return reader.walkMST(prefix);
}

export async function allRecords(did: string) {
	const reader = await openReader(did);
	return reader.all();
}

export async function getDid(did: string) {
	const reader = await openReader(did);
	return reader.did;
}
