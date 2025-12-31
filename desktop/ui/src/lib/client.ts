import { Reader } from "@polka/db/reader";
import { resolve } from "./identity.js";

async function openReader(did: string): Promise<Reader> {
	const doc = await resolve(did);
	return Reader.open(doc.target);
}

async function isOwnDid(did: string): Promise<boolean> {
	try {
		const ownDid = await window.polka.did();
		return did === ownDid;
	} catch {
		return false;
	}
}

export async function getRecord(did: string, rpath: string) {
	if (await isOwnDid(did)) {
		return await window.polka.getRecord(rpath);
	}
	const reader = await openReader(did);
	return reader.find(rpath);
}

export async function getRecords(
	did: string,
	nsid: string,
	query?: Record<string, unknown>,
) {
	if (await isOwnDid(did)) {
		return await window.polka.getRecords(nsid, query);
	}
	const reader = await openReader(did);
	return reader.findMany(nsid, { query });
}

export async function getKeys(
	did: string,
	nsid: string,
	query?: Record<string, unknown>,
) {
	if (await isOwnDid(did)) {
		return await window.polka.getKeys(nsid, query);
	}
	const reader = await openReader(did);
	return reader.findKeys(nsid, { query });
}

export async function allRecords(did: string) {
	if (await isOwnDid(did)) {
		return await window.polka.allRecords();
	}
	const reader = await openReader(did);
	return reader.all();
}

export async function getDid(did: string) {
	const reader = await openReader(did);
	return reader.did;
}
