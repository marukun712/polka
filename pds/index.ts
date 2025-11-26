import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { http } from "@libp2p/http";
import { fetchServer } from "@libp2p/http-server";
import { webSockets } from "@libp2p/websockets";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createLibp2p } from "libp2p";
import {
	commitSchema,
	createRecordSchema,
	getRecordSchema,
} from "./@types/schema.ts";
import { repo } from "./dist/transpiled/repo.js";

const did = "did:key:z6MkvPRJTeguSbG1cNKn1S3zgYKnu5asvwWgceHLvxZbZakf";

const app = new Hono();
app.get("/", (c) => {
	return c.text("Welcome to polka PDS!");
});

app.get("/health", (c) => {
	return c.json({ status: "ok" });
});

app.get("/unsigned", (c) => {
	return c.json(repo.getUnsigned());
});

app.get(
	"/record",
	validator("query", (value, c) => {
		const parsed = getRecordSchema.safeParse(value);
		if (!parsed.success) {
			return c.text("Invalid Schema!", 401);
		}
		return parsed.data;
	}),
	(c) => {
		const rpath = c.req.valid("query").rpath;
		const record = repo.getRecord(rpath);
		return c.json(record);
	},
);

app.post(
	"/record",
	validator("json", (value, c) => {
		const parsed = createRecordSchema.safeParse(value);
		if (!parsed.success) {
			return c.text("Invalid Schema!", 401);
		}
		return parsed.data;
	}),
	(c) => {
		const nsid = c.req.valid("json").nsid;
		const body = c.req.valid("json").body;
		const success = repo.createRecord(nsid, body);
		return c.json(success);
	},
);

app.put(
	"/record",
	validator("json", (value, c) => {
		const parsed = createRecordSchema.safeParse(value);
		if (!parsed.success) {
			return c.text("Invalid Schema!", 401);
		}
		return parsed.data;
	}),
	(c) => {
		const nsid = c.req.valid("json").nsid;
		const body = c.req.valid("json").body;
		const success = repo.updateRecord(nsid, body);
		return c.json(success);
	},
);

app.delete(
	"/record",
	validator("json", (value, c) => {
		const parsed = getRecordSchema.safeParse(value);
		if (!parsed.success) {
			return c.text("Invalid Schema!", 401);
		}
		return parsed.data;
	}),
	(c) => {
		const rpath = c.req.valid("json").rpath;
		const success = repo.deleteRecord(rpath);
		return c.json(success);
	},
);

app.delete(
	"/commit",
	validator("json", (value, c) => {
		const parsed = commitSchema.safeParse(value);
		if (!parsed.success) {
			return c.text("Invalid Schema!", 401);
		}
		return parsed.data;
	}),
	(c) => {
		const sig = c.req.valid("json").sig;
		const payload = c.req.valid("json").payload;
		const success = repo.commit(payload, sig);
		return c.json(success);
	},
);

const server = await createLibp2p({
	addresses: {
		listen: ["/ip4/0.0.0.0/tcp/0/ws"],
	},
	transports: [webSockets()],
	connectionEncrypters: [noise()],
	streamMuxers: [yamux()],
	services: {
		http: http({
			//@ts-expect-error
			server: fetchServer(app.fetch),
		}),
	},
});

await server.start();
console.log(
	"PDS server started:",
	server.getMultiaddrs().map((addr) => addr.toString()),
);
