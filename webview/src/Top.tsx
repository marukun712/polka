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
	type Link,
	linkSchema,
	type Post,
	postSchema,
	profileSchema,
} from "../@types/types";
import { RepoReader } from "../lib/client";
import { resolve } from "../lib/identity";
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
	parsedLinks.forEach((link) => {
		const rpath = link.data.ref.rpath;
		if (postToLinks.has(rpath)) {
			postToLinks.get(rpath)?.push(link);
		} else {
			postToLinks.set(rpath, [link]);
		}
	});

	return {
		didKey,
		profile: parsedProfile.data,
		posts: parsedPosts,
		links: parsedLinks,
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
	const [filtered, setFiltered] = createSignal<Post[]>([]);
	const [children, selectChildren] = createSignal<string[]>([]);
	const [node, selectNode] = createSignal<string>("root");

	createEffect(() => {
		const filtered =
			repo()?.posts.filter((post) => children().includes(post.rpath)) ?? [];
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
							posts={r().posts}
							links={r().links}
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
										new Date(b.data.updatedAt).getTime() -
										new Date(a.data.updatedAt).getTime(),
								)
								.map((post) => {
									const links = r().postToLinks.get(post.rpath);
									console.log(post.rpath);
									return (
										<PostCard
											did={r().reader.getDid()}
											post={post}
											profile={r().profile}
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
