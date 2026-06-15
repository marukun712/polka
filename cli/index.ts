import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { now } from "@atcute/tid";
import { Secp256k1Keypair } from "@atproto/crypto";
import { DB } from "@polka/db";
import { config } from "dotenv";
import Enquirer from "enquirer";
import { type SimpleGit, simpleGit } from "simple-git";
import { generate } from "./lib/crypto.ts";
import {
	cloneRepository,
	commitAndPush,
	existsRepository,
	POLKA_BASE_PATH,
	POLKA_CAR_PATH,
	POLKA_DIST_PATH,
	POLKA_REPO_PATH,
} from "./lib/git.ts";
import { loadKey, saveKey } from "./lib/vault.ts";

config();

const { prompt } = Enquirer;

const DID_PATH = join(homedir(), ".polka", "did");
const KEY_PATH = join(homedir(), ".polka", "key.age");

async function getPassword(): Promise<string> {
	if (process.env.POLKA_PASSWORD) return process.env.POLKA_PASSWORD;
	const { password } = await prompt<{ password: string }>({
		type: "password",
		name: "password",
		message: "Vault password:",
		required: true,
	});
	return password;
}

function getSavedDid(): string {
	if (!existsSync(DID_PATH)) {
		throw new Error("Not initialized. Run: polka setup");
	}
	return readFileSync(DID_PATH, "utf-8").trim();
}

async function openDb(): Promise<DB> {
	const did = getSavedDid();
	const password = await getPassword();
	const sk = await loadKey(password);

	if (!existsSync(POLKA_BASE_PATH)) {
		mkdirSync(POLKA_BASE_PATH, { recursive: true });
	}

	const keypair = await Secp256k1Keypair.import(sk);
	if (!existsSync(POLKA_CAR_PATH)) {
		return await DB.init(POLKA_CAR_PATH, did, keypair);
	}
	return await DB.open(POLKA_CAR_PATH, keypair);
}

async function syncRepo(db: DB): Promise<void> {
	if (!existsRepository()) {
		console.log("Git repo not configured. Run 'polka setup' to set up sync.");
		return;
	}
	const git = simpleGit(POLKA_REPO_PATH);
	await db.build(POLKA_DIST_PATH);
	await commitAndPush(git);
	console.log("Synced.");
}

async function setupGitRepository(): Promise<SimpleGit> {
	let remoteUrl = process.env.POLKA_MAIN_REMOTE;
	if (!remoteUrl) {
		const result = await prompt<{ remoteUrl: string }>({
			type: "input",
			name: "remoteUrl",
			message: "Git remote SSH URL:",
			required: true,
			result: (v) => v.trim(),
		});
		remoteUrl = result.remoteUrl;
	}

	if (!existsRepository()) {
		console.log("Cloning repository...");
		await cloneRepository(remoteUrl);
		console.log("Repository cloned.");
	} else {
		console.log("Pulling latest changes...");
		const git = simpleGit(POLKA_REPO_PATH);
		await git.pull("origin", "main");
		console.log("Repository updated.");
	}

	return simpleGit(POLKA_REPO_PATH);
}

async function setupProfile(db: DB): Promise<void> {
	const profile = await db.find("polka.profile/self");
	if (profile) return;

	console.log("\nSetting up profile...");

	const { name } = await prompt<{ name: string }>({
		type: "input",
		name: "name",
		message: "Your name:",
		required: true,
		result: (v) => v.trim(),
	});

	const { description } = await prompt<{ description: string }>({
		type: "input",
		name: "description",
		message: "Description:",
		required: true,
		result: (v) => v.trim(),
	});

	const { icon } = await prompt<{ icon: string }>({
		type: "input",
		name: "icon",
		message: "Icon URL:",
		required: true,
		result: (v) => v.trim(),
	});

	await db.create("polka.profile/self", {
		name,
		description,
		icon,
		updatedAt: new Date().toISOString(),
	});

	console.log("Profile created.");
}

async function cmdSetup(): Promise<void> {
	const { did } = await prompt<{ did: string }>({
		type: "input",
		name: "did",
		message: "Enter your DID (e.g. did:web:example.com):",
		required: true,
		result: (v) => v.trim(),
	});

	const { password } = await prompt<{ password: string }>({
		type: "password",
		name: "password",
		message: "Vault password:",
		required: true,
	});

	let sk: string;
	if (existsSync(KEY_PATH)) {
		sk = await loadKey(password);
	} else {
		const generated = await generate();
		sk = generated.sk;
		await saveKey(password, sk);
		console.log(`\nKey generated.`);
		console.log(`Public key: ${generated.pk}`);
		console.log("Add this key to your did:web document before first sync.\n");
	}

	writeFileSync(DID_PATH, did);

	const git = await setupGitRepository();

	const keypair = await Secp256k1Keypair.import(sk);
	if (!existsSync(POLKA_BASE_PATH)) {
		mkdirSync(POLKA_BASE_PATH, { recursive: true });
	}
	const db = existsSync(POLKA_CAR_PATH)
		? await DB.open(POLKA_CAR_PATH, keypair)
		: await DB.init(POLKA_CAR_PATH, did, keypair);

	await setupProfile(db);
	await db.build(POLKA_DIST_PATH);
	await commitAndPush(git);

	console.log("\nSetup complete!");
}

async function cmdKeysInit(): Promise<void> {
	const { password } = await prompt<{ password: string }>({
		type: "password",
		name: "password",
		message: "Vault password:",
		required: true,
	});

	const { pk, sk } = await generate();
	await saveKey(password, sk);

	console.log("Key created.");
	console.log(`Public key: ${pk}`);
}

async function cmdPost(args: string[]): Promise<void> {
	// https://bun.sh/docs/guides/process/argv
	const { values } = parseArgs({
		args,
		options: {
			content: { type: "string" },
			parents: { type: "string" },
		},
		strict: true,
	});
	if (!values.content) throw new Error("--content is required");
	const parents = values.parents
		? values.parents.split(",").map((t) => t.trim())
		: [];

	const db = await openDb();
	await db.create(`polka.post/${now()}`, {
		content: values.content,
		parents,
		updatedAt: new Date().toISOString(),
	});
	await syncRepo(db);
	console.log("Post created.");
}

async function cmdLink(args: string[]): Promise<void> {
	const { values } = parseArgs({
		args,
		options: {
			did: { type: "string" },
			rpath: { type: "string" },
			parents: { type: "string" },
		},
		strict: true,
	});
	if (!values.did || !values.rpath)
		throw new Error("--did and --rpath are required");
	const parents = values.parents
		? values.parents.split(",").map((t) => t.trim())
		: [];

	const db = await openDb();
	await db.create(`polka.link/${now()}`, {
		ref: { did: values.did, rpath: values.rpath },
		parents,
		updatedAt: new Date().toISOString(),
	});
	await syncRepo(db);
	console.log("Link created.");
}

async function cmdFollow(args: string[]): Promise<void> {
	const { values } = parseArgs({
		args,
		options: {
			did: { type: "string" },
			tag: { type: "string" },
		},
		strict: true,
	});
	if (!values.did || !values.tag)
		throw new Error("--did and --tag are required");

	const db = await openDb();
	await db.create(`polka.follow/${now()}`, {
		did: values.did,
		tag: values.tag,
		updatedAt: new Date().toISOString(),
	});
	await syncRepo(db);
	console.log(`Following ${values.did} via tag "${values.tag}".`);
}

async function cmdEdge(args: string[]): Promise<void> {
	const { values } = parseArgs({
		args,
		options: {
			to: { type: "string" },
			from: { type: "string" },
		},
		strict: true,
	});
	if (!values.to) throw new Error("--to is required");

	const record: Record<string, unknown> = {
		to: values.to,
		updatedAt: new Date().toISOString(),
	};
	if (values.from) record.from = values.from;

	const db = await openDb();
	await db.create(`polka.edge/${now()}`, record);
	await syncRepo(db);
	console.log(
		`Edge created: ${values.from ? `${values.from} -> ` : ""}${values.to}`,
	);
}

async function cmdProfile(args: string[]): Promise<void> {
	const { values } = parseArgs({
		args,
		options: {
			name: { type: "string" },
			description: { type: "string" },
			icon: { type: "string" },
		},
		strict: true,
	});
	if (!values.name || !values.description || !values.icon) {
		throw new Error("--name, --description, and --icon are required");
	}

	const db = await openDb();
	await db.upsert("polka.profile/self", {
		name: values.name,
		description: values.description,
		icon: values.icon,
		updatedAt: new Date().toISOString(),
	});
	await syncRepo(db);
	console.log("Profile updated.");
}

async function cmdSync(): Promise<void> {
	const db = await openDb();
	await syncRepo(db);
}

function printHelp(): void {
	console.log(`polka - CLI for the polka network

Commands:
  setup                                  Interactive first-time setup
  keys init                              Generate a new keypair
  post --content <text> [--parents <tag1,tag2>]
  link --did <did> --rpath <rpath> [--parents <tag1,tag2>]
  follow --did <did> --tag <tag>
  edge --to <tag> [--from <parent-tag>]
  profile --name <n> --description <d> --icon <url>
  sync                                   Build and push to Git remote

Environment:
  POLKA_PASSWORD      Vault password (skips prompt)
  POLKA_MAIN_REMOTE   Git remote URL (skips prompt in setup)`);
}

async function main(): Promise<void> {
	const { positionals } = parseArgs({
		args: Bun.argv,
		allowPositionals: true,
		strict: false,
	});

	const cmd = positionals[2];
	const sub = positionals[3];
	const rest = process.argv.slice(3);

	try {
		switch (cmd) {
			case "setup":
				await cmdSetup();
				break;
			case "keys":
				if (sub === "init") {
					await cmdKeysInit();
				} else {
					printHelp();
				}
				break;
			case "post":
				await cmdPost(rest);
				break;
			case "link":
				await cmdLink(rest);
				break;
			case "follow":
				await cmdFollow(rest);
				break;
			case "edge":
				await cmdEdge(rest);
				break;
			case "profile":
				await cmdProfile(rest);
				break;
			case "sync":
				await cmdSync();
				break;
			default:
				printHelp();
		}
	} catch (e) {
		console.error((e as Error).message);
		process.exit(1);
	}
}

main();
