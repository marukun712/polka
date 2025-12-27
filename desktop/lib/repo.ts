import { existsSync } from "node:fs";
import { Secp256k1Keypair } from "@atproto/crypto";
import { DB } from "@polka/db";
import { config } from "dotenv";
import keytar from "keytar";
import { type SimpleGit, simpleGit } from "simple-git";
import {
	commitAndPush,
	existsRepository,
	POLKA_CAR_PATH,
	POLKA_DIST_PATH,
	POLKA_REPO_PATH,
	pullRepository,
} from "./git.ts";
import { resolve } from "./identity.ts";

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
		this.db.upsert(rpath, data);
		this.db.build(POLKA_DIST_PATH);
	}

	async update(rpath: string, data: Record<string, unknown>) {
		this.db.update(rpath, data);
		this.db.build(POLKA_DIST_PATH);
	}

	async delete(rpath: string) {
		this.db.delete(rpath);
		this.db.build(POLKA_DIST_PATH);
	}

	getDid() {
		return this.db.did;
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
		}

		const git = simpleGit(POLKA_REPO_PATH);

		console.log("Pulling latest changes...");
		await pullRepository(git);
		console.log("Repository updated!");

		console.log("Repo initialized successfully!");

		const db = await init(sk);
		return new polkaRepo(db, git);
	}
}

// repoをinitする
async function init(sk: string) {
	const keypair = await Secp256k1Keypair.import(sk);

	if (existsSync(POLKA_CAR_PATH)) {
		const db = await DB.open(POLKA_CAR_PATH, keypair);
		return db;
	} else {
		const db = await DB.init(POLKA_CAR_PATH, keypair);
		return db;
	}
}
