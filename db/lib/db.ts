import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { now } from "@atcute/tid";
import type { Secp256k1Keypair } from "@atproto/crypto";
import {
	blocksToCarFile,
	MemoryBlockstore,
	parseDataKey,
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

	static async init(path: string, did: string, keypair: Secp256k1Keypair) {
		const storage = new MemoryBlockstore();
		const repo = await Repo.create(storage, did, keypair);
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

	get root() {
		return this.repo.cid;
	}

	get commit() {
		return this.repo.commit;
	}

	get did() {
		return this.repo.did;
	}

	async create(rpath: string, record: Record<string, unknown>) {
		const { collection, rkey } = parseDataKey(rpath);
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
				const { collection, rkey } = parseDataKey(rpath);
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
		const existing = await this.find(rpath);
		if (existing !== null) {
			await this.update(rpath, record);
		} else {
			await this.create(rpath, record);
		}
	}

	async update(rpath: string, record: Record<string, unknown>) {
		const { collection, rkey } = parseDataKey(rpath);
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
				const { collection, rkey } = parseDataKey(rpath);
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
		const { collection, rkey } = parseDataKey(rpath);
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
				const { collection, rkey } = parseDataKey(rpath);
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

	async createIndex(collection: string, field: string) {
		const found = await this.findMany(collection);
		const indexEntries: { rpath: string; record: Record<string, unknown> }[] =
			[];

		found.records.forEach((record) => {
			if (!(field in record.data)) {
				return;
			}
			const target = record.data[field];
			if (Array.isArray(target)) {
				target.forEach((t) => {
					const key = `index/${collection}.${field}.${t}.${now()}`;
					indexEntries.push({
						rpath: encodeURIComponent(key),
						record: { rpath: record.rpath },
					});
				});
			} else {
				const key = `index/${collection}.${field}.${target}.${now()}`;
				indexEntries.push({
					rpath: encodeURIComponent(key),
					record: { rpath: record.rpath },
				});
			}
		});

		if (indexEntries.length > 0) {
			await this.createMany(indexEntries);
		}
	}

	async build(path: string) {
		if (!existsSync(path)) {
			mkdirSync(path);
		}
		for (const name of readdirSync(path)) {
			rmSync(join(path, name));
		}
		this.storage.blocks.entries().forEach((entry) => {
			writeFileSync(join(path, entry.cid.toString()), entry.bytes);
		});
		const root = this.repo.cid;
		writeFileSync(join(path, "ROOT"), root.toString());
	}

	async find(rpath: string) {
		const { collection, rkey } = parseDataKey(rpath);
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
			query?: Record<string, unknown>;
		},
	) {
		const { query } = options ?? {};
		const records: GetResult[] = [];
		const prefix = `${collection}/`;

		for await (const { collection: col, rkey, record } of this.repo.walkRecords(
			prefix,
		)) {
			if (col !== collection) continue;
			if (query) {
				const isMatch = Object.entries(query).every(([key, value]) => {
					const target = record[key];
					if (Array.isArray(target)) {
						return target.includes(value);
					}
					return target === value;
				});
				if (!isMatch) {
					continue;
				}
			}
			records.push({ rpath: `${col}/${rkey}`, data: record });
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
		const prefix = `${collection}/`;

		for await (const { collection: col, rkey, record } of this.repo.walkRecords(
			prefix,
		)) {
			if (col !== collection) continue;
			if (query) {
				const isMatch = Object.entries(query).every(([key, value]) => {
					const target = record[key];
					if (Array.isArray(target)) {
						return target.includes(value);
					}
					return target === value;
				});
				if (!isMatch) {
					continue;
				}
			}
			keys.push(`${col}/${rkey}`);
		}
		return { keys };
	}

	async all() {
		const records: GetResult[] = [];

		for await (const {
			collection: col,
			rkey,
			record,
		} of this.repo.walkRecords()) {
			records.push({ rpath: `${col}/${rkey}`, data: record });
		}

		return { records };
	}
}
