import { autoNAT } from "@libp2p/autonat";
import {
	circuitRelayServer,
	circuitRelayTransport,
} from "@libp2p/circuit-relay-v2";
import { identify } from "@libp2p/identify";
import { webSockets } from "@libp2p/websockets";
import { createLibp2p } from "libp2p";

const server = await createLibp2p({
	addresses: {
		listen: ["/ip4/0.0.0.0/tcp/8000/ws"],
	},
	transports: [webSockets(), circuitRelayTransport()],
	services: {
		identify: identify(),
		autoNat: autoNAT(),
		circuitRelay: circuitRelayServer(),
	},
});

await server.start();

const multiaddrs = server.getMultiaddrs().map((ma) => ma.toString());
console.log("polka relay started on:", multiaddrs);
