import { type Component, createSignal } from "solid-js";
import { Client } from "../lib/client";

const App: Component = () => {
	const [sk, setSk] = createSignal("");
	const [addr, setAddr] = createSignal("");
	const [result, setResult] = createSignal("");

	const [createNsid, setCreateNsid] = createSignal("");
	const [createBody, setCreateBody] = createSignal("");

	const [getNsid, setGetNsid] = createSignal("");

	const [updateRpath, setUpdateRpath] = createSignal("");
	const [updateBody, setUpdateBody] = createSignal("");

	const [deleteRpath, setDeleteRpath] = createSignal("");
	const [deleteRkey, setDeleteRkey] = createSignal("");

	const [client, setClient] = createSignal<Client | null>(null);

	const initClient = async () => {
		try {
			const c = await Client.create(addr());
			setClient(c);
			setResult("Client initialized");
		} catch (e) {
			setResult(`Error initializing client: ${e}`);
		}
	};

	const handleCreateRecord = async () => {
		if (!client()) return setResult("Client not initialized");
		try {
			const _bodyObj = JSON.parse(createBody());
			const res = await client()?.createRecord(createNsid(), createBody());
			setResult(JSON.stringify(res, null, 2));
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	const handleGetRecords = async () => {
		if (!client()) return setResult("Client not initialized");
		try {
			const res = await client()?.getRecords(getNsid());
			setResult(JSON.stringify(res, null, 2));
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	const handleUpdateRecord = async () => {
		if (!client()) return setResult("Client not initialized");
		try {
			const _bodyObj = JSON.parse(updateBody());
			const res = await client()?.updateRecord(updateRpath(), updateBody());
			setResult(JSON.stringify(res, null, 2));
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	const handleDeleteRecord = async () => {
		if (!client()) return setResult("Client not initialized");
		try {
			const res = await client()?.deleteRecord(deleteRpath(), deleteRkey());
			setResult(JSON.stringify(res, null, 2));
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	return (
		<div class="p-4">
			<h1 class="text-2xl mb-4">PDS Client</h1>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Configuration</h2>
				<div class="mb-2">
					<h1 class="block mb-1">Secret Key:</h1>
					<input
						type="text"
						value={sk()}
						onInput={(e) => setSk(e.currentTarget.value)}
						class="w-full p-2 border"
						placeholder="Enter your secret key (hex)"
					/>
				</div>
				<div class="mb-2">
					<h1 class="block mb-1">PDS Server Address:</h1>
					<input
						type="text"
						value={addr()}
						onInput={(e) => setAddr(e.currentTarget.value)}
						class="w-full p-2 border"
						placeholder="/ip4/127.0.0.1/tcp/8080"
					/>
				</div>
				<button
					type="button"
					onClick={initClient}
					class="px-4 py-2 bg-gray-500 text-white mt-2"
				>
					Initialize Client
				</button>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Create Record</h2>
				<div class="mb-2">
					<h1 class="block mb-1">NSID:</h1>
					<input
						type="text"
						value={createNsid()}
						onInput={(e) => setCreateNsid(e.currentTarget.value)}
						class="w-full p-2 border"
						placeholder="app.example.post"
					/>
				</div>
				<div class="mb-2">
					<h1 class="block mb-1">Body (JSON):</h1>
					<textarea
						value={createBody()}
						onInput={(e) => setCreateBody(e.currentTarget.value)}
						class="w-full p-2 border"
						rows={4}
						placeholder='{"text": "Hello world"}'
					/>
				</div>
				<button
					type="button"
					onClick={handleCreateRecord}
					class="px-4 py-2 bg-blue-500 text-white"
				>
					Create
				</button>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Get Records</h2>
				<div class="mb-2">
					<h1 class="block mb-1">NSID:</h1>
					<input
						type="text"
						value={getNsid()}
						onInput={(e) => setGetNsid(e.currentTarget.value)}
						class="w-full p-2 border"
						placeholder="app.example.post"
					/>
				</div>
				<button
					type="button"
					onClick={handleGetRecords}
					class="px-4 py-2 bg-green-500 text-white"
				>
					Get
				</button>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Update Record</h2>
				<div class="mb-2">
					<h1 class="block mb-1">Record Path (rpath):</h1>
					<input
						type="text"
						value={updateRpath()}
						onInput={(e) => setUpdateRpath(e.currentTarget.value)}
						class="w-full p-2 border"
						placeholder="app.example.post/abc123"
					/>
				</div>
				<div class="mb-2">
					<h1 class="block mb-1">New Body (JSON):</h1>
					<textarea
						value={updateBody()}
						onInput={(e) => setUpdateBody(e.currentTarget.value)}
						class="w-full p-2 border"
						rows={4}
						placeholder='{"text": "Updated content"}'
					/>
				</div>
				<button
					type="button"
					onClick={handleUpdateRecord}
					class="px-4 py-2 bg-yellow-500 text-white"
				>
					Update
				</button>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Delete Record</h2>
				<div class="mb-2">
					<h1 class="block mb-1">Record Path (rpath):</h1>
					<input
						type="text"
						value={deleteRpath()}
						onInput={(e) => setDeleteRpath(e.currentTarget.value)}
						class="w-full p-2 border"
						placeholder="app.example.post/abc123"
					/>
				</div>
				<div class="mb-2">
					<h1 class="block mb-1">Record Key (rkey):</h1>
					<input
						type="text"
						value={deleteRkey()}
						onInput={(e) => setDeleteRkey(e.currentTarget.value)}
						class="w-full p-2 border"
						placeholder="abc123"
					/>
				</div>
				<button
					type="button"
					onClick={handleDeleteRecord}
					class="px-4 py-2 bg-red-500 text-white"
				>
					Delete
				</button>
			</div>

			<div class="p-4 border">
				<h2 class="text-xl mb-2">Result</h2>
				<pre class="bg-gray-100 p-2 overflow-auto">{result()}</pre>
			</div>
		</div>
	);
};

export default App;
