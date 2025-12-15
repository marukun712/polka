import { createResource, useContext } from "solid-js";
import { feedCache, readerCache } from "../contexts";
import { generateFeed } from "../services/feedService";

export function useFeedData(did: string) {
	const loadedFeed = useContext(feedCache);
	const loadedReader = useContext(readerCache);

	const [resource] = createResource(
		() => ({
			did: did,
			feedCache: loadedFeed,
			readerCache: loadedReader,
		}),
		async ({ did, feedCache, readerCache }) => {
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
