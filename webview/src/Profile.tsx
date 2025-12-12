import { useSearchParams } from "@solidjs/router";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import Sigma from "sigma";
import { type Component, createEffect, createResource, Show } from "solid-js";
import { postSchema, profileSchema } from "../@types/types";
import { RepoReader } from "../lib/client";
import { DaemonClient } from "../lib/daemon";
import PostCard from "./components/PostCard";
import PostForm from "./components/PostForm";

const fetchRepo = async (did: string) => {
	const reader = await RepoReader.init(did);
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
	return { profile: parsedProfile.data, posts: parsedPosts, daemon };
};

const Profile: Component = () => {
	const [searchParams] = useSearchParams();
	const did = searchParams.did;
	if (!did || typeof did !== "string") {
		return <div>Please input did.</div>;
	}

	const [repo] = createResource(did, fetchRepo);

	let graphEl!: HTMLDivElement;

	createEffect(() => {
		const r = repo();
		if (!r) return;

		const graph = new Graph();
		r.posts.forEach((post) => {
			post.data.links?.forEach((link) => {
				try {
					graph.mergeNode(post.rpath, { x: Math.random(), y: Math.random() });
					graph.mergeNode(link, { x: Math.random(), y: Math.random() });
					graph.mergeEdge(post.rpath, link);
				} catch {}
			});
		});

		new Sigma(graph, graphEl);
		forceAtlas2.assign(graph, {
			iterations: 200,
		});
	});

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
									<strong>piyopiyo nodes</strong> フォロー中
								</p>
							</footer>
						</article>

						<Show when={r().daemon} fallback={<div></div>}>
							{(d) => {
								return (
									<PostForm
										onSubmit={(data) =>
											d().create("polka.post", JSON.stringify(data))
										}
									/>
								);
							}}
						</Show>

						<div ref={graphEl} style="width: 100vh; height: 50vh;"></div>

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
