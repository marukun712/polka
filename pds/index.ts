import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { http } from "@libp2p/http";
import { fetchServer } from "@libp2p/http-server";
import { identify } from "@libp2p/identify";
import { webSockets } from "@libp2p/websockets";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createLibp2p } from "libp2p";
import { pino } from "pino";
import { z } from "zod";
import {
	createRecordSchema,
	deleteRecordSchema,
	getRecordSchema,
	getRecordsSchema,
	updateRecordSchema,
} from "./@types/schema.ts";
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

app.post(
	"/record",
	validator("json", (value, c) => {
		const parsed = createRecordSchema.safeParse(value);
		if (!parsed.success) {
			logger.warn(
				{
					endpoint: "/record",
					method: "POST",
					validationType: "json",
					errors: z.treeifyError(parsed.error),
					receivedData: value,
					type: "validation.failed",
				},
				"Create record schema validation failed",
			);
			return c.text("Invalid Schema!", 401);
		}

		logger.debug(
			{
				endpoint: "/record",
				method: "POST",
				validationType: "json",
				type: "validation.success",
			},
			"Create record schema validation successful",
		);

		return parsed.data;
	}),
	(c) => {
		const nsid = c.req.valid("json").nsid;
		const body = c.req.valid("json").body;

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
			const success = repo.create(nsid, body);

			logger.info(
				{
					operation: "record.create",
					did,
					nsid,
					success,
					type: "repo.operation.complete",
				},
				`Record commit ${success ? "succeeded" : "failed"}: ${nsid}`,
			);

			return c.json({ success });
		} catch (error) {
			logger.error(
				{
					operation: "record.create",
					did,
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
				`Failed to create record ${nsid}: ${error instanceof Error ? error.message : String(error)}`,
			);

			return c.json({ error: String(error) }, 500);
		}
	},
);

app.put(
	"/record",
	validator("json", (value, c) => {
		const parsed = updateRecordSchema.safeParse(value);
		if (!parsed.success) {
			logger.warn(
				{
					endpoint: "/record",
					method: "PUT",
					validationType: "json",
					errors: z.treeifyError(parsed.error),
					receivedData: value,
					type: "validation.failed",
				},
				"Update record schema validation failed",
			);
			return c.text("Invalid Schema!", 401);
		}

		logger.debug(
			{
				endpoint: "/record",
				method: "PUT",
				validationType: "json",
				type: "validation.success",
			},
			"Update record schema validation successful",
		);

		return parsed.data;
	}),
	(c) => {
		const rpath = c.req.valid("json").rpath;
		const body = c.req.valid("json").body;

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
					operation: "record.update",
					did,
					rpath,
					hasSig: true,
					bodyLength: body.length,
					type: "repo.operation",
				},
				`Updating record commit: ${rpath} for ${did}`,
			);

			const success = repo.update(rpath, body);

			logger.info(
				{
					operation: "record.update",
					did,
					rpath,
					success,
					type: "repo.operation.complete",
				},
				`Record update ${success ? "succeeded" : "failed"}: ${rpath}`,
			);

			return c.json({ success });
		} catch (error) {
			logger.error(
				{
					operation: "record.update",
					did,
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
				`Failed to update record ${rpath}: ${error instanceof Error ? error.message : String(error)}`,
			);

			return c.json({ error: String(error) }, 500);
		}
	},
);

app.delete(
	"/record",
	validator("json", (value, c) => {
		const parsed = deleteRecordSchema.safeParse(value);
		if (!parsed.success) {
			logger.warn(
				{
					endpoint: "/record",
					method: "DELETE",
					validationType: "json",
					errors: z.treeifyError(parsed.error),
					receivedData: value,
					type: "validation.failed",
				},
				"Delete record schema validation failed",
			);
			return c.text("Invalid Schema!", 401);
		}

		logger.debug(
			{
				endpoint: "/record",
				method: "DELETE",
				validationType: "json",
				type: "validation.success",
			},
			"Delete record schema validation successful",
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
					operation: "record.delete",
					did,
					rpath,
					hasSig: true,
					type: "repo.operation",
				},
				`Deleting record commit: ${rpath} for ${did}`,
			);

			const success = repo.delete(rpath);

			logger.info(
				{
					operation: "record.delete",
					did,
					rpath,
					success,
					type: "repo.operation.complete",
				},
				`Record deletion ${success ? "succeeded" : "failed"}: ${rpath}`,
			);

			return c.json({ success });
		} catch (error) {
			logger.error(
				{
					operation: "record.delete",
					did,
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
				`Failed to delete record ${rpath}: ${error instanceof Error ? error.message : String(error)}`,
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
