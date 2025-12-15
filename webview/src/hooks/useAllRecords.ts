import { createResource, useContext } from "solid-js";
import { daemonContext, readerCache } from "../index";
import { RepoReader } from "../lib/client";

export function useAllRecords() {
	const daemon = useContext(daemonContext);
	const loadedReader = useContext(readerCache);

	const [resource] = createResource(
		() => ({
			did: daemon?.did,
		}),
		async ({ did }) => {
			if (!did) return null;
			const has = loadedReader.get(did);
			if (has) return { daemon, records: has.allRecords() };
			const reader = await RepoReader.init(did);
			loadedReader.set(did, reader);
			return { daemon, records: reader.allRecords() };
		},
	);

	return resource;
}
