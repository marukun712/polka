import { decode, encode, fromBytes } from "@atcute/cbor";
import { verifySigWithDidKey } from "@atcute/crypto";
import {
	MemoryBlockStore,
	NodeStore,
	NodeWalker,
	OverlayBlockStore,
} from "@atcute/mst";
import { type Commit, isCommit } from "@atcute/repo";
import HTTPStorage from "./httpStore.ts";
import { resolve } from "./identity.ts";
import type { GetResult } from "./types.ts";

export class Reader {
	private store: NodeStore;
	private storage: HTTPStorage;
	root: string;
	commit: Commit;
	did: string;

	constructor(
		store: NodeStore,
		storage: HTTPStorage,
		root: string,
		commit: Commit,
	) {
		this.store = store;
		this.storage = storage;
		this.root = root;
		this.commit = commit;
		this.did = commit.did;
	}

	static async open(did: string, url: string) {
		const doc = await resolve(did);
		if (!doc) throw new Error("Failed to resolve did:web");
		const pk = doc.didKey;
		const storage = new HTTPStorage(url);
		const store = new NodeStore(
			new OverlayBlockStore(new MemoryBlockStore(), storage),
		);
		const root = await storage.getRoot();
		if (!root) throw new Error("Failed to get repo root CID");
		const block = await storage.get(root);
		if (!block) throw new Error("Failed to get repo commit block");
		const decoded = decode(block);
		if (!isCommit(decoded)) {
			throw new Error("Root block is not a valid commit");
		}
		if (decoded.did !== did) {
			throw new Error(`Invalid repo did: ${decoded.did}`);
		}
		const { sig, ...rest } = decoded;
		const encoded = encode(rest);
		const verified = await verifySigWithDidKey(
			pk,
			new Uint8Array(fromBytes(sig)),
			encoded,
		);
		if (!verified) {
			throw new Error(`Invalid signature`);
		}
		return new Reader(store, storage, root, decoded);
	}

	async find(rpath: string) {
		const walker = await NodeWalker.create(this.store, this.commit.data.$link);

		const cid = await walker.findRpath(rpath);
		if (!cid) return null;
		const block = await this.storage.get(cid.$link);
		if (!block) return null;
		const decoded = decode(block);
		return {
			rpath,
			data: decoded,
		};
	}

	async findMany(
		collection: string,
		options?: {
			query?: Record<string, unknown>;
		},
	) {
		const { query } = options ?? {};
		const records: GetResult[] = [];

		const walker = await NodeWalker.create(this.store, this.commit.data.$link);

		const start = `${collection}/`;
		const end = `${collection}/\xff`;

		for await (const [rpath, cid] of walker.entriesInRange(start, end)) {
			const block = await this.storage.get(cid.$link);
			if (!block) {
				continue;
			}
			const decoded = decode(block);
			if (query) {
				const isMatch = Object.entries(query).every(([key, value]) => {
					const target = decoded[key];
					if (Array.isArray(target)) {
						return target.includes(value);
					}
					return target === value;
				});
				if (!isMatch) {
					continue;
				}
			}
			records.push({ rpath, data: decoded });
		}

		return { records };
	}

	async findKeys(
		collection: string,
		options?: {
			query?: Record<string, unknown>;
		},
	) {
		const { query } = options ?? {};
		const keys: string[] = [];

		const walker = await NodeWalker.create(this.store, this.commit.data.$link);

		const start = `${collection}/`;
		const end = `${collection}/\xff`;

		for await (const [rpath, cid] of walker.entriesInRange(start, end)) {
			const block = await this.storage.get(cid.$link);
			if (!block) {
				continue;
			}
			const decoded = decode(block);
			if (query) {
				const isMatch = Object.entries(query).every(([key, value]) => {
					const target = decoded[key];
					if (Array.isArray(target)) {
						return target.includes(value);
					}
					return target === value;
				});
				if (!isMatch) {
					continue;
				}
			}
			keys.push(rpath);
		}

		return { keys };
	}

	async all() {
		const records: GetResult[] = [];

		const walker = await NodeWalker.create(this.store, this.commit.data.$link);

		for await (const [rpath, cid] of walker.entries()) {
			const block = await this.storage.get(cid.$link);
			if (!block) {
				continue;
			}
			const decoded = decode(block);
			records.push({ rpath, data: decoded });
		}

		return { records };
	}
}
