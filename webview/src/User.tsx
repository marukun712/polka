import { useSearchParams } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createResource,
	createSignal,
	Show,
} from "solid-js";
import type { FeedItem } from "../@types/types";
import { generateFeed } from "../utils/feed";
import GraphComponent from "./components/Graph";
import PostCard from "./components/PostCard";
import Loading from "./components/ui/Loading";

const fetchRepo = async (did: string) => {
	const feed = await generateFeed(did);
	return feed;
};

const UserPage: Component = () => {
	const [params] = useSearchParams();
	const did = params.did;
	if (!did || typeof did !== "string") {
		return (
			<main class="container">
				<h1>Invalid did</h1>
			</main>
		);
	}
	const [repo] = createResource(did, fetchRepo);

	const [_tag, insertTag] = createSignal("");
	const [filtered, setFiltered] = createSignal<FeedItem[]>([]);
	const [children, selectChildren] = createSignal<string[]>([]);
	const [node, selectNode] = createSignal<string>("root");

	createEffect(() => {
		const r = repo();
		const feed = r ? [...r.feed] : [];
		const filtered =
			feed.filter((item) => children().includes(item.post.rpath)) ?? [];
		setFiltered(filtered);
	});

	return (
		<main class="container">
			<Show when={repo()} fallback={<Loading />}>
				{(r) => (
					<>
						<article>
							<Show when={r().ownerProfile.banner}>
								<img
									src={r().ownerProfile.banner}
									alt="Banner"
									style="width: 100%; height: 300px; object-fit: cover;"
								/>
							</Show>
							<header style="display: flex; justify-content: space-between;">
								<hgroup>
									<figure>
										<img
											src={r().ownerProfile.icon}
											alt={r().ownerProfile.name}
											style="border-radius: 50%; width: 150px; height: 150px; object-fit: cover;"
										/>
									</figure>
									<h1>{r().ownerProfile.name}</h1>
									<p>{r().pk}</p>
								</hgroup>
							</header>

							<p>{r().ownerProfile.description}</p>

							<footer>
								<p>
									<strong>1 nodes</strong> フォロー中
								</p>
							</footer>
						</article>

						<GraphComponent
							feed={[...r().feed]}
							root={r().ownerProfile.name}
							node={node}
							selectNode={selectNode}
							insertTag={insertTag}
							selectChildren={selectChildren}
							follows={r().follows || []}
						/>

						<article>
							<header>
								<Show when={node() !== "root"}>
									<h1>Posts: {node()}</h1>
								</Show>
							</header>
							{filtered()
								.sort(
									(a, b) =>
										new Date(b.post.data.updatedAt).getTime() -
										new Date(a.post.data.updatedAt).getTime(),
								)
								.map((item) => (
									<PostCard item={item} />
								))}
						</article>
					</>
				)}
			</Show>
		</main>
	);
};

export default UserPage;
