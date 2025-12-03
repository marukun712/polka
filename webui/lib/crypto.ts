import { Secp256k1Keypair } from "@atproto/crypto";
import { bytesToHex } from "@noble/hashes/utils.js";

export function sign(_bytes: Uint8Array): Uint8Array {
	throw new Error("Webui is read-only");
}

export async function generate() {
	const keypair = await Secp256k1Keypair.create({ exportable: true });
	const skExported = await keypair.export();
	return {
		did: keypair.did(),
		pk: keypair.publicKeyStr(),
		sk: bytesToHex(skExported),
	};
}
console.log(await generate());
