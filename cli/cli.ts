import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { WASIShim } from "@bytecodealliance/preview2-shim/instantiation";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hexToBytes } from "@noble/hashes/utils.js";
import { config } from "dotenv";
import keytar from "keytar";
import { CID } from "multiformats";
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

class PolkaCLI {
	domain: string;
	repo: Repo;
	store: CarSyncStore;

	constructor(domain: string, repo: Repo, store: CarSyncStore) {
		this.domain = domain;
		this.repo = repo;
		this.store = store;
	}

	async did() {
		console.log(JSON.stringify({ did: `did:web:${this.domain}` }, null, 2));
	}

	async commit() {
		const commitMessage = generateCommitMessage();
		console.log("Committing and pushing...");
		await commitAndPush(commitMessage);
		console.log("Committed and pushed!");
	}

	async create(rpath: string, data: string) {
		try {
			this.repo.getRecord(rpath);
			this.repo.update(rpath, data);
		} catch {
			this.repo.create(rpath, data);
		}
		const root = this.repo.getRoot();
		this.store.updateHeaderRoots([CID.parse(root)]);
		console.log(`record created: ${rpath}`);
	}

	async update(rpath: string, data: string) {
		this.repo.update(rpath, data);
		const root = this.repo.getRoot();
		this.store.updateHeaderRoots([CID.parse(root)]);
		console.log(`record updated: ${rpath}`);
	}

	async delete(rpath: string) {
		this.repo.delete(rpath);
		const root = this.repo.getRoot();
		this.store.updateHeaderRoots([CID.parse(root)]);
		console.log(`record deleted: ${rpath}`);
	}

	static async start(): Promise<PolkaCLI> {
		const domain = process.env.POLKA_DOMAIN;
		if (!domain) throw new Error("Please initialize repository first.");

		const doc = await resolve(domain);
		if (!doc.didKey && doc.target) {
			throw new Error("Please initialize repository first.");
		}

		const sk = await keytar.getPassword("polka", "user");
		if (!sk) throw new Error("Please initialize private key first.");

		const remoteUrl = process.env.POLKA_MAIN_REMOTE;
		if (!remoteUrl) throw new Error("Please initialize Git remote first.");

		if (!existsRepository(POLKA_REPO_PATH)) {
			throw new Error("Please initialize Git remote first.");
		} else {
			console.log("Pulling latest changes...");
			await pullRepository();
			console.log("Repository updated!");
		}

		const { repo, store } = await init(sk, doc.didKey);
		return new PolkaCLI(domain, repo, store);
	}
}

export async function init(sk: string, didKey: string) {
	if (!existsSync(join(homedir(), ".polka"))) {
		mkdirSync(join(homedir(), ".polka"));
	}

	const path = POLKA_CAR_PATH;
	const store = new CarSyncStore(path);

	const loader = async (path: string) => {
		const buf = readFileSync(`./dist/transpiled/${path}`);
		return await WebAssembly.compile(new Uint8Array(buf));
	};

	const wasm = await instantiate(loader, {
		//@ts-expect-error
		"polka:repository/crypto": {
			sign: (bytes: Uint8Array) => {
				const skBytes = hexToBytes(sk);
				return secp256k1.sign(bytes, skBytes);
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

const command = process.argv[2];
const args = process.argv.slice(3);

const cli = await PolkaCLI.start();

switch (command) {
	case "did":
		await cli.did();
		break;

	case "record:create":
		if (typeof args[0] !== "string" || typeof args[1] !== "string") {
			console.error("Usage: polka record:create <rpath> <data>");
			process.exit(1);
		}
		await cli.create(args[0], args[1]);
		break;

	case "record:update":
		if (typeof args[0] !== "string" || typeof args[1] !== "string") {
			console.error("Usage: polka record:update <rpath> <data>");
			process.exit(1);
		}
		await cli.update(args[0], args[1]);
		break;

	case "record:delete":
		if (typeof args[0] !== "string") {
			console.error("Usage: polka record:delete <rpath>");
			process.exit(1);
		}
		await cli.delete(args[0]);
		break;

	case "commit":
		await cli.commit();
		break;

	default:
		console.error(`unknown command ${command}`);
		process.exit(1);
}
