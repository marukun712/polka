import { P256Keypair, verifySignature } from "@atproto/crypto";
import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";

export async function signMessage(
	sk: string,
	message: Record<string, unknown>,
) {
	const keypair = await P256Keypair.import(hexToBytes(sk));
	const bytes = new TextEncoder().encode(JSON.stringify(message));
	const sig = await keypair.sign(bytes);
	return bytesToHex(sig);
}

export async function signBytes(sk: string, bytesHex: string) {
	const keypair = await P256Keypair.import(hexToBytes(sk));
	const bytes = hexToBytes(bytesHex);
	const sig = await keypair.sign(bytes);
	return bytesToHex(sig);
}

export function verify(
	did: string,
	message: Record<string, unknown>,
	sig: string,
) {
	const sigBytes = hexToBytes(sig);
	const bytes = new TextEncoder().encode(JSON.stringify(message));
	return verifySignature(did, bytes, sigBytes);
}

export async function generate() {
	const keypair = await P256Keypair.create({ exportable: true });
	const sk = await keypair.export();
	return {
		did: keypair.did(),
		sk: bytesToHex(sk),
	};
}
