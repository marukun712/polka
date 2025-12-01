import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import {
	circuitRelayServer,
	circuitRelayTransport,
} from "@libp2p/circuit-relay-v2";
import { identify } from "@libp2p/identify";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
import { createLibp2p } from "libp2p";

const server = await createLibp2p({
	addresses: {
		listen: ["/ip4/0.0.0.0/tcp/9000/ws", "/ip4/0.0.0.0/tcp/8000/"],
	},
	transports: [webSockets(), circuitRelayTransport(), tcp()],
	connectionEncrypters: [noise()],
	streamMuxers: [yamux()],
	services: {
		identify: identify(),
		circuitRelay: circuitRelayServer(),
	},
});

await server.start();

const multiaddrs = server.getMultiaddrs().map((ma) => ma.toString());
console.log("polka relay started on:", multiaddrs);
