import { createHelia } from "helia";

async function main() {
	const node = await createHelia();
}

main().catch((err) => {
	console.error("Error starting libp2p node:", err);
});
