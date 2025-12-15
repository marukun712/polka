import { createResource, useContext } from "solid-js";
import { daemonContext, readerCache } from "../index";
import { RepoReader } from "../lib/client";
import { resolve } from "../lib/identity";

export function useAllRecords() {
	const daemon = useContext(daemonContext);
	const loadedReader = useContext(readerCache);

	const [resource] = createResource(
		() => ({
			did: daemon?.did,
		}),
		async ({ did }) => {
			if (!did) return null;
			const doc = await resolve(did);
			const has = loadedReader.get(did);
			if (has) return { daemon, reader: has, records: has.allRecords(), doc };
			const reader = await RepoReader.init(did);
			loadedReader.set(did, reader);
			return { daemon, reader, records: reader.allRecords(), doc };
		},
	);

	return resource;
}
