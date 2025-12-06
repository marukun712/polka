import type { Component } from "solid-js";
import { createSignal, For, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { resolveRecord } from "../../lib/identity";
import type { PostMetadata } from "../../lib/storeClient";
import { connectToRelay, fetchPosts } from "../../lib/storeClient";
import { ErrorView } from "./ErrorView";
import { LoadingView } from "./LoadingView";
import { type TimelinePost, TimelinePostCard } from "./TimelinePostCard";

type ConnectionStatus = "connected" | "connecting" | "disconnected";

export const TimelineView: Component = () => {
	const [state, setState] = createStore({
		posts: [] as TimelinePost[],
		loading: false,
		error: "",
	});

	const [wsStatus, setWsStatus] =
		createSignal<ConnectionStatus>("disconnected");

	const [searchInput, setSearchInput] = createSignal("");

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

	const initializeTimeline = async () => {
		setState("loading", true);
		setState("error", "");

		try {
			const metadata = await fetchPosts();

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
			console.error("Failed to fetch posts:", error);
			setState("error", error instanceof Error ? error.message : String(error));
		} finally {
			setState("loading", false);
		}
	};

	const connectWebSocket = () => {
		setWsStatus("connecting");

		connectToRelay(
			() => {
				setWsStatus("connected");
			},
			(newPost: PostMetadata) => {
				console.log("New post received:", newPost);

				const exists = state.posts.some((p) => p.rpath === newPost.rpath);
				if (exists) return;

				const post: TimelinePost = {
					id: newPost.id || `new-${Date.now()}`,
					did: newPost.did,
					rpath: newPost.rpath,
					tag: newPost.tag || [],
					contentLoading: true,
					profileLoading: true,
				};

				setState("posts", (posts) => [post, ...posts]);

				loadPostProfile(post, 0);
				loadPostContent(post, 0);
			},
			(error: Error) => {
				console.error("WebSocket error:", error);
				setWsStatus("disconnected");
			},
		);
	};

	onMount(() => {
		initializeTimeline();
		connectWebSocket();
	});

	const getStatusColor = () => {
		switch (wsStatus()) {
			case "connected":
				return "bg-green-500";
			case "connecting":
				return "bg-yellow-500";
			case "disconnected":
				return "bg-red-500";
		}
	};

	const getStatusText = () => {
		switch (wsStatus()) {
			case "connected":
				return "接続中";
			case "connecting":
				return "接続中...";
			case "disconnected":
				return "オフライン";
		}
	};

	const handleSearch = () => {
		const tag = searchInput().trim();
		if (tag) {
			window.location.href = `/timeline?tag=${encodeURIComponent(tag)}`;
		}
	};

	return (
		<div class="min-h-screen bg-gray-50">
			<div class="max-w-4xl mx-auto p-4 md:p-6">
				<div class="mb-6">
					<div class="flex justify-between items-center mb-4">
						<div>
							<h1 class="text-3xl font-bold text-gray-900 mb-2">
								タイムライン
							</h1>
							<div class="flex items-center gap-2">
								<div class={`w-2 h-2 rounded-full ${getStatusColor()}`} />
								<span class="text-sm text-gray-600">{getStatusText()}</span>
							</div>
						</div>
						<button
							type="button"
							onClick={() => {
								window.location.href = "/";
							}}
							class="text-blue-600 hover:text-blue-800 transition-colors"
						>
							← ホームへ戻る
						</button>
					</div>
					<div class="flex gap-2 items-center">
						<input
							type="text"
							value={searchInput()}
							onInput={(e) => setSearchInput(e.currentTarget.value)}
							onKeyPress={(e) => {
								if (e.key === "Enter" && searchInput().trim()) {
									handleSearch();
								}
							}}
							placeholder="タグで検索..."
							class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<button
							type="button"
							onClick={handleSearch}
							disabled={!searchInput().trim()}
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
						>
							検索
						</button>
					</div>
				</div>

				<Show when={state.loading}>
					<LoadingView />
				</Show>
				<Show when={state.error && !state.loading}>
					<ErrorView error={state.error} onRetry={initializeTimeline} />
				</Show>

				<Show when={!state.loading && !state.error}>
					<Show
						when={state.posts.length > 0}
						fallback={
							<div class="text-center text-gray-500 py-12">
								投稿がまだありません
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
