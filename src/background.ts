import { addEntry, getEntry } from "./db.js";
import { getNode } from "./node.js";

const POLKA_PROTOCOL = "/polka/1.0.0";

async function main() {
	const node = await getNode();
	await node.handle(POLKA_PROTOCOL, (stream) => {
		stream.addEventListener("message", async (evt) => {
			const id = new TextDecoder().decode(evt.data.subarray());
			const event = await getEntry(id);
			stream.send(new TextEncoder().encode(JSON.stringify(event)));
		});
	});

	addEntry({
		id: "hoge",
		event: "polka.test",
		timestamp: new Date().toISOString(),
		message: { test: "hoge" },
	});

	console.log("Libp2p node started and ready.");
}

main().catch((err) => {
	console.error("Error starting libp2p node:", err);
});
