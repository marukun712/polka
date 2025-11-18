import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { http } from "@libp2p/http";
import { fetchServer } from "@libp2p/http-server";
import { webRTCDirect } from "@libp2p/webrtc";
import { Hono } from "hono";
import { createLibp2p } from "libp2p";
import * as wasmExec from './wasm/wasm_exec_node.js';


const go = new Go();
const instancePromise = WebAssembly.instantiate(readFileSync('wasm/main.wasm'), go.importObject).then((result) => {
    const inst = result.instance;
    return go.run(inst).then(() => inst);
});

const app = new Hono()
app.get('/', (c) => {
  return c.text('Hello World!')
})

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
