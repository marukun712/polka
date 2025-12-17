import { useSearchParams } from "@solidjs/router";
import { type Component, createEffect, createSignal, Show } from "solid-js";
import GraphComponent from "../components/graph/Graph";
import { PostList } from "../components/layout/PostList";
import { ProfileHeader } from "../components/layout/ProfileHeader";
import Loading from "../components/ui/Loading";
import { useFeedData } from "../hooks/useFeedData";
import { useFilteredPosts } from "../hooks/useFilteredPosts";
import type { Node, Ref } from "../types";

const UserPage: Component = () => {
	const [searchParams] = useSearchParams<{ did: string }>();
	const userDid = () => searchParams.did;
	const did = userDid();

	if (!did) {
		return (
			<main class="container" style="text-align: center; padding-top: 10rem;">
				<h1>No user DID provided.</h1>
			</main>
		);
	}

	const res = useFeedData(did);

	const [node, setNode] = createSignal<Node>({ id: "", label: "" });
	const [children, setChildren] = createSignal<Set<Ref>>(new Set());

	const { items: filteredPosts } = useFilteredPosts(children);

	createEffect(() => {
		const r = res();
		if (!r) return;
		setNode({ id: r.feed.id, label: r.feed.ownerProfile.name });
	});

	return (
		<main class="container">
			<Show when={res() === undefined}>
				<Loading />
			</Show>

			<Show when={res() === null}>
				<main class="container" style="text-align: center; padding-top: 10rem;">
					<h1>User not found.</h1>
				</main>
			</Show>

			<Show when={res()}>
				{(f) => (
					<>
						<ProfileHeader
							profile={f().feed.ownerProfile}
							did={f().feed.did}
							followCount={f().feed.follows.length}
							isOwner={false}
						/>

						<GraphComponent
							feed={f().feed}
							follows={f().followFeeds}
							node={node}
							setNode={setNode}
							setChildren={setChildren}
						/>

						<PostList
							title={node().label}
							posts={filteredPosts()}
							isOwner={false}
						/>
					</>
				)}
			</Show>
		</main>
	);
};

export default UserPage;
