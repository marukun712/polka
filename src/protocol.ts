import { multiaddr } from "@multiformats/multiaddr";
import { getNode } from "./node.js";

const POLKA_PROTOCOL = "/polka/1.0.0";

export async function fetchPolkaEvent(url: string) {
	const node = await getNode();
	if (!url.startsWith("polka://")) throw new Error("Invalid protocol");
	const parts = url.replace("polka://", "").split("/");
	if (parts.length < 2) throw new Error("Invalid URL format");
	const addr = parts[0];
	const eventId = parts[1];
	const stream = await node.dialProtocol(multiaddr(addr), POLKA_PROTOCOL);
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	stream.send(encoder.encode(eventId));
	stream.addEventListener("message", (evt) => {
		const data = decoder.decode(evt.data.subarray());
		const event = JSON.parse(data);
		console.log("Received event:", event);
	});
}
