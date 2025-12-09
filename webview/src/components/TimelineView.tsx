import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import { type Post, type Profile, TimelinePostCard } from "./TimelinePostCard";

export const TimelineView: Component<{ posts: Post[]; profile: Profile }> = ({
	posts,
	profile,
}) => {
	return (
		<div class="min-h-screen bg-gray-50">
			<div class="max-w-4xl mx-auto p-4 md:p-6">
				<Show
					when={posts.length > 0}
					fallback={
						<div class="text-center text-gray-500 py-12">
							投稿がまだありません
						</div>
					}
				>
					<For each={posts}>
						{(post) => <TimelinePostCard post={post} profile={profile} />}
					</For>
				</Show>
			</div>
		</div>
	);
};
