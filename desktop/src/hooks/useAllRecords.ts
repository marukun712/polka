import { createResource, useContext } from "solid-js";
import { readerCache } from "../contexts/CacheContext";
import { RepoReader } from "../lib/client";
import { resolve } from "../lib/identity";
import { useCli } from "./useCli";

export function useAllRecords() {
	const cli = useCli();
	const loadedReader = useContext(readerCache);

	const [resource] = createResource(
		() => ({
			did: cli.did,
		}),
		async ({ did }) => {
			if (!did) return null;
			const doc = await resolve(did);
			const has = loadedReader.get(did);
			if (has) return { cli, reader: has, records: has.allRecords(), doc };
			const reader = await RepoReader.init(did);
			loadedReader.set(did, reader);
			return { cli, reader, records: reader.allRecords(), doc };
		},
	);

	return resource;
}
