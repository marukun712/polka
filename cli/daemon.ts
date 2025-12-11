import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { now } from "@atcute/tid";
import { WASIShim } from "@bytecodealliance/preview2-shim/instantiation";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hexToBytes } from "@noble/hashes/utils.js";
import { config } from "dotenv";
import { Hono } from "hono";
import keytar from "keytar";
import { CID } from "multiformats";
import z from "zod";
import type { Repo } from "./dist/transpiled/interfaces/polka-repository-repo.js";
import { instantiate } from "./dist/transpiled/repo.js";
import { CarSyncStore } from "./lib/blockstore.ts";
import {
	commitAndPush,
	existsRepository,
	generateCommitMessage,
	POLKA_CAR_PATH,
	POLKA_REPO_PATH,
	pullRepository,
} from "./lib/git.ts";
import { resolve } from "./lib/identity.ts";

config();

class polkaDaemon {
	repo: Repo;
	store: CarSyncStore;
	server: Hono;

	constructor(repo: Repo, store: CarSyncStore) {
		this.repo = repo;
		this.store = store;
		this.server = new Hono();

		this.server.post(
			"/record",
			zValidator(
				"json",
				z.object({
					nsid: z.string().min(1),
					data: z.string(),
				}),
			),
			async (c) => {
				const { nsid, data } = c.req.valid("json");
				const result = await this.create(nsid, data);
				return c.json({ ok: true, message: result }, 201);
			},
		);

		this.server.put(
			"/record",
			zValidator(
				"json",
				z.object({
					rpath: z.string().min(1),
					data: z.string(),
				}),
			),
			async (c) => {
				const { rpath, data } = c.req.valid("json");
				const result = await this.update(rpath, data);
				return c.json({ ok: true, message: result }, 200);
			},
		);

		this.server.delete(
			"/record",
			zValidator(
				"json",
				z.object({
					rpath: z.string().min(1),
				}),
			),
			async (c) => {
				const { rpath } = c.req.valid("json");
				const result = await this.delete(rpath);
				return c.json({ ok: true, message: result }, 200);
			},
		);

		this.server.get("/health", (c) => c.json({ ok: true }));

		const port = Number(process.env.PORT) || 3030;

		serve({ fetch: this.server.fetch, port: port });
		console.log(`polka daemon is listening on ${port}`);
	}

	async commit() {
		try {
			const commitMessage = generateCommitMessage();
			console.log("Committing and pushing...");
			await commitAndPush(commitMessage);
			return "Committed and pushed!";
		} catch {
			return "Failed to commit/push";
		}
	}

	async create(nsid: string, data: string) {
		const rpath = `${nsid}/${now()}`;
		console.log(rpath, data);
		this.repo.create(rpath, data);
		const root = this.repo.getRoot();
		this.store.updateHeaderRoots([CID.parse(root)]);

		return await this.commit();
	}

	async update(rpath: string, data: string) {
		console.log(rpath, data);
		this.repo.update(rpath, data);
		const root = this.repo.getRoot();
		this.store.updateHeaderRoots([CID.parse(root)]);

		return await this.commit();
	}

	async delete(rpath: string) {
		console.log(rpath);
		this.repo.delete(rpath);
		const root = this.repo.getRoot();
		this.store.updateHeaderRoots([CID.parse(root)]);

		return await this.commit();
	}

	static async start() {
		const domain = process.env.POLKA_DOMAIN;
		if (!domain) {
			throw new Error("Please initialize repository first.");
		}

		const doc = await resolve(domain);
		if (!doc.didKey && doc.target) {
			throw new Error("Please initialize repository first.");
		}
		const sk = await keytar.getPassword("polka", "user");
		if (!sk) {
			throw new Error("Please initialize private key first.");
		}
		// メインのリモートを取得
		const remoteUrl = process.env.POLKA_MAIN_REMOTE;
		if (!remoteUrl) {
			throw new Error("Please initialize Git remote first.");
		}
		// リポジトリをクローンかpull
		if (!existsRepository(POLKA_REPO_PATH)) {
			throw new Error("Please initialize Git remote first.");
		} else {
			console.log("Pulling latest changes...");
			await pullRepository();
			console.log("Repository updated!");
		}
		console.log("Repo initialized successfully!");

		const { repo, store } = await init(sk, doc.didKey);
		return new polkaDaemon(repo, store);
	}
}

// repoをinitする
export async function init(sk: string, didKey: string) {
	// ~/.polkaがあるか確認
	if (!existsSync(join(homedir(), ".polka"))) {
		mkdirSync(join(homedir(), ".polka"));
	}

	const path = POLKA_CAR_PATH;
	const store = new CarSyncStore(path);

	// WASMのロード
	const loader = async (path: string) => {
		const buf = readFileSync(`./dist/transpiled/${path}`);
		return await WebAssembly.compile(new Uint8Array(buf));
	};

	// importする関数をバインド
	const wasm = await instantiate(loader, {
		//@ts-expect-error
		"polka:repository/crypto": {
			sign: (bytes: Uint8Array) => {
				const skBytes = hexToBytes(sk);
				const sig = secp256k1.sign(bytes, skBytes);
				return sig;
			},
		},
		"polka:repository/blockstore": {
			readBlock: (cid: Uint8Array) => {
				const parsed = CID.decode(cid);
				const out: Uint8Array[] = [];
				store.readBlock(parsed, out);
				if (!out[0]) throw new Error("Block not found.");
				return out[0];
			},
			writeBlock: (codec: bigint, hash: bigint, contents: Uint8Array) => {
				return store.writeBlock(Number(codec), Number(hash), contents);
			},
		},
		...new WASIShim().getImportObject<"0.2.6">(),
	});

	// repoを開く
	if (existsSync(path)) {
		store.updateIndex();
		const roots = store.getRoots();
		if (!roots[0]) throw new Error("Root not found.");
		return { repo: wasm.repo.open(didKey, roots[0].toString()), store };
	} else {
		store.create();
		const repo = wasm.repo.create(didKey);
		const root = repo.getRoot();
		store.updateHeaderRoots([CID.parse(root)]);
		return { repo, store };
	}
}

await polkaDaemon.start();
