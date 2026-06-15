import { Reader } from "@polka/db/reader";

const cache = new Map<string, Reader>();

async function getReader(did: string): Promise<Reader> {
	if (!cache.has(did)) {
		cache.set(did, await Reader.open(did));
	}
	return cache.get(did) as Reader;
}

export async function getRecord(did: string, rpath: string) {
	try {
		const reader = await getReader(did);
		return reader.find(rpath);
	} catch {
		return null;
	}
}

export async function getRecords(
	did: string,
	nsid: string,
	query?: Record<string, unknown>,
) {
	try {
		const reader = await getReader(did);
		return reader.findMany(nsid, { query });
	} catch {
		return { records: [] };
	}
}

export async function getKeys(
	did: string,
	nsid: string,
	query?: Record<string, unknown>,
) {
	try {
		const reader = await getReader(did);
		return reader.findKeys(nsid, { query });
	} catch {
		return { keys: [] };
	}
}
