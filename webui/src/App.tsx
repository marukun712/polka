import type { Component } from "solid-js";
import { createStore } from "solid-js/store";
import { Client } from "../lib/client";
import { generate, signBytes } from "../lib/crypto";

const App: Component = () => {
	const [config, setConfig] = createStore({
		sk: "",
		addr: "",
		did: "",
		result: "",
		client: null as Client | null,
	});

	const [ops, setOps] = createStore({
		init: { bytes: "" },
		get: { rpath: "" },
		create: { nsid: "", body: "", bytes: "" },
		update: { rpath: "", body: "", bytes: "" },
		delete: { rpath: "", bytes: "" },
	});

	const validate = {
		client: () => (config.client ? null : "Client not initialized"),
		sk: () => (config.sk ? null : "Secret key not set"),
		did: () => (config.did ? null : "DID not set. Generate a key pair first."),
		bytes: (b: string) => (b ? null : "No bytes to sign. Stage first."),
		rpath: (r: string) => (r ? null : "Record path not specified"),
	};

	const checkErrors = (...validators: (() => string | null)[]) => {
		for (const validator of validators) {
			const error = validator();
			if (error) {
				setConfig("result", error);
				return true;
			}
		}
		return false;
	};

	const handleStage = async (
		operation: keyof typeof ops,
		apiFn: () => Promise<unknown>,
	) => {
		if (checkErrors(validate.client)) return;
		try {
			const res = await apiFn();
			if (res && typeof res === "object" && "bytes" in res) {
				const bytesValue = String(res.bytes);
				if (operation === "init") setOps("init", { bytes: bytesValue });
				else if (operation === "create")
					setOps("create", { ...ops.create, bytes: bytesValue });
				else if (operation === "update")
					setOps("update", { ...ops.update, bytes: bytesValue });
				else if (operation === "delete")
					setOps("delete", { ...ops.delete, bytes: bytesValue });
				setConfig("result", `Bytes to sign:\n${bytesValue}`);
			} else {
				setConfig("result", JSON.stringify(res, null, 2));
			}
		} catch (e) {
			setConfig("result", `Error: ${e}`);
		}
	};

	const handleCommit = async (
		operation: keyof typeof ops,
		bytes: string,
		apiFn: (sig: string) => Promise<unknown>,
	) => {
		if (
			checkErrors(validate.client, validate.sk, validate.did, () =>
				validate.bytes(bytes),
			)
		)
			return;
		try {
			const sig = await signBytes(config.sk, bytes);
			const res = await apiFn(sig);
			setConfig("result", JSON.stringify(res, null, 2));
			if (operation === "init") setOps("init", { bytes: "" });
			else if (operation === "create")
				setOps("create", { ...ops.create, bytes: "" });
			else if (operation === "update")
				setOps("update", { ...ops.update, bytes: "" });
			else if (operation === "delete")
				setOps("delete", { ...ops.delete, bytes: "" });
		} catch (e) {
			setConfig("result", `Error: ${e}`);
		}
	};

	const initClient = async () => {
		try {
			const c = await Client.create(config.addr);
			setConfig("client", c);
			setConfig("result", "Client initialized");
		} catch (e) {
			setConfig("result", `Error initializing client: ${e}`);
		}
	};

	const handleGenerateKey = async () => {
		try {
			const { did: generatedDid, sk: generatedSk } = await generate();
			setConfig("did", generatedDid);
			setConfig("sk", generatedSk);
			setConfig(
				"result",
				`Key pair generated successfully!\nDID: ${generatedDid}\nSecret Key: ${generatedSk}`,
			);
		} catch (e) {
			setConfig("result", `Error generating key pair: ${e}`);
		}
	};

	const handleInitRepoStage = () =>
		handleStage("init", () => {
			if (!config.client) throw new Error("Client not initialized");
			return config.client.initRepoStage();
		});

	const handleInitRepoCommit = () =>
		handleCommit("init", ops.init.bytes, (sig) => {
			if (!config.client) throw new Error("Client not initialized");
			return config.client.initRepoCommit(sig);
		});

	const handleGetRecord = async () => {
		if (checkErrors(validate.client, () => validate.rpath(ops.get.rpath)))
			return;
		try {
			if (!config.client) throw new Error("Client not initialized");
			const res = await config.client.getRecord(ops.get.rpath);
			setConfig("result", JSON.stringify(res, null, 2));
		} catch (e) {
			setConfig("result", `Error: ${e}`);
		}
	};

	const handleCreateRecordStage = () =>
		handleStage("create", () => {
			if (!config.client) throw new Error("Client not initialized");
			return config.client.createRecordStage(
				config.did,
				ops.create.nsid,
				ops.create.body,
			);
		});

	const handleCreateRecordCommit = () =>
		handleCommit("create", ops.create.bytes, (sig) => {
			if (!config.client) throw new Error("Client not initialized");
			return config.client.createRecordCommit(
				config.did,
				ops.create.nsid,
				ops.create.body,
				sig,
			);
		});

	const handleUpdateRecordStage = () =>
		handleStage("update", () => {
			if (!config.client) throw new Error("Client not initialized");
			return config.client.updateRecordStage(ops.update.rpath, ops.update.body);
		});

	const handleUpdateRecordCommit = () =>
		handleCommit("update", ops.update.bytes, (sig) => {
			if (!config.client) throw new Error("Client not initialized");
			return config.client.updateRecordCommit(
				config.did,
				ops.update.rpath,
				ops.update.body,
				sig,
			);
		});

	const handleDeleteRecordStage = () =>
		handleStage("delete", () => {
			if (!config.client) throw new Error("Client not initialized");
			return config.client.deleteRecordStage(ops.delete.rpath);
		});

	const handleDeleteRecordCommit = () =>
		handleCommit("delete", ops.delete.bytes, (sig) => {
			if (!config.client) throw new Error("Client not initialized");
			return config.client.deleteRecordCommit(
				config.did,
				ops.delete.rpath,
				sig,
			);
		});

	const InputField = (props: {
		label: string;
		value: string;
		onInput: (v: string) => void;
		placeholder: string;
		type?: "input" | "textarea";
		readonly?: boolean;
	}) => (
		<div class="mb-2">
			<h1 class="block mb-1">{props.label}:</h1>
			{props.type === "textarea" ? (
				<textarea
					value={props.value}
					onInput={(e) => props.onInput(e.currentTarget.value)}
					class="w-full p-2 border"
					rows={4}
					placeholder={props.placeholder}
				/>
			) : (
				<input
					type="text"
					value={props.value}
					onInput={(e) => props.onInput(e.currentTarget.value)}
					class={`w-full p-2 border ${props.readonly ? "bg-gray-50 cursor-not-allowed" : ""}`}
					placeholder={props.placeholder}
					readonly={props.readonly}
				/>
			)}
		</div>
	);

	const StageCommitButtons = (props: {
		onStage: () => void;
		onCommit: () => void;
		hasBytes: boolean;
		stageLabel: string;
		commitLabel: string;
		stageColorLight: string;
		stageColorDark: string;
	}) => (
		<div class="flex gap-2">
			<button
				type="button"
				onClick={props.onStage}
				class={`px-4 py-2 ${props.stageColorLight} text-white`}
			>
				{props.stageLabel}
			</button>
			<button
				type="button"
				onClick={props.onCommit}
				class={`px-4 py-2 ${props.stageColorDark} text-white`}
				disabled={!props.hasBytes}
			>
				{props.commitLabel}
			</button>
		</div>
	);

	return (
		<div class="p-4">
			<h1 class="text-2xl mb-4">PDS Client</h1>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Key Generation</h2>
				<p class="text-sm text-gray-600 mb-3">Generate a new key pair</p>
				<button
					type="button"
					onClick={handleGenerateKey}
					class="px-4 py-2 bg-teal-500 text-white hover:bg-teal-600"
				>
					Generate New Key Pair
				</button>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Configuration</h2>
				<InputField
					label="Secret Key"
					value={config.sk}
					onInput={(v) => setConfig("sk", v)}
					placeholder="Enter your secret key (hex)"
				/>
				<InputField
					label="DID (Decentralized Identifier)"
					value={config.did}
					onInput={() => {}}
					placeholder="Generate a key pair or it will be shown after operations"
					readonly={true}
				/>
				<InputField
					label="PDS Server Address"
					value={config.addr}
					onInput={(v) => setConfig("addr", v)}
					placeholder="/ip4/127.0.0.1/tcp/8080"
				/>
				<button
					type="button"
					onClick={initClient}
					class="px-4 py-2 bg-gray-500 text-white mt-2"
				>
					Initialize Client
				</button>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Initialize Repository</h2>
				<StageCommitButtons
					onStage={handleInitRepoStage}
					onCommit={handleInitRepoCommit}
					hasBytes={!!ops.init.bytes}
					stageLabel="Stage Init"
					commitLabel="Sign & Commit Init"
					stageColorLight="bg-purple-500"
					stageColorDark="bg-purple-700"
				/>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Get Record</h2>
				<InputField
					label="Record Path (rpath)"
					value={ops.get.rpath}
					onInput={(v) => setOps("get", "rpath", v)}
					placeholder="app.example.post/abc123"
				/>
				<button
					type="button"
					onClick={handleGetRecord}
					class="px-4 py-2 bg-green-500 text-white"
				>
					Get
				</button>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Create Record</h2>
				<InputField
					label="NSID"
					value={ops.create.nsid}
					onInput={(v) => setOps("create", "nsid", v)}
					placeholder="app.example.post"
				/>
				<InputField
					label="Body (JSON)"
					value={ops.create.body}
					onInput={(v) => setOps("create", "body", v)}
					placeholder='{"text": "Hello world"}'
					type="textarea"
				/>
				<StageCommitButtons
					onStage={handleCreateRecordStage}
					onCommit={handleCreateRecordCommit}
					hasBytes={!!ops.create.bytes}
					stageLabel="Stage Create"
					commitLabel="Sign & Commit"
					stageColorLight="bg-blue-500"
					stageColorDark="bg-blue-700"
				/>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Update Record</h2>
				<InputField
					label="Record Path (rpath)"
					value={ops.update.rpath}
					onInput={(v) => setOps("update", "rpath", v)}
					placeholder="app.example.post/abc123"
				/>
				<InputField
					label="New Body (JSON)"
					value={ops.update.body}
					onInput={(v) => setOps("update", "body", v)}
					placeholder='{"text": "Updated content"}'
					type="textarea"
				/>
				<StageCommitButtons
					onStage={handleUpdateRecordStage}
					onCommit={handleUpdateRecordCommit}
					hasBytes={!!ops.update.bytes}
					stageLabel="Stage Update"
					commitLabel="Sign & Commit"
					stageColorLight="bg-yellow-500"
					stageColorDark="bg-yellow-700"
				/>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Delete Record</h2>
				<InputField
					label="Record Path (rpath)"
					value={ops.delete.rpath}
					onInput={(v) => setOps("delete", "rpath", v)}
					placeholder="app.example.post/abc123"
				/>
				<StageCommitButtons
					onStage={handleDeleteRecordStage}
					onCommit={handleDeleteRecordCommit}
					hasBytes={!!ops.delete.bytes}
					stageLabel="Stage Delete"
					commitLabel="Sign & Commit"
					stageColorLight="bg-red-500"
					stageColorDark="bg-red-700"
				/>
			</div>

			<div class="p-4 border">
				<h2 class="text-xl mb-2">Result</h2>
				<pre class="bg-gray-100 p-2 overflow-auto">{config.result}</pre>
			</div>
		</div>
	);
};

export default App;
