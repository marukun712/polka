import { BloomFilter } from "bloomfilter";
import type { ElementDefinition } from "cytoscape";
import {
	type Component,
	createEffect,
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
	const [graph, setGraph] = createSignal<Set<ElementDefinition>>(new Set());

	createEffect(() => {
		const r = res();
		if (r) {
			setGraph(new Set(r.graph));
			if (r.availableTags.length === 0) return;
			ipc.client.ad(r.availableTags);

			const intervalId = setInterval(
				() => {
					ipc.client.ad(r.availableTags);
				},
				60 * 5 * 1000,
			);
			onCleanup(() => clearInterval(intervalId));
		}
	});

	onMount(() => {
		const close = subscribe(async (ad: Ad) => {
			const myTags = res()?.availableTags || [];
			const loadedBloom = new BloomFilter(JSON.parse(ad.bloom), 16);
			const isMatch = myTags.some((tag) => loadedBloom.test(tag));

			if (isMatch) {
				const profile = await getRecord(ad.did, "polka.profile/self");
				const parsed = validateRecord(profile, profileSchema);
				const nodes: ElementDefinition[] = [];

				if (parsed) {
					const angle = Math.random() * 2 * Math.PI;
					const minRadius = 150;
					const maxRadius = 300;
					const radius = minRadius + Math.random() * (maxRadius - minRadius);

					const x = Math.cos(angle) * radius;
					const y = Math.sin(angle) * radius;

					nodes.push({
						data: {
							id: ad.did,
							type: "user",
							did: ad.did,
							icon: parsed.icon,
						},
						position: { x, y },
					});
					const set = new Set([...graph(), ...nodes]);
					setGraph(set);
				}
			}
		});
		onCleanup(() => close());
	});

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
										window.location.hash = `#/user?did=${encodeURIComponent(did)}`;
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

						<GraphComponent graph={graph} setChildren={setChildren} />
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
