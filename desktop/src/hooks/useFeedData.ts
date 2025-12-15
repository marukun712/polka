import { createResource, useContext } from "solid-js";
import { daemonContext, feedCache, readerCache } from "../index";
import { generateFeed } from "../services/feedService";

export function useFeedData(did?: string) {
	const daemon = useContext(daemonContext);
	const loadedFeed = useContext(feedCache);
	const loadedReader = useContext(readerCache);

	const targetDid = did ?? daemon?.did;

	const [resource] = createResource(
		() => ({
			did: targetDid,
			feedCache: loadedFeed,
			readerCache: loadedReader,
		}),
		async ({ did, feedCache, readerCache }) => {
			if (!did) return null;

			const feed = await generateFeed(did, feedCache, readerCache);
			if (!feed) return null;

			const followFeeds = await Promise.all(
				feed.follows.flatMap(async (follow) => {
					const f = await generateFeed(follow.data.did, feedCache, readerCache);
					return f ? [{ ...f, rootTag: follow.data.tag }] : [];
				}),
			);

			return { feed, followFeeds: followFeeds.flat() };
		},
	);

	return resource;
}
