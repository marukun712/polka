import { verifySignature } from "@atproto/crypto";
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
	type Link,
	linkSchema,
	postSchema,
	profileSchema,
} from "../@types/types";
import { RepoReader } from "../lib/client";
import { resolve, resolveRecord } from "../lib/identity";
import { daemonContext } from ".";
import GraphComponent from "./components/Graph";
import PostCard from "./components/PostCard";
import PostForm from "./components/PostForm";
import ProfileEdit from "./components/ProfileEdit";
import Loading from "./components/ui/Loading";

const fetchRepo = async (did: string) => {
	const reader = await RepoReader.init(did);
	const { didKey } = await resolve(did);

	const { sig, bytes } = await reader.getCommitToVerify();
	const verified = await verifySignature(didKey, bytes, sig);
	if (!verified) throw new Error("Failed to verify signature");

	const profile = await reader.getRecord("polka.profile/self");
	const posts = await reader.getRecords("polka.post");
	const links = await reader.getRecords("polka.link");

	const parsedProfile = profileSchema.safeParse(JSON.parse(profile.data));
	if (!parsedProfile.success) {
		console.error("Failed to parse profile:", parsedProfile.error);
		return;
	}

	const feed = new Set<FeedItem>();

	const parsedPosts = posts
		.map((post) => {
			try {
				return postSchema.safeParse({
					rpath: post.rpath,
					data: JSON.parse(post.data),
				}).data;
			} catch (e) {
				console.error(e);
				return null;
			}
		})
		.filter((post) => post !== null && post !== undefined);

	parsedPosts.forEach((post) =>
		feed.add({
			type: "post",
			profile: parsedProfile.data,
			tags: post.data.tags,
			post,
		}),
	);

	const parsedLinks = links
		.map((link) => {
			try {
				return linkSchema.safeParse({
					rpath: link.rpath,
					data: JSON.parse(link.data),
				}).data;
			} catch (e) {
				console.error(e);
				return null;
			}
		})
		.filter((link) => link !== null && link !== undefined);

	const postToLinks = new Map<string, Link[]>();

	await Promise.all(
		parsedLinks.map(async (link) => {
			const rpath = link.data.ref.rpath;
			const post = await resolveRecord(link.data.ref.did, link.data.ref.rpath);
			const profile = await resolveRecord(
				link.data.ref.did,
				"polka.profile/self",
			);
			if (!post || !profile) return;
			const parsedPost = postSchema.safeParse({
				rpath: post.rpath,
				data: JSON.parse(post.data),
			});
			const parsedProfile = profileSchema.safeParse(JSON.parse(profile.data));
			if (parsedPost.success && parsedProfile.success) {
				feed.add({
					type: "link",
					tags: link.data.tags,
					post: parsedPost.data,
					profile: parsedProfile.data,
				});
				if (postToLinks.has(rpath)) {
					postToLinks.get(rpath)?.push(link);
				} else {
					postToLinks.set(rpath, [link]);
				}
			}
		}),
	);

	return {
		didKey,
		profile: parsedProfile.data,
		feed,
		postToLinks,
		reader,
	};
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
		console.log(feed);
		const filtered =
			feed.filter((item) => children().includes(item.post.rpath)) ?? [];
		console.log(filtered);
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
											src={r().profile.icon}
											alt={r().profile.name}
											style="border-radius: 50%; width: 150px; height: 150px; object-fit: cover;"
										/>
									</figure>
									<h1>{r().profile.name}</h1>
									<p>{daemon.did}</p>
								</hgroup>
								<ProfileEdit init={r().profile} />
							</header>

							<p>{r().profile.description}</p>

							<footer>
								<p>
									<strong>1 nodes</strong> フォロー中
								</p>
							</footer>
						</article>

						<PostForm tag={tag} insertTag={insertTag} />

						<GraphComponent
							feed={[...r().feed]}
							root={r().profile.name}
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
									const links = r().postToLinks.get(item.post.rpath);
									return (
										<PostCard
											did={r().reader.getDid()}
											item={item}
											links={links ?? []}
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
