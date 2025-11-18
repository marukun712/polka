import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { http } from "@libp2p/http";
import { fetchServer } from "@libp2p/http-server";
import { webRTCDirect } from "@libp2p/webrtc";
import { createLibp2p } from "libp2p";

const listener = await createLibp2p({
	addresses: {
		listen: ["/ip4/0.0.0.0/udp/0/webrtc-direct"],
	},
	transports: [webRTCDirect()],
	connectionEncrypters: [noise()],
	streamMuxers: [yamux()],
	services: {
		http: http({
			// @ts-expect-error 多分動く
			server: fetchServer(app.fetch),
		}),
	},
});

await listener.start();
