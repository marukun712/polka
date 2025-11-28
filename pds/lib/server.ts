import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import {
	circuitRelayServer,
	circuitRelayTransport,
} from "@libp2p/circuit-relay-v2";
import { http } from "@libp2p/http";
import { fetchServer } from "@libp2p/http-server";
import { identify } from "@libp2p/identify";
import { webRTC } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createLibp2p } from "libp2p";
import type { Logger } from "pino";
import { z } from "zod";
import { getRecordSchema, getRecordsSchema } from "../@types/schema.ts";
import type { Repo } from "../dist/transpiled/interfaces/polka-repository-repo";
import { did } from "./crypto.ts";

export async function startServer(repo: Repo, logger: Logger) {
	const app = new Hono();

	app.get("/", (c) => {
		return c.text("Welcome to polka PDS!");
	});

	app.get("/health", (c) => {
		return c.json({ status: "ok" });
	});

	app.post(
		"/get",
		validator("json", (value, c) => {
			const parsed = getRecordSchema.safeParse(value);
			if (!parsed.success) {
				logger.warn(
					{
						errors: z.treeifyError(parsed.error),
					},
					"Get record schema validation failed",
				);
				return c.text("Invalid Schema!", 401);
			}

			return parsed.data;
		}),
		(c) => {
			const rpath = c.req.valid("json").rpath;

			if (!repo) {
				logger.warn(
					{
						type: "repo.not_initialized",
					},
					"Repository not initialized",
				);
				return c.json(
					{ error: "Repository not initialized. Please call /init first." },
					400,
				);
			}

			try {
				const record = repo.getRecord(rpath);
				logger.info(
					{
						type: "repo.operation.complete",
					},
					`Record retrieved: ${rpath}`,
				);
				return c.json(record);
			} catch (error) {
				logger.error(
					{
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
						errors: z.treeifyError(parsed.error),
					},
					"Get records schema validation failed",
				);
				return c.text("Invalid Schema!", 401);
			}
			return parsed.data;
		}),
		(c) => {
			const nsid = c.req.valid("json").nsid;

			if (!repo) {
				logger.warn(
					{
						type: "repo.not_initialized",
					},
					"Repository not initialized",
				);
				return c.json(
					{ error: "Repository not initialized. Please call /init first." },
					400,
				);
			}

			try {
				const record = repo.getRecords(nsid);
				logger.info(
					{
						type: "repo.operation.complete",
					},
					`Records retrieved: ${nsid}`,
				);
				return c.json(record);
			} catch (error) {
				logger.error(
					{
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
		transports: [webRTC(), webSockets(), circuitRelayTransport()],
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
}
