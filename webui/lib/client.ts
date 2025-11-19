import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { type HTTP, http } from "@libp2p/http";
import { webSockets } from "@libp2p/websockets";
import { multiaddr } from "@multiformats/multiaddr";
import { createLibp2p, type Libp2p } from "libp2p";

export class Client {
	private node!: Libp2p<{ http: HTTP }>;
	private addr: string;

	constructor(addr: string, node?: Libp2p<{ http: HTTP }>) {
		if (node) {
			this.node = node;
		}
		this.addr = addr;
	}

	public static async create(addr: string) {
		const node = await createLibp2p({
			transports: [webSockets()],
			connectionEncrypters: [noise()],
			streamMuxers: [yamux()],
			services: { http: http() },
		});

		await node.start();
		console.log("Libp2p node started");

		try {
			console.log("Dialing PDS server at:", addr);
			await node.dial(multiaddr(addr));
			console.log("Connected to server");
			console.log("Server multiaddrs:", node.getMultiaddrs());
		} catch (err) {
			console.error("Failed to dial server:", err);
			throw err;
		}

		return new Client(addr, node);
	}

	private async fetch(
		addr: string,
		path: string,
		method: string,
		body?: Record<string, unknown>,
	) {
		const parsed = multiaddr(addr);
		const response = await this.node.services.http.fetch(
			parsed.encapsulate(path),
			{
				method,
				body: body ? JSON.stringify(body) : undefined,
			},
		);
		return await response.json();
	}

	public getRecords(nsid: string) {
		return this.fetch(this.addr, `/records?nsid=${nsid}`, "GET");
	}

	public getRecord(rpath: string) {
		return this.fetch(this.addr, `/record?rpath=${rpath}`, "GET");
	}

	public createRecord(nsid: string, body: string) {
		return this.fetch(this.addr, "/record", "POST", { nsid, body });
	}

	public updateRecord(rpath: string, body: string) {
		return this.fetch(this.addr, `/record/${rpath}`, "PUT", { body });
	}

	public deleteRecord(rpath: string, rkey: string) {
		return this.fetch(this.addr, `/record/${rpath}`, "DELETE", { rkey });
	}
}
