import type { ElementDefinition } from "cytoscape";
import {
	type Component,
	createResource,
	createSignal,
	For,
	onCleanup,
	onMount,
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
import { subscribe } from "../lib/discovery";
import { createGraphElements } from "../lib/graph";
import {
	type Ad,
	edgeSchema,
	followSchema,
	profileSchema,
	type Ref,
} from "../types";
import { validateRecord, validateRecords } from "../utils/validation";

const fetcher = async (did: string) => {
	const profile = await getRecord(did, "polka.profile/self");
	if (!profile) throw new Error("Profile not found");
	const parsedProfile = validateRecord(profile, profileSchema);
	if (!parsedProfile) throw new Error("Profile not found");

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
	const flat = graph.flat();
	return { graph: flat, profile: parsedProfile, did, availableTags };
};

const TopPage: Component = () => {
	const ipc = useIPC();
	const [res] = createResource(ipc.did, fetcher);

	const [children, setChildren] = createSignal<Ref[]>([]);
	const [discoveredUsers, setDiscoveredUsers] = createSignal<
		Map<string, Set<string>>
	>(new Map());

	onMount(() => {
		const interval = setInterval(() => {
			const r = res();
			if (r) {
				ipc.client.ad(r.availableTags);
			}
		}, 30000);

		onCleanup(() => clearInterval(interval));
	});

	onMount(() => {
		subscribe((ad: Ad) => {
			const myTags = res()?.availableTags || [];
			const matchingTags = ad.tags.filter((tag) => myTags.includes(tag));

			if (matchingTags.length > 0) {
				setDiscoveredUsers((prev) => {
					const next = new Map(prev);
					for (const tag of matchingTags) {
						const users = next.get(tag) || new Set();
						users.add(ad.did);
						next.set(tag, users);
					}
					return next;
				});
			}
		});
	});

	const enhancedGraph = () => {
		const r = res();
		if (!r) return [];

		const baseGraph = r.graph;
		const discovered = discoveredUsers();
		const userNodes: ElementDefinition[] = [];
		const userEdges: ElementDefinition[] = [];

		discovered.forEach((dids, tag) => {
			const tagNode = baseGraph.find(
				(el) => el.data?.label === tag && el.data?.type === "tag",
			);

			if (tagNode) {
				const tagId = tagNode.data.id;
				const users = Array.from(dids);
				const radius = 100;
				const angleStep = (2 * Math.PI) / users.length;

				users.forEach(async (did, index) => {
					const profile = await getRecord(did, "polka.profile/self");
					const parsed = validateRecord(profile, profileSchema);
					if (parsed) {
						const angle = index * angleStep;
						const offsetX = Math.cos(angle) * radius;
						const offsetY = Math.sin(angle) * radius;

						userNodes.push({
							data: {
								id: `user:${tagId}:${did}`,
								label: parsed.name || did.slice(0, 8),
								type: "user",
								icon: parsed.icon,
								did: did,
								tagId: tagId,
								offsetX,
								offsetY,
							},
						});

						userEdges.push({
							data: {
								source: tagId,
								target: `user:${tagId}:${did}`,
							},
						});
					}
				});
			}
		});

		return [...baseGraph, ...userNodes, ...userEdges];
	};

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
							<h3>ユーザープロフィール検索</h3>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									const formData = new FormData(e.currentTarget);
									const did = formData.get("did") as string;
									if (did.trim()) {
										window.location.hash = `#/user?did=${did}`;
									}
								}}
							>
								<input
									type="text"
									name="did"
									placeholder="Enter user DID..."
									required
								/>
								<button type="submit">View Profile</button>
							</form>
						</section>

						<section>
							<h3>タグ階層を作成</h3>
							<TagForm />
						</section>

						<section>
							<h3>投稿する</h3>
							<PostForm availableTags={f().availableTags} />
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

						<GraphComponent graph={enhancedGraph()} setChildren={setChildren} />
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

export default TopPage;
