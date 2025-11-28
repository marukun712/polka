import type { Component } from "solid-js";
import { createStore } from "solid-js/store";
import { Client } from "../lib/client";
import { generate } from "../lib/crypto";

const App: Component = () => {
	const [config, setConfig] = createStore({
		sk: "",
		addr: "",
		result: "",
		client: null as Client | null,
	});

	const [ops, setOps] = createStore({
		get: { rpath: "" },
		getList: { nsid: "" },
		create: { nsid: "", body: "" },
		update: { rpath: "", body: "" },
		delete: { rpath: "" },
	});

	const validate = {
		client: () => (config.client ? null : "Client not initialized"),
		sk: () => (config.sk ? null : "Secret key not set"),
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
			setConfig("sk", generatedSk);
			setConfig(
				"result",
				`Key pair generated successfully!\nDID: ${generatedDid}\nSecret Key: ${generatedSk}`,
			);
		} catch (e) {
			setConfig("result", `Error generating key pair: ${e}`);
		}
	};

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

	const handleGetRecords = async () => {
		if (checkErrors(validate.client)) return;

		if (!ops.getList.nsid) {
			setConfig("result", "NSID not specified");
			return;
		}

		try {
			if (!config.client) throw new Error("Client not initialized");
			const res = await config.client.getRecords(ops.getList.nsid);
			setConfig("result", JSON.stringify(res, null, 2));
		} catch (e) {
			setConfig("result", `Error: ${e}`);
		}
	};

	const handleCreateRecord = async () => {
		if (checkErrors(validate.client)) return;
		if (!ops.create.nsid || !ops.create.body) {
			setConfig("result", "NSID and body are required");
			return;
		}
		try {
			if (!config.client) throw new Error("Client not initialized");
			const res = await config.client.createRecord(
				ops.create.nsid,
				ops.create.body,
			);
			setConfig("result", JSON.stringify(res, null, 2));
		} catch (e) {
			setConfig("result", `Error: ${e}`);
		}
	};

	const handleUpdateRecord = async () => {
		if (checkErrors(validate.client)) return;
		if (!ops.update.rpath || !ops.update.body) {
			setConfig("result", "Record path and body are required");
			return;
		}
		try {
			if (!config.client) throw new Error("Client not initialized");
			const res = await config.client.updateRecord(
				ops.update.rpath,
				ops.update.body,
			);
			setConfig("result", JSON.stringify(res, null, 2));
		} catch (e) {
			setConfig("result", `Error: ${e}`);
		}
	};

	const handleDeleteRecord = async () => {
		if (checkErrors(validate.client)) return;
		if (!ops.delete.rpath) {
			setConfig("result", "Record path is required");
			return;
		}
		try {
			if (!config.client) throw new Error("Client not initialized");
			const res = await config.client.deleteRecord(ops.delete.rpath);
			setConfig("result", JSON.stringify(res, null, 2));
		} catch (e) {
			setConfig("result", `Error: ${e}`);
		}
	};

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
				<h2 class="text-xl mb-2">Get Records by NSID</h2>
				<p class="text-sm text-gray-600 mb-3">
					Retrieve all records matching the specified NSID prefix
				</p>
				<InputField
					label="NSID"
					value={ops.getList.nsid}
					onInput={(v) => setOps("getList", "nsid", v)}
					placeholder="app.example.post"
				/>
				<button
					type="button"
					onClick={handleGetRecords}
					class="px-4 py-2 bg-green-500 text-white"
				>
					Get Records
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
				<button
					type="button"
					onClick={handleCreateRecord}
					class="px-4 py-2 bg-blue-500 text-white"
				>
					Create Record
				</button>
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
				<button
					type="button"
					onClick={handleUpdateRecord}
					class="px-4 py-2 bg-yellow-500 text-white"
				>
					Update Record
				</button>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Delete Record</h2>
				<InputField
					label="Record Path (rpath)"
					value={ops.delete.rpath}
					onInput={(v) => setOps("delete", "rpath", v)}
					placeholder="app.example.post/abc123"
				/>
				<button
					type="button"
					onClick={handleDeleteRecord}
					class="px-4 py-2 bg-red-500 text-white"
				>
					Delete Record
				</button>
			</div>

			<div class="p-4 border">
				<h2 class="text-xl mb-2">Result</h2>
				<pre class="bg-gray-100 p-2 overflow-auto">{config.result}</pre>
			</div>
		</div>
	);
};

export default App;
