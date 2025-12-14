import { type Component, createEffect, createSignal, Show } from "solid-js";
import FollowForm from "../components/FollowForm";
import PostEdit from "../components/forms/PostEditForm";
import ProfileEdit from "../components/forms/ProfileEditForm";
import GraphComponent from "../components/graph/Graph";
import LinkButton from "../components/LinkButton";
import { PostList } from "../components/layout/PostList";
import { ProfileHeader } from "../components/layout/ProfileHeader";
import PostForm from "../components/PostForm";
import Loading from "../components/ui/Loading";
import { useFeedData } from "../hooks/useFeedData";
import { useFilteredPosts } from "../hooks/useFilteredPosts";
import type { Node, Ref } from "../types";

const TopPage: Component = () => {
	const res = useFeedData();

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
			<Show when={res()} fallback={<Loading />}>
				{(f) => (
					<>
						<ProfileHeader
							profile={f().feed.ownerProfile}
							publicKey={f().feed.pk}
							followCount={f().feed.follows.length}
							isOwner={true}
							headerAction={<ProfileEdit init={f().feed.ownerProfile} />}
						/>

						<PostForm />
						<FollowForm />

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
