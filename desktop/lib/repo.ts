import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Secp256k1Keypair } from "@atproto/crypto";
import { DB } from "@polka/db/lib";
import { config } from "dotenv";
import keytar from "keytar";
import {
	commitAndPush,
	existsRepository,
	POLKA_CAR_PATH,
	POLKA_DIST_PATH,
	pullRepository,
} from "./git.ts";
import { resolve } from "./identity.ts";

config();

export class polkaRepo {
	db: DB;

	constructor(db: DB) {
		this.db = db;
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
		} else {
			console.log("Pulling latest changes...");
			await pullRepository();
			console.log("Repository updated!");
		}
		console.log("Repo initialized successfully!");

		const db = await init(sk);
		return new polkaRepo(db);
	}
}

async function init(sk: string) {
	// ~/.polkaがあるか確認
	if (!existsSync(join(homedir(), ".polka"))) {
		mkdirSync(join(homedir(), ".polka"));
	}

	const path = POLKA_CAR_PATH;

	const keypair = await Secp256k1Keypair.import(sk);

	if (existsSync(path)) {
		const db = await DB.open(path, keypair);
		return db;
	} else {
		const db = await DB.init(path, keypair);
		return db;
	}
}
