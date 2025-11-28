import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { circuitRelayServer } from "@libp2p/circuit-relay-v2";
import { http } from "@libp2p/http";
import { fetchServer } from "@libp2p/http-server";
import { identify } from "@libp2p/identify";
import { webSockets } from "@libp2p/websockets";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createLibp2p } from "libp2p";
import { pino } from "pino";
import { z } from "zod";
import { getRecordSchema, getRecordsSchema } from "./@types/schema.ts";
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

logger.info(
	{
		type: "repo.initialized",
		did,
	},
	"Repo created",
);

const app = new Hono();

app.get("/", (c) => {
	logger.debug(
		{ endpoint: "/", type: "request.root" },
		"Root endpoint accessed",
	);
	return c.text("Welcome to polka PDS!");
});

app.get("/health", (c) => {
	logger.debug({ endpoint: "/health", type: "request.health" }, "Health check");
	return c.json({ status: "ok" });
});

app.post(
	"/get",
	validator("json", (value, c) => {
		const parsed = getRecordSchema.safeParse(value);
		if (!parsed.success) {
			logger.warn(
				{
					endpoint: "/record",
					method: "GET",
					validationType: "json",
					errors: z.treeifyError(parsed.error),
					receivedData: value,
					type: "validation.failed",
				},
				"Get record schema validation failed",
			);
			return c.text("Invalid Schema!", 401);
		}

		logger.debug(
			{
				endpoint: "/record",
				method: "GET",
				validationType: "json",
				type: "validation.success",
			},
			"Get record schema validation successful",
		);

		return parsed.data;
	}),
	(c) => {
		const rpath = c.req.valid("json").rpath;

		if (!repo) {
			logger.warn(
				{
					type: "repo.not_initialized",
					endpoint: c.req.path,
					method: c.req.method,
				},
				"Repository not initialized",
			);
			return c.json(
				{ error: "Repository not initialized. Please call /init first." },
				400,
			);
		}

		try {
			logger.info(
				{
					operation: "record.get",
					rpath,
					type: "repo.operation",
				},
				`Retrieving record: ${rpath}`,
			);

			const record = repo.getRecord(rpath);

			logger.info(
				{
					operation: "record.get",
					rpath,
					recordExists: !!record,
					type: "repo.operation.complete",
				},
				`Record retrieved: ${rpath}`,
			);

			return c.json(record);
		} catch (error) {
			logger.error(
				{
					operation: "record.get",
					rpath,
					error:
						error instanceof Error
							? {
									message: error.message,
									stack: error.stack,
									name: error.name,
								}
							: error,
					type: "repo.operation.error",
				},
				`Failed to get record ${rpath}: ${error instanceof Error ? error.message : String(error)}`,
			);

			return c.json({ error: String(error) }, 500);
		}
	},
);

app.post(
	"/records",
	validator("json", (value, c) => {
		const parsed = getRecordsSchema.safeParse(value);
		if (!parsed.success) {
			logger.warn(
				{
					endpoint: "/records",
					method: "GET",
					validationType: "json",
					errors: z.treeifyError(parsed.error),
					receivedData: value,
					type: "validation.failed",
				},
				"Get records schema validation failed",
			);
			return c.text("Invalid Schema!", 401);
		}

		logger.debug(
			{
				endpoint: "/records",
				method: "GET",
				validationType: "json",
				type: "validation.success",
			},
			"Get records schema validation successful",
		);

		return parsed.data;
	}),
	(c) => {
		const nsid = c.req.valid("json").nsid;

		if (!repo) {
			logger.warn(
				{
					type: "repo.not_initialized",
					endpoint: c.req.path,
					method: c.req.method,
				},
				"Repository not initialized",
			);
			return c.json(
				{ error: "Repository not initialized. Please call /init first." },
				400,
			);
		}

		try {
			logger.info(
				{
					operation: "records.get",
					nsid,
					type: "repo.operation",
				},
				`Getting list of record for: ${nsid}`,
			);

			const record = repo.getRecords(nsid);

			logger.info(
				{
					operation: "records.get",
					nsid,
					recordExists: !!record,
					type: "repo.operation.complete",
				},
				`Records retrieved: ${nsid}`,
			);

			return c.json(record);
		} catch (error) {
			logger.error(
				{
					operation: "record.gets",
					nsid,
					error:
						error instanceof Error
							? {
									message: error.message,
									stack: error.stack,
									name: error.name,
								}
							: error,
					type: "repo.operation.error",
				},
				`Failed to get records ${nsid}: ${error instanceof Error ? error.message : String(error)}`,
			);

			return c.json({ error: String(error) }, 500);
		}
	},
);

const server = await createLibp2p({
	addresses: {
		listen: ["/ip4/0.0.0.0/tcp/8000/ws"],
	},
	transports: [webSockets()],
	connectionEncrypters: [noise()],
	streamMuxers: [yamux()],
	services: {
		identify: identify(),
		http: http({
			//@ts-expect-error
			server: fetchServer(app.fetch),
		}),
		circuitRelay: circuitRelayServer(),
	},
});

await server.start();

const multiaddrs = server.getMultiaddrs().map((ma) => ma.toString());
logger.info(
	{
		type: "server.started",
		multiaddrs,
		did,
		repoInitialized: true,
	},
	`PDS server started on: ${multiaddrs.join(", ")}`,
);
