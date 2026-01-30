import { existsSync, mkdirSync } from "node:fs";
import { Secp256k1Keypair } from "@atproto/crypto";
import { DB } from "@polka/db";
import { resolve } from "@polka/db/identity";
import { config } from "dotenv";
import Enquirer from "enquirer";
import keytar from "keytar";
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
	pullRepository,
} from "./lib/git.ts";
import { generateDidDocument } from "./lib/identity.ts";

config();

const { prompt } = Enquirer;

async function main() {
	try {
		// ステップ1: ドメインの取得
		const domain = await getDomain();
		const did = `did:web:${domain}`;

		// ステップ2: 秘密鍵の取得または生成
		const sk = await getOrCreatePrivateKey(did, domain);

		// ステップ3: Gitリポジトリのセットアップ
		const git = await setupGitRepository();

		// ステップ4: DBの初期化
		const db = await init(sk, did);
		console.log("Repo initialized successfully!");

		// ステップ5: プロフィールのセットアップ
		await setupProfile(db);

		// ステップ6: ビルドとコミット
		await db.build(POLKA_DIST_PATH);

		try {
			console.log("Committing and pushing...");
			await commitAndPush(git);
			console.log("Committed and pushed!");
		} catch (error) {
			console.error("Failed to commit/push:", (error as Error).message);
		}

		console.log("\nSetup complete!");
		console.log(await db.all());
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
}

async function getDomain(): Promise<string> {
	let domain = process.env.POLKA_DOMAIN;
	if (!domain) {
		const result = await prompt<{ domain: string }>({
			type: "input",
			name: "domain",
			message: "Enter your domain:",
			required: true,
			result: (value) => value.trim(),
		});
		domain = result.domain;
	}
	return domain;
}

async function getOrCreatePrivateKey(
	did: string,
	domain: string,
): Promise<string> {
	// まずOSキーチェーンから秘密鍵を取得
	let sk = await keytar.getPassword("polka", "user");

	if (sk) {
		console.log("Private key found in OS Keyring");

		// 念のため、保存されている鍵が正しいか確認
		const doc = await resolve(did);

		if (doc) {
			const keypair = await Secp256k1Keypair.import(sk);
			if (doc.didKey !== keypair.did()) {
				throw new Error(
					"Warning: Saved private key doesn't match did:web document!",
				);
			} else {
				return sk;
			}
		}

		// 鍵はあるが、did:webが解決できない場合
		console.log("Private key found in OS Keyring, but did:web is not resolved");

		// ローカルの鍵を優先し、解決できるようになるまで待つ
		await waitForDidResolution(did);

		const d = await resolve(did);

		if (d) {
			// 鍵が正しいか検証して返す
			const keypair = await Secp256k1Keypair.import(sk);
			if (d.didKey !== keypair.did()) {
				throw new Error(
					"Warning: Saved private key doesn't match did:web document!",
				);
			} else {
				return sk;
			}
		} else {
			// さっきは解決できたのに急に解決できなくなったとき
			throw new Error(
				"The did:web issue was resolved before, but it could not be resolved this time.",
			);
		}
	}

	// 秘密鍵がない場合、did:webの解決を試みる
	const doc = await resolve(did);

	if (doc) {
		// did:webは存在するが秘密鍵がない
		console.log(`did:web resolved for ${domain}`);
		console.log("Private key not found in OS Keyring");
		console.log("\nYou need to import your existing private key.");

		sk = await importPrivateKey();

		// インポートした鍵が正しいか検証
		const keypair = await Secp256k1Keypair.import(sk);
		if (doc.didKey !== keypair.did()) {
			throw new Error("Imported private key doesn't match did:web document!");
		}

		console.log("Private key verified and saved");
	} else {
		// did:webもなく秘密鍵もない -> 新規生成
		console.log(`did:web cannot be resolved for ${domain}`);
		console.log("Private key not found in OS Keyring");
		console.log("\nGenerating new keypair...");

		const keyPair = await generate();
		sk = keyPair.sk;

		await keytar.setPassword("polka", "user", sk);

		const didDoc = generateDidDocument(domain, keyPair.did);
		console.log("\nPlease upload the following DID document to:");
		console.log(`https://${domain}/.well-known/did.json\n`);
		console.log(JSON.stringify(didDoc, null, 2));

		// アップロード確認
		await waitForDidResolution(did);
		console.log("did:web verified");
	}

	return sk;
}

async function importPrivateKey(): Promise<string> {
	const { sk } = await prompt<{ sk: string }>({
		type: "password",
		name: "sk",
		message: "Enter your private key:",
		required: true,
		result: (value) => value.trim(),
	});

	// 秘密鍵の形式を検証
	try {
		await Secp256k1Keypair.import(sk);
	} catch {
		throw new Error("Invalid private key format");
	}

	await keytar.setPassword("polka", "user", sk);
	return sk;
}

async function waitForDidResolution(did: string): Promise<void> {
	while (true) {
		await prompt({
			type: "input",
			name: "continue",
			message: "Press Enter to check (or Ctrl+C to exit)...",
		});

		const doc = await resolve(did);
		if (doc) {
			return;
		} else {
			console.log("Still not resolved. Please check the file upload.");
		}
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
