import { WebSocketServer } from "ws";
import z from "zod";
import { PrismaClient } from "./generated/prisma/client";

const prisma = new PrismaClient();

const schema = z.object({
	did: z.string(),
	nsid: z.string(),
	rpath: z.string(),
	ptr: z.string(),
	tag: z.string(),
	sig: z.string(),
});

const port = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ port });

wss.on("connection", (ws) => {
	ws.on("message", async (msg) => {
		const parsed = schema.safeParse(JSON.parse(msg.toString()));
		if (!parsed.success) return;
		await prisma.metadata.create({
			data: {
				did: parsed.data.did,
				rpath: parsed.data.rpath,
				ptr: parsed.data.ptr,
				nsid: parsed.data.nsid,
				tag: {
					create: {
						name: parsed.data.tag,
					},
				},
				sig: parsed.data.sig,
			},
		});
	});
});

console.log(`polka Store started on portws://localhost:${port}`);
