import {
	type Component,
	createEffect,
	createResource,
	createSignal,
	Show,
	useContext,
} from "solid-js";
import {
	type FeedItem,
	linkSchema,
	type Node,
	postSchema,
	profileSchema,
	type Ref,
} from "../@types/types";
import { RepoReader } from "../lib/client";
import { generateFeed } from "../utils/feed";
import { daemonContext, feedCache, readerCache } from ".";
import FollowForm from "./components/FollowForm";
import GraphComponent from "./components/Graph";
import LinkButton from "./components/LinkButton";
import PostCard from "./components/PostCard";
import PostEdit from "./components/PostEdit";
import PostForm from "./components/PostForm";
import ProfileEdit from "./components/ProfileEdit";
import Loading from "./components/ui/Loading";

const fetchRepo = async (
	did: string,
	feedCache: Map<Ref, FeedItem>,
	readerCache: Map<string, RepoReader>,
) => {
	const feed = await generateFeed(did, feedCache, readerCache);
	if (!feed) return null;
	const followFeeds = await Promise.all(
		feed.follows.flatMap(async (follow) => {
			const feed = await generateFeed(follow.data.did, feedCache, readerCache);
			return feed ? [{ ...feed, rootTag: follow.data.tag }] : [];
		}),
	);
	return { feed, followFeeds: followFeeds.flat() };
};

const TopPage: Component = () => {
	const daemon = useContext(daemonContext);
	const loadedFeed = useContext(feedCache);
	const loadedReader = useContext(readerCache);

	if (!daemon) {
		return (
			<main class="container">
				<h1>Please start daemon</h1>
			</main>
		);
	}

	const [res] = createResource(
		() => ({
			did: daemon.did,
			feedCache: loadedFeed,
			readerCache: loadedReader,
		}),
		async ({ did, feedCache, readerCache }) => {
			return fetchRepo(did, feedCache, readerCache);
		},
	);

	const [filtered, setFiltered] = createSignal<FeedItem[]>([]);
	const [node, setNode] = createSignal<Node>({ id: "", label: "" });
	const [children, setChildren] = createSignal<Set<Ref>>(new Set());

	createEffect(() => {
		const r = res();
		if (!r) return;
		setNode({ id: r.feed.id, label: r.feed.ownerProfile.name });
	});

	const resolveFeedItem = async (ref: Ref): Promise<FeedItem | null> => {
		const cached = loadedFeed.get(ref);
		if (cached) return cached;

		let reader = loadedReader.get(ref.did);
		if (!reader) {
			reader = await RepoReader.init(ref.did);
			loadedReader.set(ref.did, reader);
		}

		const postRecord = await reader.getRecord(ref.rpath);
		const profileRecord = await reader.getRecord("polka.profile/self");
		if (!postRecord || !profileRecord) return null;

		const profileParsed = profileSchema.safeParse(
			JSON.parse(profileRecord.data),
		);
		if (!profileParsed.success) return null;

		const postData = {
			rpath: postRecord.rpath,
			data: JSON.parse(postRecord.data),
		};

		const postParsed = postSchema.safeParse(postData);
		if (postParsed.success) {
			return {
				type: "post",
				did: ref.did,
				profile: profileParsed.data,
				rpath: postParsed.data.rpath,
				tags: postParsed.data.data.tags,
				post: postParsed.data,
			};
		}

		const linkParsed = linkSchema.safeParse(postData);
		if (!linkParsed.success) return null;

		const target =
			loadedFeed.get(linkParsed.data.data.ref) ??
			(await resolveFeedItem(linkParsed.data.data.ref));

		if (!target) return null;

		return {
			type: "link",
			did: ref.did,
			profile: profileParsed.data,
			rpath: linkParsed.data.rpath,
			tags: linkParsed.data.data.tags,
			post: target.post,
		};
	};

	createEffect(async () => {
		const refs = [...children()];
		if (refs.length === 0) {
			setFiltered([]);
			return;
		}
		const items = await Promise.all(refs.map((ref) => resolveFeedItem(ref)));
		setFiltered(items.filter(Boolean) as FeedItem[]);
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
									<strong>{f().feed.follows.length} ノード</strong> フォロー中
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
