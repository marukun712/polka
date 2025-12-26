import {
	type ReadableBlockstore,
	RepoVerificationError,
	verifyCommitSig,
} from "@atproto/repo";
import { ReadableRepo } from "@atproto/repo/dist/readable-repo";
import type { CID } from "multiformats/cid";
import HTTPStorage from "./httpStore";

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

	async find(collection: string, rkey: string) {
		return this.repo.getRecord(collection, rkey);
	}

	async findMany(
		collection: string,
		options?: {
			limit?: number;
			cursor?: string;
		},
	) {
		const { limit = 50, cursor } = options ?? {};
		const records: { rkey: string; value: unknown; cid: CID }[] = [];
		const prefix = `${collection}/`;

		for await (const {
			collection: col,
			rkey,
			cid,
			record,
		} of this.repo.walkRecords(cursor ? `${prefix}${cursor}` : prefix)) {
			if (col !== collection) continue;
			if (records.length >= limit) {
				return {
					records,
					cursor: rkey,
				};
			}
			records.push({ rkey, value: record, cid });
		}

		return records;
	}

	async all() {
		return this.repo.getContents();
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
