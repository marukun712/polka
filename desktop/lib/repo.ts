import { existsSync } from "node:fs";
import { Secp256k1Keypair } from "@atproto/crypto";
import { DB } from "@polka/db";
import { resolve } from "@polka/db/identity";
import { config } from "dotenv";
import { type SimpleGit, simpleGit } from "simple-git";
import {
	commitAndPush,
	existsRepository,
	POLKA_CAR_PATH,
	POLKA_DIST_PATH,
	POLKA_REPO_PATH,
	pullRepository,
} from "./git.ts";

config();

export class polkaRepo {
	db: DB;
	git: SimpleGit;

	constructor(db: DB, git: SimpleGit) {
		this.db = db;
		this.git = git;
	}

	async commit() {
		try {
			console.log("Committing and pushing...");
			await commitAndPush(this.git);
			console.log("Committed and pushed!");
			return "Committed and pushed!";
		} catch {
			console.log("Failed to commit/push");
			return "Failed to commit/push";
		}
	}

	async create(rpath: string, data: Record<string, unknown>) {
		await this.db.upsert(rpath, data);
		await this.db.build(POLKA_DIST_PATH);
	}

	async update(rpath: string, data: Record<string, unknown>) {
		await this.db.update(rpath, data);
		await this.db.build(POLKA_DIST_PATH);
	}

	async delete(rpath: string) {
		await this.db.delete(rpath);
		await this.db.build(POLKA_DIST_PATH);
	}

	getDid() {
		return this.db.did;
	}

	getCommit() {
		return this.db.commit;
	}

	static async start(did: string, sk: string) {
		const doc = await resolve(did);
		if (!doc) {
			throw new Error("Failed to resolve did:web.");
		}
		if (!existsRepository()) {
			throw new Error("Please initialize Git remote first.");
		}

		const git = simpleGit(POLKA_REPO_PATH);

		console.log("Pulling latest changes...");
		await pullRepository(git);
		console.log("Repository updated!");

		console.log("Repo initialized successfully!");

		const db = await init(sk, did);
		return new polkaRepo(db, git);
	}
}

// repoをinitする
async function init(sk: string, did: string) {
	const keypair = await Secp256k1Keypair.import(sk);

	if (existsSync(POLKA_CAR_PATH)) {
		const db = await DB.open(POLKA_CAR_PATH, keypair);
		return db;
	} else {
		const db = await DB.init(POLKA_CAR_PATH, did, keypair);
		return db;
	}
}
