import {
	type Component,
	createResource,
	createSignal,
	For,
	Show,
} from "solid-js";
import FollowForm from "../components/forms/FollowForm";
import PostForm from "../components/forms/PostForm";
import ProfileEdit from "../components/forms/ProfileEditForm";
import TagForm from "../components/forms/TagForm";
import GraphComponent from "../components/graph/Graph";
import PostCard from "../components/ui/card/PostCard";
import Loading from "../components/ui/Loading";
import FollowList from "../components/ui/layout/FollowList";
import LinkList from "../components/ui/layout/LinkList";
import { ProfileHeader } from "../components/ui/layout/ProfileHeader";
import TagManager from "../components/ui/layout/TagManager";
import { useIPC } from "../hooks/useIPC";
import { getRecord, getRecords } from "../lib/client";
import { createGraphElements } from "../lib/graph";
import { followSchema, profileSchema, type Ref } from "../types";
import { validateRecord, validateRecords } from "../utils/validation";

const fetcher = async (did: string) => {
	const profile = await getRecord(did, "polka.profile/self");
	if (!profile) throw new Error("Profile not found");
	const parsedProfile = validateRecord(profile, profileSchema);
	if (!parsedProfile) throw new Error("Profile not found");

	const follows = await getRecords(did, "polka.follow");
	const parsedFollows = validateRecords(follows.records, followSchema);

	const graph = await Promise.all([
		createGraphElements(parsedProfile.name, did),
		...parsedFollows.map((follow) =>
			createGraphElements("following", follow.data.did, follow.data.tag),
		),
	]);
	const flat = graph.flat();
	return { graph: flat, profile: parsedProfile, did };
};

const TopPage: Component = () => {
	const ipc = useIPC();
	const [res] = createResource(ipc.did, fetcher);

	const [children, setChildren] = createSignal<Ref[]>([]);

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

						<section>
							<h3>タグ階層を作成</h3>
							<TagForm />
						</section>

						<section>
							<h3>投稿する</h3>
							<PostForm />
						</section>

						<section>
							<h3>タグをフォロー</h3>
							<FollowForm />
						</section>

						<section>
							<h3>データ管理</h3>
							<div
								style={{ display: "flex", gap: "1rem", "flex-wrap": "wrap" }}
							>
								<FollowList user={ipc.did} />
								<LinkList user={ipc.did} />
								<TagManager user={ipc.did} />
							</div>
						</section>

						<GraphComponent graph={f().graph} setChildren={setChildren} />
						<article>
							<For each={children()}>
								{(child) => <PostCard recordRef={child} user={ipc.did} />}
							</For>
						</article>
					</>
				)}
			</Show>
		</main>
	);
};

export default TopPage;
