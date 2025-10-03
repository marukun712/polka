import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { webTransport } from "@libp2p/webtransport";
import { createLibp2p, type Libp2p } from "libp2p";

const POLKA_PROTOCOL = "/polka/1.0.0";

let node: Libp2p;

export async function getNode() {
	if (node) return node;

	node = await createLibp2p({
		addresses: { listen: ["/ip6/::/udp/0/quic-v1/webtransport"] },
		transports: [webTransport()],
		connectionEncrypters: [noise()],
		streamMuxers: [yamux()],
	});

	await node.start();

	await node.handle(POLKA_PROTOCOL, (stream) => {
		stream.addEventListener("message", async (evt) => {
			console.log(
				"Received message:",
				new TextDecoder().decode(evt.data.subarray()),
			);
		});
	});

	return node;
}
