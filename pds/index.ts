import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pino } from "pino";
import type { Repo } from "./dist/transpiled/interfaces/polka-repository-repo";
import { repo as wasm } from "./dist/transpiled/repo.js";
import { did } from "./lib/crypto.ts";

const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	transport:
		process.env.NODE_ENV === "production"
			? undefined
			: {
					target: "pino-pretty",
				},
});

logger.info(
	{
		type: "repo.initializing",
		did,
	},
	`Initializing repository for DID: ${did}`,
);

let repo: Repo;
const rootPath = "./store/blocks/root.txt";

if (existsSync(rootPath)) {
	const root = readFileSync(rootPath, "utf-8");
	repo = wasm.open(did, root);
} else {
	repo = wasm.create(did);
}

const cid = repo.create(
	"polka.post",
	JSON.stringify({
		content: "秘密鍵の無断使用は、罰金バッキンガムよ!",
	}),
);

const root = repo.getRoot();
writeFileSync(rootPath, root);

const record = repo.getRecords("polka.post");
console.log(record, cid);
