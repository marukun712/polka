import { fileURLToPath } from "node:url";
import { BloomFilter } from "bloomfilter";
import { app, BrowserWindow, ipcMain } from "electron";
import Store from "electron-store";
import { base58btc } from "multiformats/bases/base58";
import { finalizeEvent, type NostrEvent, SimplePool } from "nostr-tools";
import { bytesToHex, hexToBytes } from "nostr-tools/utils";
import lib from "zenn-markdown-html";
import { polkaRepo } from "../lib/repo.ts";
import { decryptVault, findKeyByKid, parseDidWithKid } from "../lib/vault.ts";

// @ts-expect-error
const markdownToHtml = lib.default ? lib.default : lib;

let polka: polkaRepo | null;
let pass: string | null = null;

const createWindow = () => {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: fileURLToPath(new URL("preload.cjs", import.meta.url)),
		},
	});

	win.loadFile("index.html");
};

const pool = new SimplePool();

app.whenReady().then(() => {
	const store = new Store();

	createWindow();

	ipcMain.handle("parseMd", async (_, text: string) => {
		const content = markdownToHtml(text);
		return content;
	});

	ipcMain.handle("setDidWithKid", (_, didWithKid: string) => {
		store.set("didWithKid", didWithKid.trim());
		return true;
	});

	ipcMain.handle("getDidWithKid", () => {
		const didWithKid = store.get("didWithKid");
		if (!didWithKid || typeof didWithKid !== "string") return null;
		return didWithKid;
	});

	ipcMain.handle("ad", async (_, tags: string[]) => {
		if (!polka) throw new Error("Polka is not initialized.");
		if (!pass) throw new Error("Polka is not found.");

		const didWithKid = store.get("didWithKid");
		if (!didWithKid || typeof didWithKid !== "string") {
			throw new Error("DID not found");
		}

		const { kid } = parseDidWithKid(didWithKid);
		const vaultKeys = await decryptVault(pass);
		const key = findKeyByKid(vaultKeys, kid);

		if (!key) {
			throw new Error(`Key with kid "${kid}" not found in vault`);
		}

		const skBytes = base58btc.decode(key.sk);
		const sk = bytesToHex(skBytes);

		const bloom = new BloomFilter(
			32 * 256, // number of bits to allocate.
			16, // number of hash functions.
		);
		tags.forEach((tag) => {
			bloom.add(tag);
		});
		const bytes = new Uint8Array(
			bloom.buckets.buffer,
			bloom.buckets.byteOffset,
			bloom.buckets.byteLength,
		);
		const signedEvent: NostrEvent = finalizeEvent(
			{
				kind: 25565,
				created_at: Math.floor(Date.now() / 1000),
				tags: [],
				content: JSON.stringify({
					bloom: base58btc.encode(bytes),
					did: polka.getDid(),
				}),
			},
			hexToBytes(sk),
		);
		console.log(signedEvent);
		pool.publish(["wss://yabu.me/"], signedEvent);
		return true;
	});

	ipcMain.handle("init", async (_, password: string) => {
		const didWithKid = store.get("didWithKid");
		if (!didWithKid || typeof didWithKid !== "string") {
			throw new Error("DID not found");
		}

		const { did, kid } = parseDidWithKid(didWithKid);
		const vaultKeys = await decryptVault(password);
		const key = findKeyByKid(vaultKeys, kid);

		if (!key) {
			throw new Error(`Key with kid "${kid}" not found in vault`);
		}

		const skBytes = base58btc.decode(key.sk);
		const sk = bytesToHex(skBytes);

		pass = password;
		polka = await polkaRepo.start(did, sk);
		return true;
	});

	ipcMain.handle(
		"create",
		async (_, rpath: string, data: Record<string, unknown>) => {
			if (!polka) throw new Error("Polka not initialized");
			await polka.create(rpath, data);
			return true;
		},
	);

	ipcMain.handle(
		"update",
		async (_, rpath: string, data: Record<string, unknown>) => {
			if (!polka) throw new Error("Polka not initialized");
			await polka.update(rpath, data);
			return true;
		},
	);

	ipcMain.handle("delete", async (_, rpath: string) => {
		if (!polka) throw new Error("Polka not initialized");
		await polka.delete(rpath);
		return true;
	});

	ipcMain.handle("commit", async () => {
		if (!polka) throw new Error("Polka not initialized");
		await polka.commit();
		return true;
	});

	ipcMain.handle("getDid", () => {
		if (!polka) throw new Error("Polka not initialized");
		return polka.getDid();
	});

	ipcMain.handle("getCommit", () => {
		if (!polka) throw new Error("Polka not initialized");
		return polka.getCommit();
	});

	ipcMain.handle("getRecord", async (_, rpath: string) => {
		if (!polka) throw new Error("Polka not initialized");
		return await polka.db.find(rpath);
	});

	ipcMain.handle(
		"getRecords",
		async (_, nsid: string, query?: Record<string, unknown>) => {
			if (!polka) throw new Error("Polka not initialized");
			return await polka.db.findMany(nsid, { query });
		},
	);

	ipcMain.handle(
		"getKeys",
		async (_, nsid: string, query?: Record<string, unknown>) => {
			if (!polka) throw new Error("Polka not initialized");
			return await polka.db.findKeys(nsid, { query });
		},
	);

	ipcMain.handle("allRecords", async () => {
		if (!polka) throw new Error("Polka not initialized");
		return await polka.db.all();
	});

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
