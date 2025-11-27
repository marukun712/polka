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
	initRepoSchema,
	updateRecordSchema,
} from "./@types/schema.ts";
import { repo } from "./dist/transpiled/repo.js";

const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	transport:
		process.env.NODE_ENV === "production"
			? undefined
			: {
					target: "pino-pretty",
				},
});

const did = "did:key:z6MkvPRJTeguSbG1cNKn1S3zgYKnu5asvwWgceHLvxZbZakf";

logger.info(
	{
		type: "repo.initializing",
		did,
	},
	`Initializing repository for DID: ${did}`,
);

const instance = repo.createRepo();
const builder = instance.new(did);

logger.info(
	{
		type: "repo.initialized",
		did,
	},
	"Repository instance created",
);

const app = new Hono();

app.get("/", (c) => {
	logger.debug(
		{ endpoint: "/", type: "request.simple" },
		"Root endpoint accessed",
	);
	return c.text("Welcome to polka PDS!");
});

app.get("/health", (c) => {
	logger.debug({ endpoint: "/health", type: "request.simple" }, "Health check");
	return c.json({ status: "ok" });
});

app.post(
	"/init",
	validator("json", (value, c) => {
		const parsed = initRepoSchema.safeParse(value);
		if (!parsed.success) {
			logger.warn(
				{
					endpoint: "/init",
					method: "GET",
					validationType: "query",
					errors: z.treeifyError(parsed.error),
					receivedData: value,
					type: "validation.failed",
				},
				"Init schema validation failed",
			);
			return c.text("Invalid Schema!", 401);
		}

		logger.debug(
			{
				endpoint: "/init",
				method: "GET",
				validationType: "query",
				type: "validation.success",
			},
			"Init schema validation successful",
		);

		return parsed.data;
	}),
	(c) => {
		const sig = c.req.valid("json").sig;
		try {
			if (sig) {
				logger.info(
					{
						operation: "repo.finalize",
						hasSig: true,
						type: "repo.operation",
					},
					"Finalizing repository initialization",
				);

				const success = builder.finalize(sig);

				logger.info(
					{
						operation: "repo.finalize",
						success,
						type: "repo.operation.complete",
					},
					`Repository finalization ${success ? "succeeded" : "failed"}`,
				);

				return c.json({ success });
			} else {
				logger.debug(
					{
						operation: "repo.getBytes",
						type: "repo.operation",
					},
					"Getting bytes for repository initialization",
				);

				const bytes = builder.getBytes();

				logger.debug(
					{
						operation: "repo.getBytes",
						bytesLength: bytes.length,
						type: "repo.operation.complete",
					},
					"Retrieved bytes for signing",
				);

				return c.json({ bytes });
			}
		} catch (error) {
			logger.error(
				{
					operation: "repo.init",
					hasSig: !!sig,
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
				`Repository initialization failed: ${error instanceof Error ? error.message : String(error)}`,
			);

			return c.json({ error: String(error) }, 500);
		}
	},
);

app.get(
	"/record",
	validator("query", (value, c) => {
		const parsed = getRecordSchema.safeParse(value);
		if (!parsed.success) {
			logger.warn(
				{
					endpoint: "/record",
					method: "GET",
					validationType: "query",
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
				validationType: "query",
				type: "validation.success",
			},
			"Get record schema validation successful",
		);

		return parsed.data;
	}),
	(c) => {
		const rpath = c.req.valid("query").rpath;
		try {
			logger.info(
				{
					operation: "record.get",
					rpath,
					type: "repo.operation",
				},
				`Retrieving record: ${rpath}`,
			);

			const record = instance.getRecord(rpath);

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
		const sig = c.req.valid("json").sig;

		try {
			if (sig) {
				logger.info(
					{
						operation: "record.createCommit",
						did,
						nsid,
						hasSig: true,
						bodyLength: body.length,
						type: "repo.operation",
					},
					`Creating record commit: ${nsid} for ${did}`,
				);

				const success = instance.createCommit(nsid, body, sig);

				logger.info(
					{
						operation: "record.createCommit",
						did,
						nsid,
						success,
						type: "repo.operation.complete",
					},
					`Record commit ${success ? "succeeded" : "failed"}: ${nsid}`,
				);

				return c.json({ success });
			} else {
				logger.debug(
					{
						operation: "record.createStage",
						nsid,
						bodyLength: body.length,
						type: "repo.operation",
					},
					`Creating record stage: ${nsid}`,
				);

				const bytes = instance.createStage(nsid, body);

				logger.debug(
					{
						operation: "record.createStage",
						nsid,
						bytesLength: bytes.length,
						type: "repo.operation.complete",
					},
					`Record stage created: ${nsid}`,
				);

				return c.json({ bytes });
			}
		} catch (error) {
			logger.error(
				{
					operation: sig ? "record.createCommit" : "record.createStage",
					did,
					nsid,
					hasSig: !!sig,
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
		const sig = c.req.valid("json").sig;

		try {
			if (sig) {
				logger.info(
					{
						operation: "record.updateCommit",
						did,
						rpath,
						hasSig: true,
						bodyLength: body.length,
						type: "repo.operation",
					},
					`Updating record commit: ${rpath} for ${did}`,
				);

				const success = instance.updateCommit(rpath, body, sig);

				logger.info(
					{
						operation: "record.updateCommit",
						did,
						rpath,
						success,
						type: "repo.operation.complete",
					},
					`Record update ${success ? "succeeded" : "failed"}: ${rpath}`,
				);

				return c.json({ success });
			} else {
				logger.debug(
					{
						operation: "record.updateStage",
						rpath,
						bodyLength: body.length,
						type: "repo.operation",
					},
					`Creating update stage: ${rpath}`,
				);

				const bytes = instance.updateStage(rpath, body);

				logger.debug(
					{
						operation: "record.updateStage",
						rpath,
						bytesLength: bytes.length,
						type: "repo.operation.complete",
					},
					`Update stage created: ${rpath}`,
				);

				return c.json({ bytes });
			}
		} catch (error) {
			logger.error(
				{
					operation: sig ? "record.updateCommit" : "record.updateStage",
					did,
					rpath,
					hasSig: !!sig,
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
		const sig = c.req.valid("json").sig;

		try {
			if (sig) {
				logger.info(
					{
						operation: "record.deleteCommit",
						did,
						rpath,
						hasSig: true,
						type: "repo.operation",
					},
					`Deleting record commit: ${rpath} for ${did}`,
				);

				const success = instance.deleteCommit(rpath, sig);

				logger.info(
					{
						operation: "record.deleteCommit",
						did,
						rpath,
						success,
						type: "repo.operation.complete",
					},
					`Record deletion ${success ? "succeeded" : "failed"}: ${rpath}`,
				);

				return c.json({ success });
			} else {
				logger.debug(
					{
						operation: "record.deleteStage",
						rpath,
						type: "repo.operation",
					},
					`Creating delete stage: ${rpath}`,
				);

				const bytes = instance.deleteStage(rpath);

				logger.debug(
					{
						operation: "record.deleteStage",
						rpath,
						bytesLength: bytes.length,
						type: "repo.operation.complete",
					},
					`Delete stage created: ${rpath}`,
				);

				return c.json({ bytes });
			}
		} catch (error) {
			logger.error(
				{
					operation: sig ? "record.deleteCommit" : "record.deleteStage",
					did,
					rpath,
					hasSig: !!sig,
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

server.addEventListener("peer:connect", (evt) => {
	logger.info(
		{
			type: "libp2p.peer.connect",
			peerId: evt.detail.toString(),
		},
		`Peer connected: ${evt.detail.toString()}`,
	);
});

server.addEventListener("peer:disconnect", (evt) => {
	logger.info(
		{
			type: "libp2p.peer.disconnect",
			peerId: evt.detail.toString(),
		},
		`Peer disconnected: ${evt.detail.toString()}`,
	);
});

server.addEventListener("connection:open", (evt) => {
	logger.debug(
		{
			type: "libp2p.connection.open",
			remotePeer: evt.detail.remotePeer.toString(),
			direction: evt.detail.direction,
		},
		`Connection opened: ${evt.detail.direction} from ${evt.detail.remotePeer.toString()}`,
	);
});

server.addEventListener("connection:close", (evt) => {
	logger.debug(
		{
			type: "libp2p.connection.close",
			remotePeer: evt.detail.remotePeer.toString(),
		},
		`Connection closed from ${evt.detail.remotePeer.toString()}`,
	);
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
