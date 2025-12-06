import type { Component } from "solid-js";
import { onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Client } from "../lib/client";
import { AddrInputView } from "./components/AddrInputView";
import { ErrorView } from "./components/ErrorView";
import { LoadingView } from "./components/LoadingView";
import { type Profile, ProfileCard } from "./components/ProfileCard";
import {
	type RecordData,
	RecordsTreeView,
	type TreeNode,
} from "./components/RecordsTreeView";
import { TagSearchView } from "./components/TagSearchView";
import { TimelineView } from "./components/TimelineView";
import { SetupWizard } from "./views/SetupWizard";

const App: Component = () => {
	const path = window.location.pathname;
	const isTimelinePage = path === "/timeline";
	const isSetupPage = path === "/setup";

	const params = new URLSearchParams(window.location.search);
	const domain = params.get("domain");
	const searchTag = isTimelinePage ? params.get("tag") : null;

	const [state, setState] = createStore({
		domain: domain ? decodeURIComponent(domain) : "",
		client: null as Client | null,
		profile: null as Profile | null,
		treeRoot: null as TreeNode | null,
		loading: false,
		error: "",
	});

	onMount(() => {
		// セットアップ完了チェック
		const setupCompleted = localStorage.getItem("setupCompleted");
		if (!setupCompleted && !isSetupPage) {
			window.location.href = "/setup";
			return;
		}
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

	const initializeAndFetch = async () => {
		setState("loading", true);
		setState("error", "");
		try {
			const client = await Client.init(`did:web:${state.domain}`);
			setState("client", client);
			const profileResult = await client.getRecord("polka.profile/self");
			const allRecordsResult = await client.allRecords();
			if (profileResult.data) {
				setState("profile", JSON.parse(profileResult.data));
			}
			const tree = buildTree(
				allRecordsResult.map((result) => {
					return {
						rpath: result.rpath,
						data: JSON.parse(result.data),
					};
				}),
			);
			setState("treeRoot", tree);
		} catch (error) {
			console.error(error);
			setState("error", error instanceof Error ? error.message : String(error));
		} finally {
			setState("loading", false);
		}
	};

	const handleDomainSubmit = (domain: string) => {
		const encodedDomain = encodeURIComponent(domain);
		window.location.href = `?domain=${encodedDomain}`;
	};

	return (
		<div class="min-h-screen bg-gray-50">
			<Show when={isSetupPage}>
				<SetupWizard />
			</Show>

			<Show when={isTimelinePage && !isSetupPage}>
				<Show when={searchTag} fallback={<TimelineView />}>
					{(t) => {
						return (
							<TagSearchView
								tag={t()}
								onBack={() => {
									window.location.href = "/timeline";
								}}
							/>
						);
					}}
				</Show>
			</Show>

			<Show when={!isTimelinePage && !isSetupPage}>
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
								← View Different Repository
							</button>
							<button
								type="button"
								onClick={() => {
									window.location.href = "/timeline";
								}}
								class="text-blue-600 hover:text-blue-800 transition-colors"
							>
								タイムライン →
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
								<ProfileCard profile={state.profile} />
							</Show>

							<Show when={state.treeRoot}>
								<RecordsTreeView root={state.treeRoot} />
							</Show>
						</Show>
					</div>
				</Show>
			</Show>
		</div>
	);
};

export default App;
