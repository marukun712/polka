import { existsSync, mkdirSync } from "node:fs";
import { Secp256k1Keypair } from "@atproto/crypto";
import { bytesToHex } from "@noble/curves/utils.js";
import { DB } from "@polka/db";
import { config } from "dotenv";
import Enquirer from "enquirer";
import { base58btc } from "multiformats/bases/base58";
import { type SimpleGit, simpleGit } from "simple-git";
import {
	cloneRepository,
	commitAndPush,
	existsRepository,
	POLKA_BASE_PATH,
	POLKA_CAR_PATH,
	POLKA_DIST_PATH,
	POLKA_REPO_PATH,
	pullRepository,
} from "./lib/git.ts";
import { decryptVault, findKeyByKid, parseDidWithKid } from "./lib/vault.ts";

config();

const { prompt } = Enquirer;

async function main() {
	try {
		const { didWithKid } = await prompt<{ didWithKid: string }>({
			type: "input",
			name: "didWithKid",
			message: "Enter your DID (format: did:web:example.com#kid):",
			required: true,
			result: (value) => value.trim(),
		});

		const { password } = await prompt<{ password: string }>({
			type: "password",
			name: "password",
			message: "Enter vault password:",
			required: true,
		});

		const { did, kid } = parseDidWithKid(didWithKid);
		const vaultKeys = await decryptVault(password);
		const key = findKeyByKid(vaultKeys, kid);

		if (!key) {
			console.error(`Key with kid "${kid}" not found in vault`);
			process.exit(1);
		}

		const skBytes = base58btc.decode(key.sk);
		const sk = bytesToHex(skBytes);

		const git = await setupGitRepository();

		const db = await init(sk, did);
		console.log("Repo initialized successfully!");

		await setupProfile(db);
		await db.build(POLKA_DIST_PATH);

		try {
			console.log("Committing and pushing...");
			await commitAndPush(git);
			console.log("Committed and pushed!");
		} catch (error) {
			console.error("Failed to commit/push:", (error as Error).message);
		}

		console.log("\nSetup complete!");
		console.log(db.commit);
		console.log(await db.all());
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
}

async function setupGitRepository(): Promise<SimpleGit> {
	let remoteUrl = process.env.POLKA_MAIN_REMOTE;
	if (!remoteUrl) {
		const result = await prompt<{ remoteUrl: string }>({
			type: "input",
			name: "remoteUrl",
			message: "Enter your Git remote SSH URL:",
			required: true,
			result: (value) => value.trim(),
		});
		remoteUrl = result.remoteUrl;
	}

	let git: SimpleGit;

	if (!existsRepository()) {
		console.log("Cloning repository...");
		await cloneRepository(remoteUrl);
		console.log("Repository cloned");
		git = simpleGit(POLKA_REPO_PATH);
	} else {
		git = simpleGit(POLKA_REPO_PATH);
		console.log("Pulling latest changes...");
		await pullRepository(git);
		console.log("Repository updated");
	}

	return git;
}

async function setupProfile(db: DB): Promise<void> {
	const profile = await db.find("polka.profile/self");

	if (!profile) {
		console.log("\nSetting up profile...");

		const { name } = await prompt<{ name: string }>({
			type: "input",
			name: "name",
			message: "Enter your name:",
			required: true,
			result: (value) => value.trim(),
		});

		const { description } = await prompt<{ description: string }>({
			type: "input",
			name: "description",
			message: "Enter your description:",
			required: true,
			result: (value) => value.trim(),
		});

		const { icon } = await prompt<{ icon: string }>({
			type: "input",
			name: "icon",
			message: "Enter your icon URL:",
			required: true,
			result: (value) => value.trim(),
		});

		await db.create("polka.profile/self", {
			name,
			description: description,
			icon: icon,
			updatedAt: new Date().toISOString(),
		});

		console.log("Profile created");
	}
}

async function init(sk: string, did: string): Promise<DB> {
	if (!existsSync(POLKA_BASE_PATH)) {
		mkdirSync(POLKA_BASE_PATH, { recursive: true });
	}

	const keypair = await Secp256k1Keypair.import(sk);

	if (existsSync(POLKA_CAR_PATH)) {
		return await DB.open(POLKA_CAR_PATH, keypair);
	} else {
		return await DB.init(POLKA_CAR_PATH, did, keypair);
	}
}

main();
