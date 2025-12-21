import { createResource, useContext } from "solid-js";
import { readerCache } from "../contexts/CacheContext";
import { RepoReader } from "../lib/client";
import { resolve } from "../lib/identity";
import { useIPC } from "./useIPC";

export function useAllRecords() {
	const ipc = useIPC();
	const loadedReader = useContext(readerCache);

	const [resource] = createResource(
		() => ({
			did: ipc.did,
		}),
		async ({ did }) => {
			const doc = await resolve(did);
			const has = loadedReader.get(did);
			if (has) return { ipc, reader: has, records: has.allRecords(), doc };
			const reader = await RepoReader.init(did);
			loadedReader.set(did, reader);
			return { ipc, reader, records: reader.allRecords(), doc };
		},
	);

	return resource;
}
