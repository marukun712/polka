import * as TID from "@atcute/tid";
import { app } from "electron";
import { pino } from "pino";
import type { Repo } from "../public/interfaces/polka-repository-repo.js";
import { repo as wasm } from "../public/repo.js";
import { store } from "./lib/blockstore.js";
import { getDid, setupCrypto } from "./lib/crypto.js";

app.whenReady().then(async () => {
	const logger = pino({
		level: process.env.LOG_LEVEL || "info",
		transport:
			process.env.NODE_ENV === "production"
				? undefined
				: {
						target: "pino-pretty",
					},
	});

	await setupCrypto();
	const did = await getDid();

	let repo: Repo;
	const root = store.getRoots()[0]?.toString();
	console.log(root);
	if (root) {
		repo = wasm.open(did, root);
	} else {
		logger.info(
			{
				type: "repo.initializing",
				did,
			},
			`Initializing repository for DID: ${did}`,
		);
		repo = wasm.create(did);
		repo.create(
			"polka.profile/self",
			JSON.stringify({
				version: 0.1,
				name: "alice",
				icon: "https://images.goodsmile.info/cgm/images/product/20150729/5151/34832/large/670a8dc4945a19eb616ea7575abe5e95.jpg",
				description: "hello world",
			}),
		);
		repo.create(
			`polka.post/${TID.now()}`,
			JSON.stringify({
				version: 0.1,
				content: "hello world",
			}),
		);
		repo.create(
			`polka.post/${TID.now()}`,
			JSON.stringify({
				version: 0.1,
				content: "test",
			}),
		);
		repo.create(
			`polka.blog/${TID.now()}`,
			JSON.stringify({
				version: 0.1,
				content: `
        # テスト投稿
        - テスト
        - テスト 
        - テスト
        
        ## 見出し2
        ### 見出し3
        `,
			}),
		);
	}

	console.log(repo.allRecords());
	console.log(repo.getRoot());
});
