import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Secp256k1Keypair } from "@atproto/crypto";
import { DB } from "@polka/db/lib";
import { config } from "dotenv";
import Enquirer from "enquirer";
import keytar from "keytar";
import { generate } from "./lib/crypto.ts";
import {
	cloneRepository,
	commitAndPush,
	existsRepository,
	POLKA_CAR_PATH,
	pullRepository,
} from "./lib/git.ts";
import { generateDidDocument, resolve } from "./lib/identity.ts";

config();
const { prompt } = Enquirer;

async function main() {
	try {
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

		// ステップ2 ドメインを解決して、既に登録されているか確認
		let isRegistered = true;
		let didKey: string = "";
		try {
			const doc = await resolve(domain);
			if (doc.didKey && doc.target) {
				console.log("Your did:web can be solved.");
				isRegistered = true;
				didKey = doc.didKey;
			} else {
				isRegistered = false;
			}
		} catch {
			isRegistered = false;
		}

		// 登録されていれば
		if (isRegistered) {
			const sk = await keytar.getPassword("polka", "user");
			if (!sk) {
				// 秘密鍵を入力
				const { inputSk } = await prompt<{ inputSk: string }>({
					type: "password",
					name: "inputSk",
					message: "Please input your sk to save OS Keyring:",
					required: true,
					result: (value) => value.trim(),
				});
				await keytar.setPassword("polka", "user", inputSk);
				console.log(`\nYour private key saved in OS Keyring.`);
			}
		} else {
			// 登録されていなければ
			console.log(`\nYour did:web cannot be resolved.`);
			console.log(
				`Please upload the file to: https://${domain}/.well-known/did.json\n`,
			);

			// 新しい鍵を生成
			const keyPair = await generate();
			didKey = keyPair.did;
			await keytar.setPassword("polka", "user", keyPair.sk);

			// didドキュメントを生成
			const doc = generateDidDocument(domain, didKey);
			console.log(JSON.stringify(doc, null, 2));
			console.log(`\nYour private key saved in OS Keyring.`);

			// ファイルをアップロードする指示を出し、解決できるまで待機
			while (true) {
				await prompt({
					type: "input",
					name: "continue",
					message: "Press Enter to check again (or Ctrl+C to exit)...",
				});

				try {
					const resolvedDoc = await resolve(domain);
					if (resolvedDoc.didKey && resolvedDoc.target) {
						console.log("Your did:web can be solved.");
						break;
					} else {
						console.log("Still not resolved. Please check the file upload.");
					}
				} catch {
					console.log("Error resolving domain. Please check settings.");
				}
			}
		}

		// メインのリモートを取得
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

		// リポジトリをクローンかpull
		if (!existsRepository()) {
			console.log("Cloning repository...");
			await cloneRepository(remoteUrl);
			console.log("Repository cloned!");
		} else {
			console.log("Pulling latest changes...");
			await pullRepository();
			console.log("Repository updated!");
		}

		const sk = await keytar.getPassword("polka", "user");
		if (!sk) throw new Error("Please save private key first.");

		// 解決出来たら、repoをinit
		const db = await init(sk);
		console.log("Repo initialized successfully!");

		const profile = await db.find("polka.profile/self");

		// プロフィールをセット
		if (!profile) {
			const name = await prompt<{ name: string }>({
				type: "input",
				name: "name",
				message: "Enter your name:",
				required: true,
				result: (value) => value.trim(),
			});

			const description = await prompt<{ description: string }>({
				type: "input",
				name: "description",
				message: "Enter your description:",
				required: true,
				result: (value) => value.trim(),
			});

			const icon = await prompt<{ icon: string }>({
				type: "input",
				name: "icon",
				message: "Enter your icon URL:",
				required: true,
				result: (value) => value.trim(),
			});

			await db.create("polka.profile/self", {
				name: name.name,
				description: description.description,
				icon: icon.icon,
				updatedAt: new Date().toISOString(),
				followsCount: 0,
			});

			// コミット
			try {
				console.log("Committing and pushing...");
				await commitAndPush();
				console.log("Committed and pushed!");
			} catch (error) {
				console.error("Failed to commit/push:", (error as Error).message);
			}

			console.log("Setup complete!");
		}
	} catch (e) {
		console.log(e);
		process.exit(1);
	}
}

// repoをinitする
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

main();
