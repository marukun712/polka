import type { Component } from "solid-js";
import { onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { RepoReader } from "../lib/client";
import { DaemonClient } from "../lib/daemon";
import { AddrInputView } from "./components/AddrInputView";
import { ErrorView } from "./components/ErrorView";
import { LoadingView } from "./components/LoadingView";
import { type Profile, ProfileCard } from "./components/ProfileCard";
import {
	type RecordData,
	RecordsTreeView,
	type TreeNode,
} from "./components/RecordsTreeView";
import { type Post, postSchema } from "./components/TimelinePostCard";
import { TimelineView } from "./components/TimelineView";

const App: Component = () => {
	const params = new URLSearchParams(window.location.search);
	const domain = params.get("domain");
	const ls = params.get("ls") === "true";

	const [state, setState] = createStore<{
		domain: string;
		client: RepoReader | null;
		daemonClient: DaemonClient | null;
		daemonDid: string | null;
		profile: Profile | null;
		treeRoot: TreeNode | null;
		posts: Post[] | null;
		loading: boolean;
		error: string;
		isOwner: boolean;
	}>({
		domain: domain ? decodeURIComponent(domain) : "",
		client: null,
		daemonClient: null,
		daemonDid: null,
		profile: null,
		posts: null,
		treeRoot: null,
		loading: false,
		error: "",
		isOwner: false,
	});

	onMount(() => {
		if (state.domain) {
			initializeAndFetch();
		}
	});

	const buildTree = (records: RecordData[]): TreeNode => {
		const root: TreeNode = {
			name: "root",
			fullPath: "",
			children: [],
			records: [],
			isExpanded: true,
		};

		for (const record of records) {
			if (record.rpath === "polka.profile/self") continue;

			const [nsid, id] = record.rpath.split("/");
			if (!nsid || !id) continue;

			const segments = nsid.split(".");
			let currentNode = root;
			let pathSoFar = "";

			for (const segment of segments) {
				pathSoFar = pathSoFar ? `${pathSoFar}.${segment}` : segment;

				let child = currentNode.children.find((c) => c.name === segment);
				if (!child) {
					child = {
						name: segment,
						fullPath: pathSoFar,
						children: [],
						records: [],
						isExpanded: false,
					};
					currentNode.children.push(child);
				}
				currentNode = child;
			}

			currentNode.records.push({
				rpath: record.rpath,
				data: record.data,
			});
		}

		return root;
	};

	const initializeAndFetch = async (): Promise<void> => {
		setState("loading", true);
		setState("error", "");

		try {
			const client = await RepoReader.init(`did:web:${state.domain}`);
			setState("client", client);

			// DaemonClient初期化
			const daemonClient = await DaemonClient.init();
			setState("daemonClient", daemonClient);

			// DID確認
			if (daemonClient) {
				try {
					const res = await fetch(`${daemonClient.url}did`);
					const { did } = await res.json();
					setState("daemonDid", did);

					const currentDid = `did:web:${state.domain}`;
					setState("isOwner", did === currentDid);
				} catch (error) {
					console.error("Failed to fetch daemon DID:", error);
				}
			}

			const profileResult = await client.getRecord("polka.profile/self");
			const allRecordsResult = await client.allRecords();

			if (profileResult.data) {
				setState("profile", JSON.parse(profileResult.data));
			}

			if (ls) {
				const tree = buildTree(
					allRecordsResult.map((result) => {
						return {
							rpath: result.rpath,
							data: JSON.parse(result.data),
						};
					}),
				);
				setState("treeRoot", tree);
			} else {
				const postsResult = await client.getRecords("polka.post");
				const posts = postsResult.map((result) => {
					return {
						rpath: result.rpath,
						data: JSON.parse(result.data),
					};
				});
				const parsed = posts
					.map((post) => {
						const success = postSchema.safeParse(post);
						if (!success.success) {
							console.error("Invalid post data:", post.data);
							return null;
						}
						return success.data;
					})
					.filter((post) => post !== null);
				setState("posts", parsed);
			}
		} catch (error) {
			console.error(error);
			setState("error", error instanceof Error ? error.message : String(error));
		} finally {
			setState("loading", false);
		}
	};

	const refreshPosts = async (): Promise<void> => {
		if (!state.client) return;
		setState("loading", true);
		try {
			const postsResult = await state.client.getRecords("polka.post");
			const posts = postsResult.map((result) => {
				return {
					rpath: result.rpath,
					data: JSON.parse(result.data),
				};
			});
			const parsed = posts
				.map((post) => {
					const success = postSchema.safeParse(post);
					if (!success.success) {
						console.error("Invalid post data:", post.data);
						return null;
					}
					return success.data;
				})
				.filter((post) => post !== null);
			setState("posts", parsed);
		} catch (error) {
			console.error("Failed to refresh posts:", error);
			setState("error", error instanceof Error ? error.message : String(error));
		} finally {
			setState("loading", false);
		}
	};

	const handleCreatePost = async (content: string): Promise<void> => {
		if (!state.daemonClient) return;
		try {
			const data = JSON.stringify({ content });
			await state.daemonClient.create("polka.post", data);
			await refreshPosts();
		} catch (error) {
			console.error("Failed to create post:", error);
			setState("error", error instanceof Error ? error.message : String(error));
		}
	};

	const handleUpdatePost = async (
		rpath: string,
		content: string,
	): Promise<void> => {
		if (!state.daemonClient) return;
		try {
			const data = JSON.stringify({ content });
			await state.daemonClient.update(rpath, data);
			await refreshPosts();
		} catch (error) {
			console.error("Failed to update post:", error);
			setState("error", error instanceof Error ? error.message : String(error));
		}
	};

	const handleDeletePost = async (rpath: string): Promise<void> => {
		if (!state.daemonClient) return;
		try {
			await state.daemonClient.delete(rpath);
			await refreshPosts();
		} catch (error) {
			console.error("Failed to delete post:", error);
			setState("error", error instanceof Error ? error.message : String(error));
		}
	};

	const handleDomainSubmit = (domain: string): void => {
		const encodedDomain = encodeURIComponent(domain);
		window.location.href = `?domain=${encodedDomain}`;
	};

	return (
		<div class="min-h-screen bg-gray-50">
			<Show when={!state.domain}>
				<AddrInputView onSubmit={handleDomainSubmit} />
			</Show>

			<Show when={state.domain}>
				<div class="max-w-6xl mx-auto p-4 md:p-6">
					<div class="mb-4 flex justify-between items-center">
						<button
							type="button"
							onClick={() => {
								window.location.href = "/";
							}}
							class="text-blue-600 hover:text-blue-800 transition-colors"
						>
							View Different Repository
						</button>
					</div>

					<Show when={state.loading}>
						<LoadingView />
					</Show>

					<Show when={state.error}>
						<ErrorView error={state.error} onRetry={initializeAndFetch} />
					</Show>

					<Show when={!state.loading && !state.error}>
						<Show when={state.profile}>
							{(p) => <ProfileCard profile={p()} />}
						</Show>
						<Show when={ls}>
							<Show when={state.treeRoot}>
								{(r) => <RecordsTreeView root={r()} />}
							</Show>
						</Show>
						<Show when={!ls}>
							<Show
								when={
									state.posts && state.profile
										? { posts: state.posts, profile: state.profile }
										: null
								}
							>
								{(p) => (
									<TimelineView
										posts={p().posts}
										profile={p().profile}
										isOwner={state.isOwner}
										onCreatePost={handleCreatePost}
										onUpdatePost={handleUpdatePost}
										onDeletePost={handleDeletePost}
									/>
								)}
							</Show>
						</Show>
					</Show>
				</div>
			</Show>
		</div>
	);
};

export default App;
