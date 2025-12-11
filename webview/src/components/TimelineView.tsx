import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import { PostCreateForm } from "./PostCreateForm";
import { type Post, type Profile, TimelinePostCard } from "./TimelinePostCard";

interface TimelineViewProps {
	posts: Post[];
	profile: Profile;
	isOwner: boolean;
	onCreatePost?: (content: string) => Promise<void>;
	onUpdatePost?: (rpath: string, content: string) => Promise<void>;
	onDeletePost?: (rpath: string) => Promise<void>;
}

export const TimelineView: Component<TimelineViewProps> = (props) => {
	return (
		<div class="min-h-screen bg-gray-50">
			<div class="max-w-4xl mx-auto p-4 md:p-6">
				<Show
					when={
						props.isOwner && props.onCreatePost
							? { owner: props.isOwner, create: props.onCreatePost }
							: null
					}
				>
					{(p) => <PostCreateForm onSubmit={p().create} />}
				</Show>

				<Show
					when={props.posts.length > 0}
					fallback={
						<div class="text-center text-gray-500 py-12">
							投稿がまだありません
						</div>
					}
				>
					<For each={props.posts}>
						{(post) => (
							<TimelinePostCard
								post={post}
								profile={props.profile}
								isOwner={props.isOwner}
								onUpdate={props.onUpdatePost}
								onDelete={props.onDeletePost}
							/>
						)}
					</For>
				</Show>
			</div>
		</div>
	);
};
