import { type Component, createSignal } from "solid-js";
import { Client } from "../lib/client";
import { signBytes } from "../lib/crypto";

const App: Component = () => {
	const [sk, setSk] = createSignal("");
	const [addr, setAddr] = createSignal("");
	const [result, setResult] = createSignal("");

	const [createNsid, setCreateNsid] = createSignal("");
	const [createBody, setCreateBody] = createSignal("");
	const [createBytes, setCreateBytes] = createSignal("");

	const [getRpath, setGetRpath] = createSignal("");

	const [updateRpath, setUpdateRpath] = createSignal("");
	const [updateBody, setUpdateBody] = createSignal("");
	const [updateBytes, setUpdateBytes] = createSignal("");

	const [deleteRpath, setDeleteRpath] = createSignal("");
	const [deleteBytes, setDeleteBytes] = createSignal("");

	const [initBytes, setInitBytes] = createSignal("");

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

	const handleInitRepoStage = async () => {
		if (!client()) return setResult("Client not initialized");
		try {
			const res = await client()?.initRepoStage();
			if (res?.bytes) {
				setInitBytes(res.bytes);
				setResult(`Bytes to sign:\n${res.bytes}`);
			} else {
				setResult(JSON.stringify(res, null, 2));
			}
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	const handleInitRepoCommit = async () => {
		if (!client()) return setResult("Client not initialized");
		if (!sk()) return setResult("Secret key not set");
		if (!initBytes()) return setResult("No bytes to sign. Stage first.");
		try {
			const sig = signBytes(sk(), initBytes());
			const res = await client()?.initRepoCommit(sig);
			setResult(JSON.stringify(res, null, 2));
			setInitBytes("");
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	const handleGetRecord = async () => {
		if (!client()) return setResult("Client not initialized");
		try {
			const res = await client()?.getRecord(getRpath());
			setResult(JSON.stringify(res, null, 2));
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	const handleCreateRecordStage = async () => {
		if (!client()) return setResult("Client not initialized");
		try {
			const res = await client()?.createRecordStage(createNsid(), createBody());
			if (res?.bytes) {
				setCreateBytes(res.bytes);
				setResult(`Bytes to sign:\n${res.bytes}`);
			} else {
				setResult(JSON.stringify(res, null, 2));
			}
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	const handleCreateRecordCommit = async () => {
		if (!client()) return setResult("Client not initialized");
		if (!sk()) return setResult("Secret key not set");
		if (!createBytes()) return setResult("No bytes to sign. Stage first.");
		try {
			const sig = signBytes(sk(), createBytes());
			const res = await client()?.createRecordCommit(
				createNsid(),
				createBody(),
				sig,
			);
			setResult(JSON.stringify(res, null, 2));
			setCreateBytes("");
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	const handleUpdateRecordStage = async () => {
		if (!client()) return setResult("Client not initialized");
		try {
			const res = await client()?.updateRecordStage(
				updateRpath(),
				updateBody(),
			);
			if (res?.bytes) {
				setUpdateBytes(res.bytes);
				setResult(`Bytes to sign:\n${res.bytes}`);
			} else {
				setResult(JSON.stringify(res, null, 2));
			}
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	const handleUpdateRecordCommit = async () => {
		if (!client()) return setResult("Client not initialized");
		if (!sk()) return setResult("Secret key not set");
		if (!updateBytes()) return setResult("No bytes to sign. Stage first.");
		try {
			const sig = signBytes(sk(), updateBytes());
			const res = await client()?.updateRecordCommit(
				updateRpath(),
				updateBody(),
				sig,
			);
			setResult(JSON.stringify(res, null, 2));
			setUpdateBytes("");
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	const handleDeleteRecordStage = async () => {
		if (!client()) return setResult("Client not initialized");
		try {
			const res = await client()?.deleteRecordStage(deleteRpath());
			if (res?.bytes) {
				setDeleteBytes(res.bytes);
				setResult(`Bytes to sign:\n${res.bytes}`);
			} else {
				setResult(JSON.stringify(res, null, 2));
			}
		} catch (e) {
			setResult(`Error: ${e}`);
		}
	};

	const handleDeleteRecordCommit = async () => {
		if (!client()) return setResult("Client not initialized");
		if (!sk()) return setResult("Secret key not set");
		if (!deleteBytes()) return setResult("No bytes to sign. Stage first.");
		try {
			const sig = signBytes(sk(), deleteBytes());
			const res = await client()?.deleteRecordCommit(deleteRpath(), sig);
			setResult(JSON.stringify(res, null, 2));
			setDeleteBytes("");
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
				<h2 class="text-xl mb-2">Initialize Repository</h2>
				<div class="flex gap-2">
					<button
						type="button"
						onClick={handleInitRepoStage}
						class="px-4 py-2 bg-purple-500 text-white"
					>
						Stage Init
					</button>
					<button
						type="button"
						onClick={handleInitRepoCommit}
						class="px-4 py-2 bg-purple-700 text-white"
						disabled={!initBytes()}
					>
						Sign & Commit Init
					</button>
				</div>
			</div>

			<div class="mb-4 p-4 border">
				<h2 class="text-xl mb-2">Get Record</h2>
				<div class="mb-2">
					<h1 class="block mb-1">Record Path (rpath):</h1>
					<input
						type="text"
						value={getRpath()}
						onInput={(e) => setGetRpath(e.currentTarget.value)}
						class="w-full p-2 border"
						placeholder="app.example.post/abc123"
					/>
				</div>
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
				<div class="flex gap-2">
					<button
						type="button"
						onClick={handleCreateRecordStage}
						class="px-4 py-2 bg-blue-500 text-white"
					>
						Stage Create
					</button>
					<button
						type="button"
						onClick={handleCreateRecordCommit}
						class="px-4 py-2 bg-blue-700 text-white"
						disabled={!createBytes()}
					>
						Sign & Commit
					</button>
				</div>
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
				<div class="flex gap-2">
					<button
						type="button"
						onClick={handleUpdateRecordStage}
						class="px-4 py-2 bg-yellow-500 text-white"
					>
						Stage Update
					</button>
					<button
						type="button"
						onClick={handleUpdateRecordCommit}
						class="px-4 py-2 bg-yellow-700 text-white"
						disabled={!updateBytes()}
					>
						Sign & Commit
					</button>
				</div>
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
				<div class="flex gap-2">
					<button
						type="button"
						onClick={handleDeleteRecordStage}
						class="px-4 py-2 bg-red-500 text-white"
					>
						Stage Delete
					</button>
					<button
						type="button"
						onClick={handleDeleteRecordCommit}
						class="px-4 py-2 bg-red-700 text-white"
						disabled={!deleteBytes()}
					>
						Sign & Commit
					</button>
				</div>
			</div>

			<div class="p-4 border">
				<h2 class="text-xl mb-2">Result</h2>
				<pre class="bg-gray-100 p-2 overflow-auto">{result()}</pre>
			</div>
		</div>
	);
};

export default App;
