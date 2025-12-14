import {
	type Component,
	createEffect,
	createResource,
	createSignal,
	Show,
	useContext,
} from "solid-js";
import type { FeedItem } from "../@types/types";
import { generateFeed } from "../utils/feed";
import { daemonContext } from ".";
import GraphComponent from "./components/Graph";
import PostCard from "./components/PostCard";
import PostForm from "./components/PostForm";
import ProfileEdit from "./components/ProfileEdit";
import Loading from "./components/ui/Loading";

const fetchRepo = async (did: string) => {
	const feed = await generateFeed(did);
	return feed;
};

const TopPage: Component = () => {
	const daemon = useContext(daemonContext);
	if (!daemon) {
		return (
			<main class="container">
				<h1>Please start daemon</h1>
			</main>
		);
	}

	const [repo] = createResource(daemon.did, fetchRepo);

	const [tag, insertTag] = createSignal("");
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
									<p>{daemon.did}</p>
								</hgroup>
								<ProfileEdit init={r().ownerProfile} />
							</header>

							<p>{r().ownerProfile.description}</p>

							<footer>
								<p>
									<strong>1 nodes</strong> フォロー中
								</p>
							</footer>
						</article>

						<PostForm tag={tag} insertTag={insertTag} />

						<GraphComponent
							feed={[...r().feed]}
							root={r().ownerProfile.name}
							node={node}
							selectNode={selectNode}
							insertTag={insertTag}
							selectChildren={selectChildren}
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
								.map((item) => {
									const links = r().feed.filter(
										(link) =>
											link.type === "link" &&
											link.post.rpath === item.post.rpath,
									);
									const path = links.map((link) => link.rpath);
									return <PostCard did={r().did} item={item} links={path} />;
								})}
						</article>
					</>
				)}
			</Show>
		</main>
	);
};

export default TopPage;
