import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { type HTTP, http } from "@libp2p/http";
import { identify } from "@libp2p/identify";
import { webRTC } from "@libp2p/webrtc";
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

	public static async create(relay: string, peer: string) {
		const node = await createLibp2p({
			transports: [webRTC(), webSockets(), circuitRelayTransport()],
			connectionEncrypters: [noise()],
			streamMuxers: [yamux()],
			services: { http: http(), identify: identify() },
			connectionGater: {
				denyDialMultiaddr: () => false,
			},
		});

		await node.start();
		const ma = multiaddr(`${relay}/p2p-circuit/p2p/${peer}`);
		try {
			// relayに接続
			await node.dial(multiaddr(relay));
			// pdsに接続
			await node.dial(ma);
			console.log("Protocols:", node.getProtocols());
		} catch (err) {
			console.error("Failed to dial server:", err);
			throw err;
		}

		return new Client(ma, node);
	}

	public static async createDirect(pdsAddr: string) {
		const node = await createLibp2p({
			transports: [webRTC(), webSockets()],
			connectionEncrypters: [noise()],
			streamMuxers: [yamux()],
			services: { http: http(), identify: identify() },
			connectionGater: {
				denyDialMultiaddr: () => false,
			},
		});

		await node.start();
		const ma = multiaddr(pdsAddr);
		try {
			// pdsに直接接続
			await node.dial(ma);
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

	public allRecords() {
		return this.fetch("/all", "POST");
	}
}
