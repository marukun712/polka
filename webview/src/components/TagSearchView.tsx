import type { Component } from "solid-js";
import { For, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { resolveRecord } from "../../lib/identity";
import { searchPostsByTag } from "../../lib/storeClient";
import { ErrorView } from "./ErrorView";
import { LoadingView } from "./LoadingView";
import { type TimelinePost, TimelinePostCard } from "./TimelinePostCard";

interface TagSearchViewProps {
	tag: string;
	onBack: () => void;
}

export const TagSearchView: Component<TagSearchViewProps> = (props) => {
	const [state, setState] = createStore({
		posts: [] as TimelinePost[],
		loading: false,
		error: "",
	});

	const loadPostProfile = async (post: TimelinePost, index: number) => {
		setState("posts", index, "profileLoading", true);
		try {
			const profileResult = await resolveRecord(post.did, "polka.profile/self");
			if (profileResult.data) {
				const profile = JSON.parse(profileResult.data);
				setState("posts", index, {
					profile,
					profileLoading: false,
				});
			} else {
				setState("posts", index, {
					profile: null,
					profileLoading: false,
				});
			}
		} catch (error) {
			console.error("Failed to load profile:", error);
			setState("posts", index, {
				profile: null,
				profileLoading: false,
			});
		}
	};

	const loadPostContent = async (post: TimelinePost, index: number) => {
		setState("posts", index, "contentLoading", true);
		try {
			const result = await resolveRecord(post.did, post.rpath);
			if (result.data) {
				const data = JSON.parse(result.data);
				setState("posts", index, {
					content: data.content,
					contentLoading: false,
					contentError: undefined,
				});
			} else {
				setState("posts", index, {
					contentLoading: false,
					contentError: "本文が見つかりませんでした",
				});
			}
		} catch (error) {
			console.error("Failed to load post content:", error);
			setState("posts", index, {
				contentLoading: false,
				contentError: "本文の取得に失敗しました",
			});
		}
	};

	const searchPosts = async () => {
		setState("loading", true);
		setState("error", "");

		try {
			const metadata = await searchPostsByTag(props.tag);

			const sorted = metadata.sort((a, b) => {
				return (
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
			});

			const posts: TimelinePost[] = sorted.map((m) => ({
				id: m.id,
				did: m.did,
				rpath: m.rpath,
				tag: m.tag,
				contentLoading: true,
				profileLoading: true,
			}));

			setState("posts", posts);

			for (let i = 0; i < posts.length; i++) {
				loadPostProfile(posts[i], i);
				loadPostContent(posts[i], i);
			}
		} catch (error) {
			console.error("Failed to search posts:", error);
			setState("error", error instanceof Error ? error.message : String(error));
		} finally {
			setState("loading", false);
		}
	};

	onMount(() => {
		searchPosts();
	});

	return (
		<div class="min-h-screen bg-gray-50">
			<div class="max-w-4xl mx-auto p-4 md:p-6">
				<div class="mb-6 flex justify-between items-center">
					<div>
						<h1 class="text-3xl font-bold text-gray-900 mb-2">
							#{props.tag} の検索結果
						</h1>
						<Show when={!state.loading && !state.error}>
							<div class="text-sm text-gray-600">
								{state.posts.length}件の投稿
							</div>
						</Show>
					</div>
					<button
						type="button"
						onClick={props.onBack}
						class="text-blue-600 hover:text-blue-800 transition-colors"
					>
						← タイムラインへ戻る
					</button>
				</div>

				<Show when={state.loading}>
					<LoadingView />
				</Show>
				<Show when={state.error && !state.loading}>
					<ErrorView error={state.error} onRetry={searchPosts} />
				</Show>

				<Show when={!state.loading && !state.error}>
					<Show
						when={state.posts.length > 0}
						fallback={
							<div class="text-center text-gray-500 py-12">
								「#{props.tag}」のタグが付いた投稿は見つかりませんでした
							</div>
						}
					>
						<For each={state.posts}>
							{(post) => <TimelinePostCard post={post} />}
						</For>
					</Show>
				</Show>
			</div>
		</div>
	);
};
