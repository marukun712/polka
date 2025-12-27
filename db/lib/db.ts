import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Secp256k1Keypair } from "@atproto/crypto";
import {
	blocksToCarFile,
	MemoryBlockstore,
	Repo,
	readCarWithRoot,
	WriteOpAction,
} from "@atproto/repo";
import type { GetResult } from "./types.ts";

export class DB {
	private path: string;
	private repo: Repo;
	private storage: MemoryBlockstore;
	private keypair: Secp256k1Keypair;

	constructor(
		path: string,
		repo: Repo,
		storage: MemoryBlockstore,
		keypair: Secp256k1Keypair,
	) {
		this.path = path;
		this.repo = repo;
		this.storage = storage;
		this.keypair = keypair;
	}

	static async init(path: string, keypair: Secp256k1Keypair) {
		const storage = new MemoryBlockstore();
		const repo = await Repo.create(storage, keypair.did(), keypair);
		const bytes = await blocksToCarFile(repo.cid, storage.blocks);
		writeFileSync(path, bytes);
		return new DB(path, repo, storage, keypair);
	}

	static async open(path: string, keypair: Secp256k1Keypair) {
		const bytes = readFileSync(path);
		const { root, blocks } = await readCarWithRoot(bytes);
		const storage = new MemoryBlockstore(blocks);
		const repo = await Repo.load(storage, root);
		return new DB(path, repo, storage, keypair);
	}

	async create(rpath: string, record: Record<string, unknown>) {
		const collection = rpath.split("/")[0];
		const rkey = rpath.split("/")[1];
		if (!collection || !rkey) throw new Error("Invalid rpath");
		this.repo = await this.repo.applyWrites(
			{
				action: WriteOpAction.Create,
				collection: collection,
				rkey: rkey,
				record,
			},
			this.keypair,
		);
		const bytes = await blocksToCarFile(this.repo.cid, this.storage.blocks);
		writeFileSync(this.path, bytes);
	}

	async createMany(
		data: {
			rpath: string;
			record: Record<string, unknown>;
		}[],
	) {
		this.repo = await this.repo.applyWrites(
			data.map(({ rpath, record }) => {
				const collection = rpath.split("/")[0];
				const rkey = rpath.split("/")[1];
				if (!collection || !rkey) throw new Error("Invalid rpath");
				return {
					action: WriteOpAction.Create,
					collection: collection,
					rkey: rkey,
					record,
				};
			}),
			this.keypair,
		);
		const bytes = await blocksToCarFile(this.repo.cid, this.storage.blocks);
		writeFileSync(this.path, bytes);
	}

	async upsert(rpath: string, record: Record<string, unknown>) {
		try {
			this.find(rpath);
			this.update(rpath, record);
		} catch {
			this.create(rpath, record);
		}
	}

	async update(rpath: string, record: Record<string, unknown>) {
		const collection = rpath.split("/")[0];
		const rkey = rpath.split("/")[1];
		if (!collection || !rkey) throw new Error("Invalid rpath");
		this.repo = await this.repo.applyWrites(
			{
				action: WriteOpAction.Update,
				collection: collection,
				rkey: rkey,
				record,
			},
			this.keypair,
		);
		const bytes = await blocksToCarFile(this.repo.cid, this.storage.blocks);
		writeFileSync(this.path, bytes);
	}

	async updateMany(
		data: {
			rpath: string;
			record: Record<string, unknown>;
		}[],
	) {
		this.repo = await this.repo.applyWrites(
			data.map(({ rpath, record }) => {
				const collection = rpath.split("/")[0];
				const rkey = rpath.split("/")[1];
				if (!collection || !rkey) throw new Error("Invalid rpath");
				return {
					action: WriteOpAction.Update,
					collection: collection,
					rkey: rkey,
					record,
				};
			}),
			this.keypair,
		);
		const bytes = await blocksToCarFile(this.repo.cid, this.storage.blocks);
		writeFileSync(this.path, bytes);
	}

	async delete(rpath: string) {
		const collection = rpath.split("/")[0];
		const rkey = rpath.split("/")[1];
		if (!collection || !rkey) throw new Error("Invalid rpath");
		this.repo = await this.repo.applyWrites(
			{
				action: WriteOpAction.Delete,
				collection: collection,
				rkey: rkey,
			},
			this.keypair,
		);
		const bytes = await blocksToCarFile(this.repo.cid, this.storage.blocks);
		writeFileSync(this.path, bytes);
	}

	async deleteMany(data: { rpath: string }[]) {
		this.repo = await this.repo.applyWrites(
			data.map(({ rpath }) => {
				const collection = rpath.split("/")[0];
				const rkey = rpath.split("/")[1];
				if (!collection || !rkey) throw new Error("Invalid rpath");
				return {
					action: WriteOpAction.Delete,
					collection: collection,
					rkey: rkey,
				};
			}),
			this.keypair,
		);
		const bytes = await blocksToCarFile(this.repo.cid, this.storage.blocks);
		writeFileSync(this.path, bytes);
	}

	async build(path: string) {
		if (!existsSync(path)) {
			mkdirSync(path);
		}
		this.storage.blocks.entries().forEach((entry) => {
			writeFileSync(join(path, entry.cid.toString()), entry.bytes);
		});
	}

	async find(rpath: string) {
		const collection = rpath.split("/")[0];
		const rkey = rpath.split("/")[1];
		if (!collection || !rkey) throw new Error("Invalid rpath");
		const data = await this.repo.getRecord(collection, rkey);
		if (data) {
			return {
				rpath,
				data: data as Record<string, unknown>,
			};
		} else {
			return null;
		}
	}

	async findMany(
		collection: string,
		options?: {
			limit?: number;
			cursor?: string;
		},
	): Promise<{ records: GetResult[]; cursor?: string }> {
		const { limit = 50, cursor } = options ?? {};
		const records: GetResult[] = [];
		const prefix = `${collection}/`;

		for await (const { collection: col, rkey, record } of this.repo.walkRecords(
			cursor ? `${prefix}${cursor}` : prefix,
		)) {
			if (col !== collection) continue;
			if (records.length >= limit) {
				return {
					records,
					cursor: rkey,
				};
			}
			records.push({ rpath: `${col}/${rkey}`, data: record });
		}

		return { records };
	}

	async all(options?: {
		limit?: number;
		cursor?: string;
	}): Promise<{ records: GetResult[]; cursor?: string }> {
		const { limit = 50, cursor } = options ?? {};
		const records: GetResult[] = [];

		for await (const { collection: col, rkey, record } of this.repo.walkRecords(
			cursor ? `${cursor}` : "",
		)) {
			if (records.length >= limit) {
				return {
					records,
					cursor: rkey,
				};
			}
			records.push({ rpath: `${col}/${rkey}`, data: record });
		}

		return { records };
	}

	async collections() {
		const contents = await this.repo.getContents();
		return Object.keys(contents);
	}

	get did() {
		return this.repo.did;
	}

	get cid() {
		return this.repo.cid;
	}
}
