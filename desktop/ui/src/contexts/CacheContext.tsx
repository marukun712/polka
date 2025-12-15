import { createContext, type ParentComponent } from "solid-js";
import type { RepoReader } from "../lib/client";
import type { FeedItem, Ref } from "../types";

const feedCacheMap = new Map<Ref, FeedItem>();
const readerCacheMap = new Map<string, RepoReader>();

export const feedCache = createContext<Map<Ref, FeedItem>>(feedCacheMap);
export const readerCache =
	createContext<Map<string, RepoReader>>(readerCacheMap);

export const CacheProvider: ParentComponent = (props) => {
	return (
		<feedCache.Provider value={feedCacheMap}>
			<readerCache.Provider value={readerCacheMap}>
				{props.children}
			</readerCache.Provider>
		</feedCache.Provider>
	);
};
