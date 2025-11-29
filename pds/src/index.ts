import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { app } from "electron";
import { pino } from "pino";
import type { Repo } from "../public/interfaces/polka-repository-repo.js";
import { repo as wasm } from "../public/repo.js";
import { getDid, setupCrypto } from "./lib/crypto.js";
import { startServer } from "./lib/server.js";

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
	const rootPath = "./store/blocks/root.txt";

	if (existsSync(rootPath)) {
		const root = readFileSync(rootPath, "utf-8");
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
	}

	const root = repo.getRoot();
	writeFileSync(rootPath, root);
	await startServer(repo, did, logger);
});
