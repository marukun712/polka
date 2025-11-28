import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { identify } from "@libp2p/identify";
import { webRTC } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";
import { multiaddr } from "@multiformats/multiaddr";
import { createLibp2p, type Libp2p } from "libp2p";
import type { Repo } from "../dist/transpiled/interfaces/polka-repository-repo";
import { repo as wasm } from "../dist/transpiled/repo";
import { did } from "./crypto";
export class Client {
	private node: Libp2p;
	private repo: Repo;

	constructor(repo: Repo, node: Libp2p) {
		this.node = node;
		this.repo = repo;
		console.log("Libp2p node started", this.node.getMultiaddrs());
	}

	public static async create(relayAddr: string) {
		const node = await createLibp2p({
			transports: [webRTC(), webSockets(), circuitRelayTransport()],
			connectionEncrypters: [noise()],
			streamMuxers: [yamux()],
			services: {
				identify: identify(),
			},
			connectionGater: {
				denyDialMultiaddr: () => false,
				denyDialPeer: () => false,
				denyInboundConnection: () => false,
				denyOutboundConnection: () => false,
			},
		});

		await node.start();
		const ma = multiaddr(relayAddr);
		try {
			console.log("Dialing relay server at:", relayAddr);
			await node.dial(ma);
			console.log("Connected to server");
			console.log("Protocols:", node.getProtocols());
		} catch (err) {
			console.error("Failed to dial server:", err);
			throw err;
		}
		const repo = wasm.create(did);
		return new Client(repo, node);
	}

	public getRecord(rpath: string) {
		return this.repo.getRecord(rpath);
	}

	public getRecords(nsid: string) {
		return this.repo.getRecords(nsid);
	}

	public createRecord(nsid: string, body: string) {
		return this.repo.create(nsid, body);
	}

	public updateRecord(rpath: string, body: string) {
		return this.repo.update(rpath, body);
	}

	public deleteRecord(rpath: string) {
		return this.repo.delete(rpath);
	}
}
