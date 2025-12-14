import {
	type Component,
	createEffect,
	createResource,
	createSignal,
	Show,
	useContext,
} from "solid-js";
import type { FeedItem, Node } from "../@types/types";
import { generateFeed } from "../utils/feed";
import { daemonContext } from ".";
import FollowForm from "./components/FollowForm";
import GraphComponent from "./components/Graph";
import LinkButton from "./components/LinkButton";
import PostCard from "./components/PostCard";
import PostEdit from "./components/PostEdit";
import PostForm from "./components/PostForm";
import ProfileEdit from "./components/ProfileEdit";
import Loading from "./components/ui/Loading";

const fetchRepo = async (did: string) => {
	const allItem: FeedItem[] = [];
	const feed = await generateFeed(did);
	feed?.feed.forEach((item) => {
		allItem.push(item);
	});
	if (!feed) return null;
	const followFeeds = await Promise.all(
		feed.follows.flatMap(async (follow) => {
			const feed = await generateFeed(follow.data.did);
			feed?.feed.forEach((item) => {
				allItem.push(item);
			});
			return feed ? [{ ...feed, rootTag: follow.data.tag }] : [];
		}),
	);
	return { feed, followFeeds: followFeeds.flat(), allItem };
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

	const [res] = createResource(daemon.did, fetchRepo);

	const [filtered, setFiltered] = createSignal<FeedItem[]>([]);
	const [node, setNode] = createSignal<Node>({ id: "", label: "" });
	const [children, setChildren] = createSignal<Set<string>>(new Set());

	createEffect(() => {
		const r = res();
		if (!r) return;
		setNode({ id: r.feed.id, label: r.feed.ownerProfile.name });
	});

	createEffect(() => {
		console.log(children());
		const items = res()?.allItem ?? [];
		[...children()].map((c) => {
			const item = items.find((i) => i.rpath === c);
			if (item) setFiltered([...filtered(), item]);
		});
	}, [children]);

	return (
		<main class="container">
			<Show when={res()} fallback={<Loading />}>
				{(f) => (
					<>
						<article>
							<Show when={f().feed.ownerProfile.banner}>
								<img
									src={f().feed.ownerProfile.banner}
									alt="Banner"
									style="width: 100%; height: 300px; object-fit: cover;"
								/>
							</Show>
							<header style="display: flex; justify-content: space-between;">
								<hgroup>
									<figure>
										<img
											src={f().feed.ownerProfile.icon}
											alt={f().feed.ownerProfile.name}
											style="border-radius: 50%; width: 150px; height: 150px; object-fit: cover;"
										/>
									</figure>
									<h1>{f().feed.ownerProfile.name}</h1>
									<p>{f().feed.pk}</p>
								</hgroup>
								<ProfileEdit init={f().feed.ownerProfile} />
							</header>

							<p>{f().feed.ownerProfile.description}</p>

							<footer>
								<p>
									<strong>1 nodes</strong> フォロー中
								</p>
							</footer>
						</article>

						<PostForm />
						<FollowForm />

						<GraphComponent
							feed={f().feed}
							follows={f().followFeeds}
							node={node}
							setNode={setNode}
							setChildren={setChildren}
						/>

						<article>
							<header>
								<h1>Posts: {node()?.label}</h1>
							</header>
							{[...filtered()]
								.sort(
									(a, b) =>
										new Date(b.post.data.updatedAt).getTime() -
										new Date(a.post.data.updatedAt).getTime(),
								)
								.map((item) => {
									const links = [...filtered()].filter(
										(link) =>
											link.type === "link" &&
											link.post.rpath === item.post.rpath,
									);
									const path = links.map((link) => link.rpath);
									return (
										<PostCard
											item={item}
											headerAction={<PostEdit post={item.post} />}
											footerAction={
												<LinkButton
													did={item.did}
													links={path}
													post={item.post}
												/>
											}
										/>
									);
								})}
						</article>
					</>
				)}
			</Show>
		</main>
	);
};

export default TopPage;
