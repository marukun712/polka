import { pino } from "pino";
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

const repo = wasm.create(did);

repo.create(
	"polka.post",
	JSON.stringify({
		content: "秘密鍵の無断使用は、罰金バッキンガムよ!",
	}),
);
const record = repo.getRecords("polka.post");
console.log(record);
