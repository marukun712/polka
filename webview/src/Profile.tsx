import { useSearchParams } from "@solidjs/router";
import { type Component, createResource, Show } from "solid-js";
import { postSchema, profileSchema } from "../@types/types";
import { RepoReader } from "../lib/client";
import PostCard from "./components/PostCard";

const fetchRepo = async (did: string) => {
	const reader = await RepoReader.init(did);
	const profile = await reader.getRecord("polka.profile/self");
	const posts = await reader.getRecords("polka.post");
	console.log(posts);
	const parsedProfile = profileSchema.safeParse(JSON.parse(profile.data));
	if (!parsedProfile.success) {
		console.error("Failed to parse profile:", parsedProfile.error);
		return;
	}
	const parsedPosts = postSchema.array().safeParse(
		posts.map((post) => {
			return { rpath: post.rpath, data: JSON.parse(post.data) };
		}),
	);
	if (!parsedPosts.success) {
		console.error("Failed to parse posts:", parsedPosts.error);
		return;
	}
	return { profile: parsedProfile.data, posts: parsedPosts.data };
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
			<Show when={repo()} fallback={<div>Loading...</div>}>
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

						<article>
							<header>
								<h2>投稿</h2>
							</header>
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
