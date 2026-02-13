import { useSearchParams } from "@solidjs/router";
import {
	type Component,
	createResource,
	createSignal,
	For,
	Show,
} from "solid-js";
import GraphComponent from "../components/graph/Graph";
import PostCard from "../components/ui/card/PostCard";
import Loading from "../components/ui/Loading";
import { ProfileHeader } from "../components/ui/layout/ProfileHeader";
import { useIPC } from "../hooks/useIPC";
import { createGraphElements } from "../lib/graph";
import { getRecord, getRecords } from "../lib/reader";
import { edgeSchema, followSchema, profileSchema, type Ref } from "../types";
import { validateRecord, validateRecords } from "../utils/validation";

const fetcher = async (did: string, myDid: string) => {
	const profile = await getRecord(did, "polka.profile/self");
	if (!profile) throw new Error("Profile not found");
	const parsedProfile = validateRecord(profile, profileSchema);
	if (!parsedProfile) throw new Error("Profile not found");

	const follows = await getRecords(did, "polka.follow");
	const parsedFollows = validateRecords(follows.records, followSchema);

	const edges = await getRecords(myDid, "polka.edge");
	const parsedEdges = validateRecords(edges.records, edgeSchema);
	const availableTags = [...new Set(parsedEdges.map((e) => e.data.to))];

	const graph = await Promise.all([
		createGraphElements(parsedProfile.name, did),
		...parsedFollows.map((follow) =>
			createGraphElements("following", follow.data.did, follow.data.tag),
		),
	]);
	const flat = graph.flat();
	return { graph: flat, profile: parsedProfile, did, availableTags };
};

const UserPage: Component = () => {
	const [params] = useSearchParams();
	const ipc = useIPC();
	const [res] = createResource(
		() => [params.did as string, ipc.did] as const,
		([did, myDid]) => fetcher(did, myDid),
	);

	const [children, setChildren] = createSignal<Ref[]>([]);

	return (
		<main class="container">
			<Show when={res()} fallback={<Loading />}>
				{(f) => (
					<>
						<a href="/">トップページに戻る</a>
						<ProfileHeader profile={f().profile} did={f().did} />

						<GraphComponent
							graph={() => new Set(f().graph)}
							setChildren={setChildren}
						/>
						<article>
							<For each={children()}>
								{(child) => (
									<PostCard
										recordRef={child}
										user={ipc.did}
										availableTags={f().availableTags}
									/>
								)}
							</For>
						</article>
					</>
				)}
			</Show>
		</main>
	);
};

export default UserPage;
