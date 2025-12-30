import { randomUUID } from "node:crypto";
import {
	type Component,
	createEffect,
	createResource,
	createSignal,
	Show,
} from "solid-js";
import FollowForm from "../components/forms/FollowForm";
import PostEdit from "../components/forms/PostEditForm";
import PostForm from "../components/forms/PostForm";
import ProfileEdit from "../components/forms/ProfileEditForm";
import GraphComponent from "../components/graph/Graph";
import Loading from "../components/ui/Loading";
import FollowList from "../components/ui/layout/FollowList";
import { PostList } from "../components/ui/layout/PostList";
import { ProfileHeader } from "../components/ui/layout/ProfileHeader";
import { useIPC } from "../hooks/useIPC";
import { getRecord, getRecords } from "../lib/client";
import { createGraphElements } from "../lib/graph";
import {
	edgeSchema,
	linkSchema,
	type Post,
	postSchema,
	profileSchema,
	type Ref,
} from "../types";
import { validateRecord, validateRecords } from "../utils/validation";

const fetcher = async (did: string) => {
	const edges = await getRecords(did, "polka.edge");
	const profile = await getRecord(did, "polka.profile/self");
	if (!profile) throw new Error("Profile not found");
	const parsedProfile = validateRecord(profile, profileSchema);
	if (!parsedProfile) throw new Error("Profile not found");
	const parsedEdges = validateRecords(edges.records, edgeSchema);
	const graph = createGraphElements(
		randomUUID(),
		parsedProfile.name,
		parsedEdges,
		did,
	);
	return { graph, profile: parsedProfile, did };
};

const TopPage: Component = () => {
	const ipc = useIPC();
	const [res] = createResource(ipc.did, fetcher);

	const [posts, setPosts] = createSignal<Post[]>([]);
	const [children, setChildren] = createSignal<Set<Ref>>(new Set());

	createEffect(async () => {
		const posts = (
			await Promise.all(
				children()
					.entries()
					.map(async ([child]) => {
						const record = await getRecord(child.did, child.rpath);
						const isPost = validateRecord(record, postSchema);
						const isLink = validateRecord(record, linkSchema);
						if (isLink) {
							const record = await getRecord(
								isLink.data.ref.did,
								isLink.data.ref.rpath,
							);
							const parsed = validateRecord(record, postSchema);
							return parsed;
						} else if (isPost) {
							return isPost;
						} else {
							return null;
						}
					}),
			)
		).filter((p) => p !== null);
		setPosts(posts);
	}, [children]);

	return (
		<main class="container">
			<Show when={res()} fallback={<Loading />}>
				{(f) => (
					<>
						<a href="/inspector">View inspector</a>
						<ProfileHeader
							profile={f().profile}
							did={f().did}
							headerAction={<ProfileEdit init={f().profile} />}
						/>

						<PostForm />
						<FollowForm />
						<FollowList follows={f().feed.follows} />

						<GraphComponent graph={f().graph} setChildren={setChildren} />

						<PostList
							posts={posts()}
							isOwner={true}
							headerAction={(item) => <PostEdit post={item.post} />}
							footerAction={(item, links) => (
								<LinkButton did={item.did} links={links} post={item.post} />
							)}
						/>
					</>
				)}
			</Show>
		</main>
	);
};

export default TopPage;
