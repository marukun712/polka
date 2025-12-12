import { useSearchParams } from "@solidjs/router";
import { type Component, createResource, Show } from "solid-js";
import { postSchema, profileSchema } from "../@types/types";
import { RepoReader } from "../lib/client";
import { DaemonClient } from "../lib/daemon";
import GraphComponent from "./components/Graph";
import PostCard from "./components/PostCard";
import PostForm from "./components/PostForm";

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

const Profile: Component = () => {
	const [searchParams] = useSearchParams();
	const did = searchParams.did;
	if (!did || typeof did !== "string") {
		return <div>Please input did.</div>;
	}

	const [repo] = createResource(did, fetchRepo);

	return (
		<main class="container">
			<Show when={repo()} fallback={<article aria-busy="true"></article>}>
				{(r) => (
					<>
						<article>
							<header>
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
							</header>

							<p>{r().profile.description}</p>

							<footer>
								<p>
									<strong>1 nodes</strong> フォロー中
								</p>
							</footer>
						</article>

						<Show when={r().daemon} fallback={<div></div>}>
							{(d) => {
								return (
									<PostForm
										onSubmit={async (data, rpath) => {
											await d().create(rpath, JSON.stringify(data));
											await d().commit();
										}}
									/>
								);
							}}
						</Show>

						<GraphComponent posts={r().posts} root={r().profile.name} />

						<article>
							<header></header>
							{r().posts.map((post) => (
								<PostCard post={post} profile={r().profile} />
							))}
						</article>
					</>
				)}
			</Show>
		</main>
	);
};

export default Profile;
