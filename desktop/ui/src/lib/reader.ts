import { Reader } from "@polka/db/reader";

// Network経由でのリポジトリ読み取り実装

async function openReader(did: string): Promise<Reader> {
	return Reader.open(did);
}

async function isOwnDid(did: string): Promise<boolean> {
	try {
		const ownDid = await window.polka.getDid();
		return did === ownDid;
	} catch {
		return false;
	}
}

export async function getRecord(did: string, rpath: string) {
	try {
		if (await isOwnDid(did)) {
			return await window.polka.getRecord(rpath);
		}
		const reader = await openReader(did);
		return reader.find(rpath);
	} catch (e) {
		console.log(e);
		return null;
	}
}

export async function getRecords(
	did: string,
	nsid: string,
	query?: Record<string, unknown>,
) {
	try {
		if (await isOwnDid(did)) {
			return await window.polka.getRecords(nsid, query);
		}
		const reader = await openReader(did);
		return reader.findMany(nsid, { query });
	} catch (e) {
		console.log(e);
		return { records: [] };
	}
}

export async function getKeys(
	did: string,
	nsid: string,
	query?: Record<string, unknown>,
) {
	try {
		if (await isOwnDid(did)) {
			return await window.polka.getKeys(nsid, query);
		}
		const reader = await openReader(did);
		return reader.findKeys(nsid, { query });
	} catch (e) {
		console.log(e);
		return { keys: [] };
	}
}

export async function allRecords(did: string) {
	try {
		if (await isOwnDid(did)) {
			return await window.polka.allRecords();
		}
		const reader = await openReader(did);
		return reader.all();
	} catch (e) {
		console.log(e);
		return { records: [] };
	}
}

export async function getDid(did: string) {
	const reader = await openReader(did);
	return reader.did;
}
