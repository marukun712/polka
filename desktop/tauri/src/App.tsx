import { createSignal, Show } from "solid-js";
import "./App.css";
import type { DIDDocument } from "did-resolver";
import type { GetResult } from "../dist/transpiled/interfaces/polka-repository-repo";
import { generate } from "../lib/crypto";
import { generateDidDocument, resolve } from "../lib/identity";
import { Client } from "../lib/index";
import { DidInputView } from "./components/DidInputView";
import { DidSetupView } from "./components/DidSetupView";
import { ErrorView } from "./components/ErrorView";
import { LoadingView } from "./components/LoadingView";
import { RecordsTreeView, type TreeNode } from "./components/RecordsTreeView";

function App() {
	const [step, setStep] = createSignal<"input" | "setup" | "editor">("input");
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal<string>("");

	const [didWeb, setDidWeb] = createSignal("");
	const [privateKey, setPrivateKey] = createSignal("");
	const [didDocument, setDidDocument] = createSignal<DIDDocument | null>(null);
	const [generatedPrivateKey, setGeneratedPrivateKey] = createSignal("");

	const [client, setClient] = createSignal<Client | null>(null);
	const [treeRoot, setTreeRoot] = createSignal<TreeNode | null>(null);

	const handleExistingAccount = async (did: string, sk: string) => {
		setLoading(true);
		setError("");
		setDidWeb(did);
		setPrivateKey(sk);

		try {
			const resolved = await resolve(did);
			await initializeClient(sk, resolved.didKey);
		} catch {
			setError("Failed to resolve DID or initialize client");
			setLoading(false);
		}
	};

	const handleNewAccount = async (domain: string) => {
		setLoading(true);
		setError("");

		try {
			const keyPair = await generate();
			const doc = await generateDidDocument(domain);
			setDidWeb(doc.id);

			setGeneratedPrivateKey(keyPair.sk);
			setPrivateKey(keyPair.sk);
			setDidDocument(doc);

			setStep("setup");
		} catch {
			setError("Failed to generate DID document");
		} finally {
			setLoading(false);
		}
	};

	const initializeClient = async (sk: string, did: string) => {
		try {
			const c = await Client.init(sk, did);
			setClient(c);
			const allRecords = c.repo.allRecords();

			const tree = buildTree(allRecords);
			setTreeRoot(tree);

			setStep("editor");
		} catch (err) {
			throw new Error(`Failed to initialize client: ${err}`);
		} finally {
			setLoading(false);
		}
	};

	const handleContinueFromSetup = async () => {
		setLoading(true);
		setError("");
		try {
			await initializeClient(privateKey(), didWeb());
		} catch {
			setError("Failed to initialize client");
			setLoading(false);
		}
	};

	const buildTree = (records: GetResult[]): TreeNode => {
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

			let parsedData: Record<string, unknown> = {};

			try {
				parsedData = JSON.parse(record.data);
			} catch {
				parsedData = {};
			}

			currentNode.records.push({
				rpath: record.rpath,
				data: parsedData,
			});
		}
		return root;
	};

	const handleRetry = () => {
		setError("");
		setStep("input");
	};

	const _handleSaveRecord = (
		rpath: string,
		jsonData: string,
		isExisting: boolean,
	) => {
		try {
			JSON.parse(jsonData);
			const c = client();
			if (!c) throw new Error("Client not initialized");
			if (isExisting) {
				c.repo.update(rpath, jsonData);
			} else {
				c.repo.create(rpath, jsonData);
			}
			refreshRecords();
		} catch (_err) {
			setError("Failed to save record");
		}
	};

	const _handleDeleteRecord = (rpath: string) => {
		try {
			const c = client();
			if (!c) throw new Error("Client not initialized");
			c.repo.delete(rpath);
			refreshRecords();
		} catch {
			setError("Failed to delete record");
		}
	};

	const refreshRecords = () => {
		try {
			const c = client();
			if (!c) throw new Error("Client not initialized");
			const allRecords = c.repo.allRecords();
			const tree = buildTree(allRecords);
			setTreeRoot(tree);
		} catch {
			setError("Failed to refresh records");
		}
	};

	return (
		<main class="container min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<Show when={error()}>
				<ErrorView error={error()} onRetry={handleRetry} />
			</Show>
			<Show when={!error()}>
				{loading() ? (
					<LoadingView message="Initializing..." />
				) : (
					<>
						{step() === "input" && (
							<DidInputView
								onExistingAccount={handleExistingAccount}
								onNewAccount={handleNewAccount}
							/>
						)}
						{step() === "setup" && didDocument() && (
							<Show when={didDocument()}>
								{(d) => (
									<DidSetupView
										didWeb={didWeb()}
										didDocument={d()}
										privateKey={generatedPrivateKey()}
										onBack={() => setStep("input")}
										onContinue={handleContinueFromSetup}
									/>
								)}
							</Show>
						)}
						{step() === "editor" && (
							<div class="max-w-6xl mx-auto">
								<RecordsTreeView root={treeRoot()} />
							</div>
						)}
					</>
				)}
			</Show>
		</main>
	);
}

export default App;
