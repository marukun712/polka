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

const App: Component = () => {
	const params = new URLSearchParams(window.location.search);
	const addrParam = params.get("relay");
	const id = params.get("relay");

	const [state, setState] = createStore({
		id: id ? decodeURIComponent(id) : "",
		relay: addrParam ? decodeURIComponent(addrParam) : "",
		client: null as Client | null,
		profile: null as Profile | null,
		treeRoot: null as TreeNode | null,
		loading: false,
		error: "",
	});

	onMount(() => {
		if (state.id && state.relay) {
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
			const client = await Client.create(state.relay, state.id);
			setState("client", client);

			const [profileResult, allRecordsResult] = await Promise.all([
				client
					.getRecord("polka.profile/self")
					.catch(() => ({ rpath: "polka.profile/self", data: null })),
				client.allRecords().catch(() => []),
			]);

			if (profileResult.data) {
				setState("profile", profileResult.data as Profile);
			}

			const tree = buildTree(allRecordsResult as RecordData[]);
			setState("treeRoot", tree);
		} catch (error) {
			setState("error", error instanceof Error ? error.message : String(error));
		} finally {
			setState("loading", false);
		}
	};

	const handleAddrSubmit = (addr: string) => {
		const encoded = encodeURIComponent(addr);
		window.location.href = `?addr=${encoded}`;
	};

	return (
		<div class="min-h-screen bg-gray-50">
			<Show when={!state.relay || !state.id}>
				<AddrInputView onSubmit={handleAddrSubmit} />
			</Show>

			<Show when={state.relay && state.id}>
				<div class="max-w-6xl mx-auto p-4 md:p-6">
					<div class="mb-4">
						<button
							type="button"
							onClick={() => {
								window.location.href = "/";
							}}
							class="text-blue-600 hover:text-blue-800 transition-colors"
						>
							← Connect to Different PDS
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
		</div>
	);
};

export default App;
