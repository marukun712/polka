import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { zValidator } from "@hono/zod-validator";
import { config } from "dotenv";
import { Hono } from "hono";
import type { WSContext } from "hono/ws";
import WebSocket from "ws";
import z from "zod";
import { PrismaClient } from "./generated/prisma/client.ts";

config();

const port = Number(process.env.PORT) || 8000;

const prisma = new PrismaClient();

const adSchema = z.object({
	did: z.string(),
	nsid: z.string(),
	rpath: z.string(),
	sig: z.string(),
	tag: z.array(z.string()),
	ptr: z.string().nullable().optional(),
});

const app = new Hono();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

const relayClients: Set<WSContext<WebSocket>> = new Set();

app.get("/", (c) => c.text("This is polka store server."));

app.get(
	"/ws/",
	upgradeWebSocket(() => ({
		onMessage: async (event, ws) => {
			try {
				const data = JSON.parse(event.data.toString());
				console.log("Received on /ws/:", data);
				const parsed = adSchema.safeParse(data);
				if (!parsed.success) {
					ws.send(JSON.stringify({ error: "invalid payload" }));
					return;
				}

				const d = parsed.data;
				await prisma.metadata.create({
					data: {
						did: d.did,
						rpath: d.rpath,
						ptr: d.ptr,
						nsid: d.nsid,
						sig: d.sig,
						tag: {
							connectOrCreate: d.tag.map((t) => ({
								where: { name: t },
								create: { name: t },
							})),
						},
					},
				});

				ws.send(JSON.stringify({ status: "ok" }));

				relayClients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify(d));
					}
				});
			} catch (err) {
				console.error(err);
				ws.send(JSON.stringify({ error: "server error" }));
			}
		},
	})),
);

app.get(
	"/ws/relay",
	upgradeWebSocket(() => ({
		onOpen(_, ws) {
			relayClients.add(ws);
		},
		onClose(_, ws) {
			relayClients.delete(ws);
		},
	})),
);

app.get(
	"/metadata/by-did",
	zValidator(
		"query",
		z.object({
			did: z.string(),
		}),
	),
	async (c) => {
		const { did } = c.req.valid("query");
		const rows = await prisma.metadata.findMany({
			where: { did },
			include: { tag: true },
		});
		return c.json(rows);
	},
);

app.get(
	"/metadata/by-tag",
	zValidator(
		"query",
		z.object({
			tag: z.string(),
		}),
	),
	async (c) => {
		const { tag } = c.req.valid("query");
		const rows = await prisma.metadata.findMany({
			where: {
				tag: {
					some: { name: tag },
				},
			},
			include: { tag: true },
		});
		return c.json(rows);
	},
);

app.get(
	"/metadata/filter",
	zValidator(
		"query",
		z.object({
			nsid: z.string().optional(),
			rpath: z.string().optional(),
		}),
	),
	async (c) => {
		const { nsid, rpath } = c.req.valid("query");

		const rows = await prisma.metadata.findMany({
			where: {
				...(nsid ? { nsid } : {}),
				...(rpath ? { rpath } : {}),
			},
			include: { tag: true },
		});
		return c.json(rows);
	},
);

const server = serve({ fetch: app.fetch, port });
injectWebSocket(server);

console.log("Server started");
console.log(`WebSocket: ws://localhost:${port}/ws/`);
console.log(`HTTP: http://localhost:${port}`);
