import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Secp256k1Keypair } from "@atproto/crypto";
import {
	blocksToCarFile,
	MemoryBlockstore,
	Repo,
	readCarWithRoot,
	WriteOpAction,
} from "@atproto/repo";

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

	static async create(path: string, keypair: Secp256k1Keypair) {
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

	async init(
		collection: string,
		rkey: string,
		record: Record<string, unknown>,
	) {
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
			collection: string;
			rkey: string;
			record: Record<string, unknown>;
		}[],
	) {
		this.repo = await this.repo.applyWrites(
			data.map(({ collection, rkey, record }) => ({
				action: WriteOpAction.Create,
				collection: collection,
				rkey: rkey,
				record,
			})),
			this.keypair,
		);
		const bytes = await blocksToCarFile(this.repo.cid, this.storage.blocks);
		writeFileSync(this.path, bytes);
	}

	async update(
		collection: string,
		rkey: string,
		record: Record<string, unknown>,
	) {
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
			collection: string;
			rkey: string;
			record: Record<string, unknown>;
		}[],
	) {
		this.repo = await this.repo.applyWrites(
			data.map(({ collection, rkey, record }) => ({
				action: WriteOpAction.Update,
				collection: collection,
				rkey: rkey,
				record,
			})),
			this.keypair,
		);
		const bytes = await blocksToCarFile(this.repo.cid, this.storage.blocks);
		writeFileSync(this.path, bytes);
	}

	async delete(collection: string, rkey: string) {
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

	async deleteMany(data: { collection: string; rkey: string }[]) {
		this.repo = await this.repo.applyWrites(
			data.map(({ collection, rkey }) => ({
				action: WriteOpAction.Delete,
				collection: collection,
				rkey: rkey,
			})),
			this.keypair,
		);
		const bytes = await blocksToCarFile(this.repo.cid, this.storage.blocks);
		writeFileSync(this.path, bytes);
	}

	async build(path: string) {
		this.storage.blocks.entries().forEach((entry) => {
			writeFileSync(join(path, entry.cid.toString()), entry.bytes);
		});
	}
}
