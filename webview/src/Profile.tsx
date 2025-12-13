import { useSearchParams } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createResource,
	createSignal,
	Show,
} from "solid-js";
import {
	type Post,
	type PostData,
	type Profile,
	postSchema,
	profileSchema,
} from "../@types/types";
import { RepoReader } from "../lib/client";
import { DaemonClient } from "../lib/daemon";
import GraphComponent from "./components/Graph";
import PostCard from "./components/PostCard";
import PostForm from "./components/PostForm";
import ProfileEdit from "./components/ProfileEdit";

const fetchRepo = async (did: string) => {
	const reader = await RepoReader.init(did);
	console.log(await reader.allRecords());
	const profile = await reader.getRecord("polka.profile/self");
	const posts = await reader.getRecords("polka.post");

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

	const daemon = await DaemonClient.init(did);
	return {
		profile: parsedProfile.data,
		posts: parsedPosts,
		daemon,
	};
};

const ProfilePage: Component = () => {
	const [searchParams] = useSearchParams();
	const did = searchParams.did;
	if (!did || typeof did !== "string") {
		return <div>Please input did.</div>;
	}

	const [repo, { refetch }] = createResource(did, fetchRepo);
	const [tag, insertTag] = createSignal("");
	const [filtered, setFiltered] = createSignal<Post[]>([]);
	const [children, selectChildren] = createSignal<string[]>([]);
	const [node, selectNode] = createSignal<string>("root");

	const onProfileUpdate = async (daemon: DaemonClient, data: Profile) => {
		try {
			await daemon.update("polka.profile/self", JSON.stringify(data));
			await daemon.commit();
			refetch();
		} catch (e) {
			console.error("Failed to update post:", e);
		}
	};

	const onUpdate = async (
		daemon: DaemonClient,
		data: PostData,
		rpath: string,
	) => {
		try {
			await daemon.update(rpath, JSON.stringify(data));
			await daemon.commit();
			refetch();
		} catch (e) {
			console.error("Failed to update post:", e);
		}
	};

	const onDelete = async (daemon: DaemonClient, rpath: string) => {
		try {
			await daemon.delete(rpath);
			await daemon.commit();
			refetch();
		} catch (e) {
			console.error("Failed to delete post:", e);
		}
	};

	createEffect(() => {
		const filtered =
			repo()?.posts.filter((post) => children().includes(post.rpath)) ?? [];
		setFiltered(filtered);
	});

	return (
		<main class="container">
			<Show when={repo()} fallback={<article aria-busy="true"></article>}>
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
									<p>{did}</p>
								</hgroup>
								<Show when={r().daemon}>
									{(d) => {
										return (
											<ProfileEdit
												init={r().profile}
												onUpdate={(profile) => onProfileUpdate(d(), profile)}
											/>
										);
									}}
								</Show>
							</header>

							<p>{r().profile.description}</p>

							<footer>
								<p>
									<strong>1 nodes</strong> フォロー中
								</p>
							</footer>
						</article>

						<Show when={r().daemon} fallback={<div></div>}>
							{(d) => (
								<PostForm
									onSubmit={async (data, rpath) => {
										await d().create(rpath, JSON.stringify(data));
										await d().commit();
										refetch();
									}}
									tag={tag}
									insertTag={insertTag}
								/>
							)}
						</Show>

						<GraphComponent
							posts={r().posts}
							root={r().profile.name}
							node={node}
							selectNode={selectNode}
							insertTag={insertTag}
							selectChildren={selectChildren}
						/>

						<Show
							when={r().daemon}
							fallback={
								<article>
									<header>
										<Show when={node() !== "root"}>
											<h1>Posts: {node()}</h1>
										</Show>
									</header>
									{filtered().map((post) => (
										<PostCard post={post} profile={r().profile} />
									))}
								</article>
							}
						>
							{(d) => (
								<article>
									<header>
										<Show when={node() !== "root"}>
											<h1>Posts: {node()}</h1>
										</Show>
									</header>
									{filtered().map((post) => (
										<PostCard
											post={post}
											profile={r().profile}
											onUpdate={(tag, text) =>
												onUpdate(
													d(),
													{
														tags: tag,
														content: text,
														updatedAt: new Date().toISOString(),
													},
													post.rpath,
												)
											}
											onDelete={() => onDelete(d(), post.rpath)}
										/>
									))}
								</article>
							)}
						</Show>
					</>
				)}
			</Show>
		</main>
	);
};

export default ProfilePage;
