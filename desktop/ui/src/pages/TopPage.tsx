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
import { ProfileHeader } from "../components/ui/layout/ProfileHeader";
import { useIPC } from "../hooks/useIPC";
import { getRecord, getRecords } from "../lib/client";
import { createGraphElements } from "../lib/graph";
import { edgeSchema, profileSchema, type Ref } from "../types";
import { validateRecord, validateRecords } from "../utils/validation";

const fetcher = async (did: string) => {
	const edges = await getRecords(did, "polka.edge");
	const profile = await getRecord(did, "polka.profile/self");
	if (!profile) throw new Error("Profile not found");
	const parsedProfile = validateRecord(profile, profileSchema);
	if (!parsedProfile) throw new Error("Profile not found");
	const parsedEdges = validateRecords(edges.records, edgeSchema);
	const graph = await createGraphElements(
		crypto.randomUUID(),
		parsedProfile.name,
		parsedEdges,
		did,
	);
	return { graph, profile: parsedProfile, did };
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

						<TagForm />
						<PostForm />
						<FollowForm />
						<GraphComponent graph={f().graph} setChildren={setChildren} />
						<article>
							<For each={children()}>
								{(child) => <PostCard recordRef={child} />}
							</For>
						</article>
					</>
				)}
			</Show>
		</main>
	);
};

export default TopPage;
