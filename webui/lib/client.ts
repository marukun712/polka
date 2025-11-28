import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { type HTTP, http } from "@libp2p/http";
import { identify } from "@libp2p/identify";
import { webSockets } from "@libp2p/websockets";
import { type Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { createLibp2p, type Libp2p } from "libp2p";
export class Client {
	private node!: Libp2p<{ http: HTTP }>;
	private addr: Multiaddr;

	constructor(addr: Multiaddr, node?: Libp2p<{ http: HTTP }>) {
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
			services: { http: http(), identify: identify() },
			connectionGater: {
				denyDialMultiaddr: () => false,
				denyDialPeer: () => false,
				denyInboundConnection: () => false,
				denyOutboundConnection: () => false,
			},
		});

		await node.start();
		console.log("Libp2p node started");

		const ma = multiaddr(addr);
		try {
			console.log("Dialing PDS server at:", addr);
			await node.dial(ma);
			console.log("Connected to server");
			console.log("Protocols:", node.getProtocols());
		} catch (err) {
			console.error("Failed to dial server:", err);
			throw err;
		}

		return new Client(ma, node);
	}

	private async fetch(
		path: string,
		method: string,
		body?: Record<string, unknown>,
	) {
		const resource = this.addr.encapsulate(
			`/http-path/${encodeURIComponent(path.substring(1))}`,
		);

		const blob = body
			? new Blob([JSON.stringify(body)], { type: "application/json" })
			: undefined;

		const response = await this.node.services.http.fetch(resource, {
			method,
			body: blob,
		});
		return await response.json();
	}

	// libp2p-http-fetchはqueryを捨ててしまうため、すべてPOSTで送信
	public getRecord(rpath: string) {
		return this.fetch("/get", "POST", { rpath });
	}

	public getRecords(nsid: string) {
		return this.fetch("/records", "POST", { nsid });
	}

	public createRecord(nsid: string, body: string) {
		return this.fetch("/record", "POST", { nsid, body });
	}

	public updateRecord(rpath: string, body: string) {
		return this.fetch("/record", "PUT", { rpath, body });
	}

	public deleteRecord(rpath: string) {
		return this.fetch("/record", "DELETE", { rpath });
	}
}
