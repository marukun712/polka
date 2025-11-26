import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { http } from "@libp2p/http";
import { fetchServer } from "@libp2p/http-server";
import { webSockets } from "@libp2p/websockets";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createLibp2p } from "libp2p";
import {
	createRecordSchema,
	deleteRecordSchema,
	getRecordSchema,
	initRepoSchema,
	updateRecordSchema,
} from "./@types/schema.ts";
import { repo } from "./dist/transpiled/repo.js";

const did = "did:key:z6MkvPRJTeguSbG1cNKn1S3zgYKnu5asvwWgceHLvxZbZakf";

const instance = repo.createRepo();
const builder = instance.new(did);

const app = new Hono();
app.get("/", (c) => {
	return c.text("Welcome to polka PDS!");
});

app.get("/health", (c) => {
	return c.json({ status: "ok" });
});

app.get(
	"/init",
	validator("query", (value, c) => {
		const parsed = initRepoSchema.safeParse(value);
		if (!parsed.success) {
			return c.text("Invalid Schema!", 401);
		}
		return parsed.data;
	}),
	(c) => {
		const sig = c.req.valid("query").sig;
		try {
			if (sig) {
				const success = builder.finalize(sig);
				return c.json({ success });
			} else {
				const bytes = builder.getBytes();
				return c.json({ bytes });
			}
		} catch (error) {
			return c.json({ error: String(error) }, 500);
		}
	},
);

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
		try {
			const record = instance.getRecord(rpath);
			return c.json(record);
		} catch (error) {
			return c.json({ error: String(error) }, 500);
		}
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
		const sig = c.req.valid("json").sig;

		try {
			if (sig) {
				const success = instance.createCommit(nsid, body, sig);
				return c.json({ success });
			} else {
				const bytes = instance.createStage(nsid, body);
				return c.json({ bytes });
			}
		} catch (error) {
			return c.json({ error: String(error) }, 500);
		}
	},
);

app.put(
	"/record",
	validator("json", (value, c) => {
		const parsed = updateRecordSchema.safeParse(value);
		if (!parsed.success) {
			return c.text("Invalid Schema!", 401);
		}
		return parsed.data;
	}),
	(c) => {
		const rpath = c.req.valid("json").rpath;
		const body = c.req.valid("json").body;
		const sig = c.req.valid("json").sig;

		try {
			if (sig) {
				const success = instance.updateCommit(rpath, body, sig);
				return c.json({ success });
			} else {
				const bytes = instance.updateStage(rpath, body);
				return c.json({ bytes });
			}
		} catch (error) {
			return c.json({ error: String(error) }, 500);
		}
	},
);

app.delete(
	"/record",
	validator("json", (value, c) => {
		const parsed = deleteRecordSchema.safeParse(value);
		if (!parsed.success) {
			return c.text("Invalid Schema!", 401);
		}
		return parsed.data;
	}),
	(c) => {
		const rpath = c.req.valid("json").rpath;
		const sig = c.req.valid("json").sig;

		try {
			if (sig) {
				const success = instance.deleteCommit(rpath, sig);
				return c.json({ success });
			} else {
				const bytes = instance.deleteStage(rpath);
				return c.json({ bytes });
			}
		} catch (error) {
			return c.json({ error: String(error) }, 500);
		}
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
