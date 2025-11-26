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
		const response = await this.node.services.http.fetch(resource, {
			method,
			body: body ? JSON.stringify(body) : undefined,
			headers: body ? { "Content-Type": "application/json" } : undefined,
		});
		return await response.json();
	}

	public getRecord(rpath: string) {
		return this.fetch(`/record?rpath=${rpath}`, "GET");
	}

	public initRepoStage() {
		return this.fetch("/init", "GET");
	}

	public initRepoCommit(sig: string) {
		return this.fetch("/init", "GET", { sig });
	}

	public createRecordStage(did: string, nsid: string, body: string) {
		return this.fetch("/record", "POST", { did, nsid, body });
	}

	public createRecordCommit(
		did: string,
		nsid: string,
		body: string,
		sig: string,
	) {
		return this.fetch("/record", "POST", { did, nsid, body, sig });
	}

	public updateRecordStage(rpath: string, body: string) {
		return this.fetch("/record", "PUT", { rpath, body });
	}

	public updateRecordCommit(
		did: string,
		rpath: string,
		body: string,
		sig: string,
	) {
		return this.fetch("/record", "PUT", { did, rpath, body, sig });
	}

	public deleteRecordStage(rpath: string) {
		return this.fetch("/record", "DELETE", { rpath });
	}

	public deleteRecordCommit(did: string, rpath: string, sig: string) {
		return this.fetch("/record", "DELETE", { did, rpath, sig });
	}
}
