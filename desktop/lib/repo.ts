import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { WASIShim } from "@bytecodealliance/preview2-shim/instantiation";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hexToBytes } from "@noble/hashes/utils.js";
import { config } from "dotenv";
import keytar from "keytar";
import { CID } from "multiformats";
import type { Repo } from "../ui/public/interfaces/polka-repository-repo.js";
import { instantiate } from "../ui/public/repo.js";
import { CarSyncStore } from "./blockstore.ts";
import {
	commitAndPush,
	existsRepository,
	POLKA_CAR_PATH,
	POLKA_REPO_PATH,
	pullRepository,
} from "./git.ts";
import { resolve } from "./identity.ts";

config();

export class polkaRepo {
	domain: string;
	repo: Repo;
	store: CarSyncStore;

	constructor(domain: string, repo: Repo, store: CarSyncStore) {
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
		this.store.updateHeaderRoots([CID.parse(root)]);
	}

	async update(rpath: string, data: string) {
		console.log(rpath, data);
		this.repo.update(rpath, data);
		const root = this.repo.getRoot();
		this.store.updateHeaderRoots([CID.parse(root)]);
	}

	async delete(rpath: string) {
		console.log(rpath);
		this.repo.delete(rpath);
		const root = this.repo.getRoot();
		this.store.updateHeaderRoots([CID.parse(root)]);
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
		if (!existsRepository(POLKA_REPO_PATH)) {
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
	const store = new CarSyncStore(path);

	// WASMのロード
	const loader = async (path: string) => {
		const buf = readFileSync(`./dist/${path}`);
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
