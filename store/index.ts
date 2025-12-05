import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { zValidator } from "@hono/zod-validator";
import { config } from "dotenv";
import { Hono } from "hono";
import z from "zod";
import { PrismaClient } from "./generated/prisma/client.ts";

config();

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

app.get(
	"/ws/",
	upgradeWebSocket((_c) => ({
		onMessage: async (event, ws) => {
			try {
				const data = JSON.parse(event.data.toString());
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
			} catch {
				ws.send(JSON.stringify({ error: "server error" }));
			}
		},
	})),
);

app.get(
	"/ws/relay",
	upgradeWebSocket(() => ({
		onMessage(event, ws) {
			ws.send(event.data.toString());
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

const server = serve(app);
injectWebSocket(server);

console.log("Server started");
console.log("WebSocket: ws://localhost:3000/ws/");
console.log("HTTP: http://localhost:3000");
