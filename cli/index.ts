import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { now } from "@atcute/tid";
import { WASIShim } from "@bytecodealliance/preview2-shim/instantiation";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { config } from "dotenv";
import Enquirer from "enquirer";
import { CID } from "multiformats";
import type {
	GetResult,
	Repo,
} from "./dist/transpiled/interfaces/polka-repository-repo.js";
import { instantiate } from "./dist/transpiled/repo.js";
import { CarSyncStore } from "./lib/blockstore.ts";
import { generate } from "./lib/crypto.ts";
import {
	cloneRepository,
	commitAndPush,
	existsRepository,
	generateCommitMessage,
	POLKA_CAR_PATH,
	POLKA_REPO_PATH,
	pullRepository,
} from "./lib/git.ts";
import { generateDidDocument, resolve } from "./lib/identity.ts";

config();

const { prompt } = Enquirer;

let repo: Repo;
let store: CarSyncStore;

const ws = new WebSocket("ws://localhost:8000/ws/");

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
		let didKey = "";
		let sk = "";
		let isRegistered = false;

		try {
			const doc = await resolve(domain);
			if (doc.didKey && doc.target) {
				console.log("Your did:web can be solved.");
				didKey = doc.didKey;
				isRegistered = true;
			}
		} catch {}

		// 登録されていれば
		if (isRegistered) {
			// 秘密鍵を入力
			const { inputSk } = await prompt<{ inputSk: string }>({
				type: "password",
				name: "inputSk",
				message: "Please input your sk:",
				required: true,
				result: (value) => value.trim(),
			});
			sk = inputSk;
		} else {
			// 登録されていなければ
			console.log(`\nYour did:web cannot be resolved.`);
			console.log(
				`Please upload the file to: https://${domain}/.well-known/did.json\n`,
			);

			// 新しい鍵を生成
			const keyPair = await generate();
			didKey = keyPair.did;
			sk = keyPair.sk;

			// didドキュメントを生成
			const doc = generateDidDocument(domain, didKey);
			console.log(JSON.stringify(doc, null, 2));
			console.log(`\nYour private key is:\n${sk}\n\nPlease keep it safe.`);

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
		if (!existsRepository(POLKA_REPO_PATH)) {
			console.log("Cloning repository...");
			await cloneRepository(remoteUrl);
			console.log("Repository cloned!");
		} else {
			console.log("Pulling latest changes...");
			await pullRepository();
			console.log("Repository updated!");
		}

		// 解決出来たら、repoをinit
		repo = await init(sk, didKey);
		console.log("Repo initialized successfully!");
		console.log(repo.allRecords());

		let profile: GetResult | null = null;

		try {
			profile = repo.getRecord("polka.profile/self");
		} catch {}

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

			const data = JSON.stringify({
				name: name.name,
				description: description.description,
				icon: icon.icon,
			});
			repo.create("polka.profile/self", data);
			const root = repo.getRoot();
			store.updateHeaderRoots([CID.parse(root)]);

			// コミット
			try {
				const commitMessage = generateCommitMessage();
				console.log("Committing and pushing...");
				await commitAndPush(commitMessage);
				console.log("Committed and pushed!");
			} catch (error) {
				console.error("Failed to commit/push:", (error as Error).message);
			}
		}

		// メッセージを送信する
		while (true) {
			const { text } = await prompt<{ text: string }>({
				type: "input",
				name: "text",
				message: "Enter your post:",
				required: true,
				result: (value) => value.trim(),
			});

			const nsid = "polka.post";
			const rpath = `${nsid}/${now()}`;
			const data = JSON.stringify({ content: text });

			// repoに保存
			console.log(rpath, data);
			repo.create(rpath, data);
			const root = repo.getRoot();
			store.updateHeaderRoots([CID.parse(root)]);

			const { tag } = await prompt<{ tag: string }>({
				type: "input",
				name: "tag",
				message: "Enter tag:",
				required: false,
				result: (value) => value.trim(),
			});

			// wsに広告
			const ad = {
				did: `did:web:${domain}`,
				nsid: nsid,
				rpath: rpath,
				ptr: null,
				tag: tag ? [tag] : [],
			};

			// 署名する
			const adBytes = new TextEncoder().encode(JSON.stringify(ad));
			const sig = secp256k1.sign(adBytes, hexToBytes(sk));
			const adSigned = {
				...ad,
				sig: bytesToHex(sig),
			};

			// 広告をwsに送る
			ws.send(JSON.stringify(adSigned));

			// コミット
			try {
				const commitMessage = generateCommitMessage();
				console.log("Committing and pushing...");
				await commitAndPush(commitMessage);
				console.log("Committed and pushed!");
			} catch (error) {
				console.error("Failed to commit/push:", (error as Error).message);
			}
		}
	} catch (e) {
		console.log(e);
		process.exit(1);
	}
}

// repoをinitする
async function init(sk: string, didKey: string) {
	// ~/.polkaがあるか確認
	if (!existsSync(join(homedir(), ".polka"))) {
		mkdirSync(join(homedir(), ".polka"));
	}

	const path = POLKA_CAR_PATH;
	store = new CarSyncStore(path);

	// WASMのロード
	const loader = async (path: string) => {
		const buf = readFileSync(`./dist/transpiled/${path}`);
		return await WebAssembly.compile(new Uint8Array(buf));
	};

	// importする関数をバインド
	const wasm = await instantiate(loader, {
		//@ts-expect-error
		"polka:repository/crypto": {
			sign: (bytes: Uint8Array) => {
				const skBytes = hexToBytes(sk);
				const sig = secp256k1.sign(bytes, skBytes);
				return sig;
			},
		},
		"polka:repository/blockstore": {
			readBlock: (cid: Uint8Array) => {
				const parsed = CID.decode(cid);
				const out: Uint8Array[] = [];
				store.readBlock(parsed, out);
				if (!out[0]) throw new Error("Block not found.");
				return out[0];
			},
			writeBlock: (codec: bigint, hash: bigint, contents: Uint8Array) => {
				return store.writeBlock(Number(codec), Number(hash), contents);
			},
		},
		...new WASIShim().getImportObject<"0.2.6">(),
	});

	// repoを開く
	if (existsSync(path)) {
		store.updateIndex();
		const roots = store.getRoots();
		if (!roots[0]) throw new Error("Root not found.");
		return wasm.repo.open(didKey, roots[0].toString());
	} else {
		store.create();
		const repo = wasm.repo.create(didKey);
		const root = repo.getRoot();
		store.updateHeaderRoots([CID.parse(root)]);
		return repo;
	}
}

main();
