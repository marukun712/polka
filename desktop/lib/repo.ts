import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hexToBytes } from "@noble/hashes/utils.js";
import type { Repo } from "@polka/db/dist/transpiled/interfaces/polka-repository-repo.js";
import { create, open } from "@polka/db/lib";
import { type BlockStore, CarSyncStore } from "@polka/db/store";
import { config } from "dotenv";
import keytar from "keytar";
import { CID } from "multiformats";
import {
	commitAndPush,
	existsRepository,
	POLKA_CAR_PATH,
	pullRepository,
} from "./git.ts";
import { resolve } from "./identity.ts";

config();

export class polkaRepo {
	domain: string;
	repo: Repo;
	store: BlockStore;

	constructor(domain: string, repo: Repo, store: BlockStore) {
		this.domain = domain;
		this.repo = repo;
		this.store = store;
	}

	async commit() {
		try {
			console.log("Committing and pushing...");
			await commitAndPush();
			console.log("Committed and pushed!");
			return "Committed and pushed!";
		} catch {
			console.log("Failed to commit/push");
			return "Failed to commit/push";
		}
	}

	async create(rpath: string, data: string) {
		console.log(rpath, data);
		try {
			this.repo.getRecord(rpath);
			this.repo.update(rpath, data);
		} catch {
			this.repo.create(rpath, data);
		}
		const root = this.repo.getRoot();
		this.store.saveRoots([CID.parse(root)]);
	}

	async update(rpath: string, data: string) {
		console.log(rpath, data);
		this.repo.update(rpath, data);
		const root = this.repo.getRoot();
		this.store.saveRoots([CID.parse(root)]);
	}

	async delete(rpath: string) {
		console.log(rpath);
		this.repo.delete(rpath);
		const root = this.repo.getRoot();
		this.store.saveRoots([CID.parse(root)]);
	}

	getDid() {
		return `did:web:${this.domain}`;
	}

	static async start(domain: string) {
		const doc = await resolve(domain);
		if (!doc.didKey && doc.target) {
			throw new Error("Please initialize repository first.");
		}
		const sk = await keytar.getPassword("polka", "user");
		if (!sk) {
			throw new Error("Please initialize private key first.");
		}
		// リポジトリをクローンかpull
		if (!existsRepository()) {
			throw new Error("Please initialize Git remote first.");
		} else {
			console.log("Pulling latest changes...");
			await pullRepository();
			console.log("Repository updated!");
		}
		console.log("Repo initialized successfully!");

		const { repo, store } = await init(sk, doc.didKey);
		return new polkaRepo(domain, repo, store);
	}
}

// repoをinitする
export async function init(sk: string, didKey: string) {
	// ~/.polkaがあるか確認
	if (!existsSync(join(homedir(), ".polka"))) {
		mkdirSync(join(homedir(), ".polka"));
	}

	const path = POLKA_CAR_PATH;

	if (existsSync(path)) {
		const { repo, store } = await open(
			didKey,
			new CarSyncStore(path, {
				mkdir: mkdirSync,
				readFile: readFileSync,
				writeFile: writeFileSync,
			}),
			(bytes: Uint8Array) => {
				const skBytes = hexToBytes(sk);
				const sig = secp256k1.sign(bytes, skBytes);
				return sig;
			},
		);
		return { repo, store };
	} else {
		const { repo, store } = await create(
			didKey,
			new CarSyncStore(path, {
				mkdir: mkdirSync,
				readFile: readFileSync,
				writeFile: writeFileSync,
			}),
			(bytes: Uint8Array) => {
				const skBytes = hexToBytes(sk);
				const sig = secp256k1.sign(bytes, skBytes);
				return sig;
			},
		);
		return { repo, store };
	}
}
