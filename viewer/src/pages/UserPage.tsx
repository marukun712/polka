import { useSearchParams } from "@solidjs/router";
import type { ElementDefinition } from "cytoscape";
import {
	type Component,
	createEffect,
	createResource,
	createSignal,
	For,
	Show,
} from "solid-js";
import GraphComponent from "../components/graph/Graph";
import PostCard from "../components/ui/card/PostCard";
import Loading from "../components/ui/Loading";
import { ProfileHeader } from "../components/ui/layout/ProfileHeader";
import { createGraphElements } from "../lib/graph";
import { getRecord, getRecords } from "../lib/reader";
import { edgeSchema, followSchema, profileSchema, type Ref } from "../types";
import { validateRecord, validateRecords } from "../utils/validation";

const LAST_DID_KEY = "polka_last_did";

const fetcher = async (did: string) => {
	const profile = await getRecord(did, "polka.profile/self");
	if (!profile) throw new Error("Profile not found");
	const parsedProfile = validateRecord(profile, profileSchema);
	if (!parsedProfile) throw new Error("Profile parse failed");

	const follows = await getRecords(did, "polka.follow");
	const parsedFollows = validateRecords(follows.records, followSchema);

	const edges = await getRecords(did, "polka.edge");
	const parsedEdges = validateRecords(edges.records, edgeSchema);
	const availableTags = [...new Set(parsedEdges.map((e) => e.data.to))];

	const graph = await Promise.all([
		createGraphElements(parsedProfile.name, did),
		...parsedFollows.map((follow) =>
			createGraphElements("following", follow.data.did, follow.data.tag),
		),
	]);

	return { graph: graph.flat(), profile: parsedProfile, did, availableTags };
};

const UserPage: Component = () => {
	const [params] = useSearchParams();
	const [res] = createResource(() => params.did as string, fetcher);
	const [children, setChildren] = createSignal<Ref[]>([]);
	const [graph, setGraph] = createSignal<Set<ElementDefinition>>(new Set());

	const did = () => params.did as string;

	createEffect(() => {
		const r = res();
		if (r) setGraph(new Set(r.graph));
	});

	return (
		<main class="container">
			<nav>
				<ul>
					<li>
						<a
							href="#/"
							onClick={() => {
								localStorage.removeItem(LAST_DID_KEY);
							}}
						>
							Change DID
						</a>
					</li>
				</ul>
				<ul>
					<li>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								const formData = new FormData(e.currentTarget);
								const newDid = (formData.get("did") as string).trim();
								if (!newDid) return;
								localStorage.setItem(LAST_DID_KEY, newDid);
								window.location.hash = `#/user?did=${encodeURIComponent(newDid)}`;
							}}
						>
							<input
								type="text"
								name="did"
								placeholder="Search DID..."
								value={did()}
							/>
							<button type="submit">Go</button>
						</form>
					</li>
				</ul>
			</nav>

			<Show when={res.error}>
				<article>
					<p>Failed to load: {(res.error as Error).message}</p>
				</article>
			</Show>

			<Show when={res()} fallback={<Loading />}>
				{(f) => (
					<>
						<ProfileHeader profile={f().profile} did={f().did} />
						<GraphComponent graph={graph} setChildren={setChildren} />
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

export default UserPage;
