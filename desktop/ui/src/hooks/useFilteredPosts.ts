import { createEffect, createMemo, createSignal } from "solid-js";
import type { FeedItem, Ref } from "../types";
import { useFeedItemResolver } from "./useFeedItemResolver";

export function useFilteredPosts(children: () => Set<Ref>) {
	const resolveFeedItem = useFeedItemResolver();
	const [items, setItems] = createSignal<FeedItem[]>([]);

	const resolveItems = async () => {
		const refs = [...children()];
		if (refs.length === 0) {
			setItems([]);
			return;
		}
		const resolved = await Promise.all(refs.map((ref) => resolveFeedItem(ref)));
		setItems(resolved.filter(Boolean) as FeedItem[]);
	};

	const sortedItems = createMemo(() => {
		return [...items()].sort(
			(a, b) =>
				new Date(b.post.data.updatedAt).getTime() -
				new Date(a.post.data.updatedAt).getTime(),
		);
	});

	createEffect(() => {
		resolveItems();
	});

	return { items: sortedItems, refresh: resolveItems };
}
