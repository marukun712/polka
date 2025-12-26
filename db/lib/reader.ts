import {
	type ReadableBlockstore,
	RepoVerificationError,
	verifyCommitSig,
} from "@atproto/repo";
import { ReadableRepo } from "@atproto/repo/dist/readable-repo";
import type { CID } from "multiformats/cid";
import HTTPStorage from "./httpStore";
import type { GetResult } from "./types";

export class Reader {
	private repo: ReadableRepo;

	constructor(repo: ReadableRepo) {
		this.repo = repo;
	}

	static async open(url: string) {
		const storage = new HTTPStorage(new URL(url));
		const root = await storage.getRoot();
		if (!root) throw new Error("Root not found");

		const repo = await verifyRepoRoot(storage, root);
		return new Reader(repo);
	}

	async find(rpath: string): Promise<GetResult> {
		const collection = rpath.split("/")[0];
		const rkey = rpath.split("/")[1];
		if (!collection || !rkey) throw new Error("Invalid rpath");
		const data = await this.repo.getRecord(collection, rkey);
		return {
			rpath,
			data: data as Record<string, unknown>,
		};
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

const verifyRepoRoot = async (
	storage: ReadableBlockstore,
	head: CID,
	did?: string,
	signingKey?: string,
): Promise<ReadableRepo> => {
	const repo = await ReadableRepo.load(storage, head);
	if (did !== undefined && repo.did !== did) {
		throw new RepoVerificationError(`Invalid repo did: ${repo.did}`);
	}
	if (signingKey !== undefined) {
		const validSig = await verifyCommitSig(repo.commit, signingKey);
		if (!validSig) {
			throw new RepoVerificationError(
				`Invalid signature on commit: ${repo.cid.toString()}`,
			);
		}
	}
	return repo;
};
