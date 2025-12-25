import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hexToBytes } from "@noble/hashes/utils.js";
import { CarWriter, DBWriter } from "@polka/db/writer";
import { config } from "dotenv";
import keytar from "keytar";
import { CID } from "multiformats";
import {
	commitAndPush,
	existsRepository,
	POLKA_CAR_PATH,
	pullRepository,
} from "./git.ts";
import { resolve } from "./identity.ts";

config();

export class polkaRepo {
	domain: string;
	writer: DBWriter;

	constructor(domain: string, writer: DBWriter) {
		this.domain = domain;
		this.writer = writer;
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

	async create(rpath: string, data: string) {
		console.log(rpath, data);
		try {
			this.writer.getRecord(rpath);
			this.writer.update(rpath, data);
		} catch {
			this.writer.create(rpath, data);
		}
		const root = this.writer.getRoot();
		this.writer.saveRoots([CID.parse(root)]);
	}

	async update(rpath: string, data: string) {
		console.log(rpath, data);
		this.writer.update(rpath, data);
		const root = this.writer.getRoot();
		this.writer.saveRoots([CID.parse(root)]);
	}

	async delete(rpath: string) {
		console.log(rpath);
		this.writer.delete(rpath);
		const root = this.writer.getRoot();
		this.writer.saveRoots([CID.parse(root)]);
	}

	getDid() {
		return `did:web:${this.domain}`;
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

		const writer = await init(sk, doc.didKey);
		return new polkaRepo(domain, writer);
	}
}

// repoをinitする
export async function init(sk: string, didKey: string) {
	// ~/.polkaがあるか確認
	if (!existsSync(join(homedir(), ".polka"))) {
		mkdirSync(join(homedir(), ".polka"));
	}

	const path = POLKA_CAR_PATH;

	if (existsSync(path)) {
		const writer = await DBWriter.open(
			didKey,
			new CarWriter(path, {
				mkdir: mkdirSync,
				readFile: readFileSync,
				writeFile: writeFileSync,
			}),
			(bytes: Uint8Array) => {
				const skBytes = hexToBytes(sk);
				const sig = secp256k1.sign(bytes, skBytes);
				return sig;
			},
		);
		return writer;
	} else {
		const writer = await DBWriter.init(
			didKey,
			new CarWriter(path, {
				mkdir: mkdirSync,
				readFile: readFileSync,
				writeFile: writeFileSync,
			}),
			(bytes: Uint8Array) => {
				const skBytes = hexToBytes(sk);
				const sig = secp256k1.sign(bytes, skBytes);
				return sig;
			},
		);
		return writer;
	}
}
